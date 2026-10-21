import os

import psycopg
from dotenv import load_dotenv


load_dotenv()


def create_availability(
    date,
    start_time,
    end_time,
    duration,
    break_time
):
    connection = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO availabilities (
                date,
                start_time,
                end_time,
                duration,
                break_time
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING
                id,
                date,
                start_time,
                end_time,
                duration,
                break_time,
                status,
                created_at;
            """,
            (
                date,
                start_time,
                end_time,
                duration,
                break_time
            )
        )

        availability = cursor.fetchone()

        connection.commit()

        return availability

    finally:
        cursor.close()
        connection.close()


def get_availabilities():
    connection = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                date,
                start_time,
                end_time,
                duration,
                break_time,
                status,
                created_at,
                student_name,
                student_initials,
                student_age,
                student_semester,
                student_program,
                consultation_reason,
                modality,
                location,
                folio,
                proposed_date,
                proposed_start_time,
                proposed_end_time,
                cancellation_reason,
                cancellation_observation,
                reschedule_requested_by
            FROM availabilities
            ORDER BY date, start_time;
            """
        )

        availabilities = cursor.fetchall()

        return availabilities

    finally:
        cursor.close()
        connection.close()


def has_overlapping_availability(
    date,
    start_time,
    end_time
):
    connection = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM availabilities
                WHERE date = %s
                  AND status != 'Inhabilitado'
                  AND start_time < %s
                  AND end_time > %s
            );
            """,
            (
                date,
                end_time,
                start_time
            )
        )

        result = cursor.fetchone()

        return (
            result[0]
            if result
            else False
        )

    finally:
        cursor.close()
        connection.close()


def cancel_availability_repo(
    availability_id,
    reason,
    observation
):
    connection = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE availabilities
            SET status = 'Cancelado',
                cancellation_reason = %s,
                cancellation_observation = %s
            WHERE id = %s
            RETURNING id, date, start_time, end_time;
            """,
            (
                reason,
                observation,
                availability_id
            )
        )

        result = cursor.fetchone()

        if result:
            cursor.execute(
                """
                UPDATE appointments
                SET status = 'Cancelled'
                WHERE date = %s
                  AND start_time = %s
                  AND end_time = %s
                  AND status <> 'Cancelled';
                """,
                (result[1], result[2], result[3])
            )

        connection.commit()

        return result

    finally:
        cursor.close()
        connection.close()


def propose_reschedule_repo(
    availability_id,
    date,
    start_time,
    end_time,
    reason=None
):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Si availability_id es negativo, proviene de una cita creada como fallback
            if availability_id < 0:
                apt_id = -availability_id
                cursor.execute("SELECT date, start_time, end_time FROM appointments WHERE id = %s;", (apt_id,))
                apt_row = cursor.fetchone()
                if apt_row:
                    a_date, a_start, a_end = apt_row
                    cursor.execute("SELECT id FROM availabilities WHERE date = %s AND start_time = %s AND end_time = %s;", (a_date, a_start, a_end))
                    a_slot = cursor.fetchone()
                    if a_slot:
                        availability_id = a_slot[0]
                    else:
                        # Crear el slot de disponibilidad para mantener consistencia
                        cursor.execute(
                            """
                            INSERT INTO availabilities (date, start_time, end_time, duration, break_time, status)
                            VALUES (%s, %s, %s, 60, 0, 'Reprogramacion pendiente')
                            RETURNING id;
                            """,
                            (a_date, a_start, a_end)
                        )
                        availability_id = cursor.fetchone()[0]

            # 1. Actualizar disponibilidad original
            cursor.execute(
                """
                UPDATE availabilities
                SET status = 'Reprogramacion pendiente',
                    proposed_date = %s,
                    proposed_start_time = %s,
                    proposed_end_time = %s,
                    reschedule_requested_by = 'psicologo'
                WHERE id = %s
                RETURNING id, date, start_time, end_time;
                """,
                (
                    date,
                    start_time,
                    end_time,
                    availability_id
                )
            )
            result = cursor.fetchone()
            if not result:
                return None

            avail_id, old_date, old_start, old_end = result

            # 2. Buscar id del horario propuesto si existe
            cursor.execute(
                """
                SELECT id FROM availabilities
                WHERE date = %s AND start_time = %s AND end_time = %s;
                """,
                (date, start_time, end_time)
            )
            prop_row = cursor.fetchone()
            prop_avail_id = prop_row[0] if prop_row else None

            # 3. Sincronizar la cita correspondiente para que el alumno la vea inmediatamente
            cursor.execute(
                """
                UPDATE appointments
                SET status = 'Pending Reschedule',
                    proposed_date = %s,
                    proposed_start_time = %s,
                    proposed_end_time = %s,
                    proposed_availability_id = %s,
                    rescheduled_at = CURRENT_TIMESTAMP,
                    reschedule_reason = COALESCE(%s, reschedule_reason),
                    reschedule_requested_by = 'psicologo'
                WHERE date = %s
                  AND start_time = %s
                  AND end_time = %s
                  AND status IN ('Reserved', 'Pending Reschedule', 'Reservado');
                """,
                (
                    date,
                    start_time,
                    end_time,
                    prop_avail_id,
                    reason,
                    old_date,
                    old_start,
                    old_end
                )
            )

            connection.commit()
            return result
    finally:
        connection.close()


# =========================================================
# FUNCIONES PARA HORARIOS INHABILITADOS
# =========================================================

def get_db_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


def create_disabled_schedule_db(
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    observation,
    schedule_type
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Eliminar disponibilidades que se traslapen
        # con el horario que se está inhabilitando.
        delete_query = """
            DELETE FROM availabilities
            WHERE date >= %s
              AND date <= %s
              AND start_time < %s
              AND end_time > %s;
        """

        cursor.execute(
            delete_query,
            (
                start_date,
                end_date,
                end_time,
                start_time
            )
        )

        insert_query = """
            INSERT INTO disabled_schedules (
                start_date,
                end_date,
                start_time,
                end_time,
                reason,
                observation,
                type,
                status
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'Inhabilitado'
            )
            RETURNING
                id,
                start_date,
                end_date,
                start_time,
                end_time,
                reason,
                observation,
                type,
                status,
                created_at;
        """

        cursor.execute(
            insert_query,
            (
                start_date,
                end_date,
                start_time,
                end_time,
                reason,
                observation,
                schedule_type
            )
        )

        new_record = cursor.fetchone()

        conn.commit()

        return new_record

    finally:
        cursor.close()
        conn.close()


def get_all_disabled_schedules_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT
                id,
                start_date,
                end_date,
                start_time,
                end_time,
                reason,
                observation,
                type,
                status,
                created_at
            FROM disabled_schedules
            ORDER BY id DESC;
        """

        cursor.execute(query)

        records = cursor.fetchall()

        return records

    finally:
        cursor.close()
        conn.close()


def count_appointment_conflicts(
    start_date,
    end_date,
    start_time,
    end_time
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT COUNT(*)
            FROM appointments
            WHERE date >= %s
              AND date <= %s
              AND start_time < %s
              AND end_time > %s
              AND status NOT IN (
                  'Cancelada',
                  'Inactiva'
              );
        """

        cursor.execute(
            query,
            (
                start_date,
                end_date,
                end_time,
                start_time
            )
        )

        result = cursor.fetchone()

        return (
            result[0]
            if result
            else 0
        )

    except Exception as error:
        print(
            "Nota: Consulta de conflictos omitida "
            "o la tabla no existe aún:",
            error
        )

        return 0

    finally:
        cursor.close()
        conn.close()


def update_disabled_schedule_db(
    schedule_id,
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    observation,
    schedule_type
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            UPDATE disabled_schedules
            SET start_date = %s,
                end_date = %s,
                start_time = %s,
                end_time = %s,
                reason = %s,
                observation = %s,
                type = %s
            WHERE id = %s
            RETURNING
                id,
                start_date,
                end_date,
                start_time,
                end_time,
                reason,
                observation,
                type,
                status,
                created_at;
        """

        cursor.execute(
            query,
            (
                start_date,
                end_date,
                start_time,
                end_time,
                reason,
                observation,
                schedule_type,
                schedule_id
            )
        )

        updated_record = cursor.fetchone()

        conn.commit()

        return updated_record

    finally:
        cursor.close()
        conn.close()


def delete_disabled_schedule_db(
    schedule_id
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            DELETE FROM disabled_schedules
            WHERE id = %s;
        """

        cursor.execute(
            query,
            (schedule_id,)
        )

        conn.commit()

        return True

    finally:
        cursor.close()
        conn.close()

def approve_availability_reschedule_repo(availability_id):
    connection = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    try:
        with connection.cursor() as cursor:
            # Find matching appointment
            cursor.execute(
                """
                SELECT id FROM appointments
                WHERE (date, start_time, end_time) = (SELECT date, start_time, end_time FROM availabilities WHERE id = %s)
                ORDER BY id DESC LIMIT 1;
                """,
                (availability_id,)
            )
            row = cursor.fetchone()
            if row:
                apt_id = row[0]
                from app.repositories.appointment_repository import approve_student_reschedule_db
                return approve_student_reschedule_db(apt_id)

            # Fallback if only availability exists
            cursor.execute(
                """
                UPDATE availabilities
                SET date = proposed_date,
                    start_time = proposed_start_time,
                    end_time = proposed_end_time,
                    status = 'Reservado',
                    proposed_date = NULL,
                    proposed_start_time = NULL,
                    proposed_end_time = NULL,
                    reschedule_requested_by = NULL
                WHERE id = %s;
                """,
                (availability_id,)
            )
            connection.commit()
            return True
    finally:
        connection.close()


def reject_availability_reschedule_repo(availability_id):
    connection = psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id FROM appointments
                WHERE (date, start_time, end_time) = (SELECT date, start_time, end_time FROM availabilities WHERE id = %s)
                ORDER BY id DESC LIMIT 1;
                """,
                (availability_id,)
            )
            row = cursor.fetchone()
            if row:
                apt_id = row[0]
                from app.repositories.appointment_repository import reject_student_reschedule_db
                return reject_student_reschedule_db(apt_id)

            # Fallback if only availability exists
            cursor.execute(
                """
                UPDATE availabilities
                SET status = 'Reservado',
                    proposed_date = NULL,
                    proposed_start_time = NULL,
                    proposed_end_time = NULL,
                    reschedule_requested_by = NULL
                WHERE id = %s;
                """,
                (availability_id,)
            )
            connection.commit()
            return True
    finally:
        connection.close()
