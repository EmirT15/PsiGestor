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
                cancellation_observation
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
            RETURNING id;
            """,
            (
                reason,
                observation,
                availability_id
            )
        )

        result = cursor.fetchone()

        connection.commit()

        return result

    finally:
        cursor.close()
        connection.close()


def propose_reschedule_repo(
    availability_id,
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
            UPDATE availabilities
            SET status = 'Reprogramacion pendiente',
                proposed_date = %s,
                proposed_start_time = %s,
                proposed_end_time = %s
            WHERE id = %s
            RETURNING id;
            """,
            (
                date,
                start_time,
                end_time,
                availability_id
            )
        )

        result = cursor.fetchone()

        connection.commit()

        return result

    finally:
        cursor.close()
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