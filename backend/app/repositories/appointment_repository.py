
import os

import psycopg
from dotenv import load_dotenv


load_dotenv()


def get_db_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


def create_appointment(
    student_id,
    student_name,
    date,
    start_time,
    end_time,
    duration,
    modality,
    location,
    meeting_url,
    reason,
    user_id=None
):
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            # Bloquea las inserciones concurrentes de citas
            # durante la comprobación y el registro.
            cursor.execute(
                "LOCK TABLE appointments IN SHARE ROW EXCLUSIVE MODE"
            )

            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM appointments
                    WHERE date = %s
                      AND status <> 'Cancelled'
                      AND start_time < %s
                      AND end_time > %s
                );
                """,
                (date, end_time, start_time)
            )

            if cursor.fetchone()[0]:
                raise ValueError(
                    "El horario seleccionado ya está ocupado."
                )

            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM appointments
                    WHERE proposed_date = %s
                      AND status IN ('Pending Reschedule', 'Reprogramacion pendiente')
                      AND proposed_start_time < %s
                      AND proposed_end_time > %s
                );
                """,
                (date, end_time, start_time)
            )
            if cursor.fetchone()[0]:
                raise ValueError(
                    "El horario seleccionado se encuentra comprometido por una reprogramación pendiente."
                )

            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM disabled_schedules
                    WHERE start_date <= %s
                      AND end_date >= %s
                      AND start_time < %s
                      AND end_time > %s
                      AND status = 'Inhabilitado'
                );
                """,
                (date, date, end_time, start_time)
            )
            if cursor.fetchone()[0]:
                raise ValueError(
                    "El horario seleccionado no se encuentra disponible."
                )


            cursor.execute(
                """
                SELECT id, start_time, end_time, duration, break_time
                FROM availabilities
                WHERE date = %s
                  AND status = 'Disponible'
                  AND start_time <= %s
                  AND end_time >= %s
                FOR UPDATE;
                """,
                (date, start_time, end_time)
            )

            availabilities = cursor.fetchall()

            valid_slot = False
            matched_availability_id = None
            matched_exact_range = False

            for availability_id, availability_start, availability_end, slot_duration, break_time in availabilities:
                if slot_duration != duration:
                    continue

                current_minutes = (
                    availability_start.hour * 60
                    + availability_start.minute
                )

                requested_start = (
                    start_time.hour * 60
                    + start_time.minute
                )

                requested_end = (
                    end_time.hour * 60
                    + end_time.minute
                )

                availability_end_minutes = (
                    availability_end.hour * 60
                    + availability_end.minute
                )

                while (
                    current_minutes + slot_duration
                    <= availability_end_minutes
                ):
                    if (
                        current_minutes == requested_start
                        and current_minutes + slot_duration
                        == requested_end
                    ):
                        valid_slot = True
                        matched_availability_id = availability_id
                        matched_exact_range = (
                            requested_start == (availability_start.hour * 60 + availability_start.minute)
                            and requested_end == availability_end_minutes
                        )
                        break

                    current_minutes += slot_duration + break_time

                if valid_slot:
                    break

            if not valid_slot:
                raise ValueError(
                    "El horario seleccionado no coincide con una "
                    "franja válida de la disponibilidad."
                )

            cursor.execute(
                """
                SELECT program, semester
                FROM students
                WHERE id = %s;
                """,
                (student_id,)
            )
            student_row = cursor.fetchone()
            student_program = student_row[0] if student_row else ""
            student_semester = (
                f"{student_row[1]}° Semestre"
                if student_row and student_row[1] is not None
                else ""
            )
            initials = "".join(
                part[0].upper()
                for part in student_name.split()
                if part
            )[:2] or "AL"
            modality_label = (
                "Presencial" if modality == "In person" else "En línea"
            )
            location_label = (
                location
                if modality == "In person" and location
                else (meeting_url or "Sesión en línea")
            )

            cursor.execute(
                """
                INSERT INTO appointments (
                    student_id,
                    student_name,
                    date,
                    start_time,
                    end_time,
                    duration,
                    modality,
                    location,
                    meeting_url,
                    reason,
                    status,
                    user_id
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 'Reserved', %s
                )
                RETURNING
                    id,
                    student_id,
                    student_name,
                    date,
                    start_time,
                    end_time,
                    duration,
                    modality,
                    location,
                    meeting_url,
                    reason,
                    status,
                    created_at;
                """,
                (
                    student_id,
                    student_name,
                    date,
                    start_time,
                    end_time,
                    duration,
                    modality,
                    location,
                    meeting_url,
                    reason,
                    user_id
                )
            )

            appointment = cursor.fetchone()
            folio = f"PSI-{date.year}-{appointment[0]:04d}"

            if matched_availability_id is not None and matched_exact_range:
                cursor.execute(
                    """
                    UPDATE availabilities
                    SET status = 'Reservado',
                        student_name = %s,
                        student_initials = %s,
                        student_age = COALESCE(student_age, 20),
                        student_semester = %s,
                        student_program = %s,
                        consultation_reason = %s,
                        modality = %s,
                        location = %s,
                        folio = %s
                    WHERE id = %s;
                    """,
                    (
                        student_name,
                        initials,
                        student_semester,
                        student_program,
                        reason,
                        modality_label,
                        location_label,
                        folio,
                        matched_availability_id,
                    ),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO availabilities (
                        date,
                        start_time,
                        end_time,
                        duration,
                        break_time,
                        status,
                        student_name,
                        student_initials,
                        student_age,
                        student_semester,
                        student_program,
                        consultation_reason,
                        modality,
                        location,
                        folio,
                        source
                    )
                    VALUES (
                        %s, %s, %s, %s, 0, 'Reservado',
                        %s, %s, 20, %s, %s, %s, %s, %s, %s, 'manual'
                    );
                    """,
                    (
                        date,
                        start_time,
                        end_time,
                        duration,
                        student_name,
                        initials,
                        student_semester,
                        student_program,
                        reason,
                        modality_label,
                        location_label,
                        folio,
                    ),
                )

        connection.commit()
        return appointment

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def get_appointments(date=None):
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            query = """
                SELECT
                    id,
                    student_id,
                    student_name,
                    date,
                    start_time,
                    end_time,
                    duration,
                    modality,
                    location,
                    meeting_url,
                    reason,
                    status,
                    created_at
                FROM appointments
                WHERE status <> 'Cancelled'
            """
            params = []

            if date:
                query += " AND date = %s"
                params.append(date)

            query += " ORDER BY date, start_time"

            cursor.execute(query, params)
            appointments = cursor.fetchall()

            columns = [
                description.name
                for description in cursor.description
            ]

            return [
                dict(zip(columns, appointment))
                for appointment in appointments
            ]

    finally:
        connection.close()

def get_student_appointments_db(student_id):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT
                    a.id,
                    a.student_id,
                    a.student_name,
                    a.date,
                    a.start_time,
                    a.end_time,
                    a.duration,
                    a.modality,
                    a.location,
                    a.meeting_url,
                    a.reason,
                    a.status,
                    a.created_at,
                    a.cancellation_reason,
                    a.cancelled_at,
                    a.reschedule_reason,
                    a.rescheduled_at,
                    a.proposed_date,
                    a.proposed_start_time,
                    a.proposed_end_time,
                    a.proposed_availability_id,
                    a.reschedule_requested_by
                FROM appointments a
                WHERE a.student_id = %s
                ORDER BY a.date DESC, a.start_time DESC;
            """
            cursor.execute(query, (student_id,))
            appointments = cursor.fetchall()
            columns = [description.name for description in cursor.description]
            return [dict(zip(columns, appointment)) for appointment in appointments]
    finally:
        connection.close()


def cancel_student_appointment_db(appointment_id, student_id, reason):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, date, start_time, end_time, duration, status
                FROM appointments
                WHERE id = %s AND student_id = %s
                FOR UPDATE;
                """,
                (appointment_id, student_id)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("No se encontró la cita o no pertenece al alumno autenticado.")

            apt_id, apt_date, apt_start, apt_end, apt_duration, apt_status = row

            if apt_status == 'Cancelled':
                raise ValueError("La cita ya se encuentra cancelada.")

            cursor.execute(
                """
                UPDATE appointments
                SET status = 'Cancelled',
                    cancellation_reason = %s,
                    cancelled_at = CURRENT_TIMESTAMP,
                    cancelled_by = 'alumno'
                WHERE id = %s;
                """,
                (reason, appointment_id)
            )

            cursor.execute(
                """
                SELECT id, source
                FROM availabilities
                WHERE date = %s
                  AND start_time = %s
                  AND end_time = %s
                FOR UPDATE;
                """,
                (apt_date, apt_start, apt_end)
            )
            avail_row = cursor.fetchone()

            if avail_row:
                avail_id, avail_source = avail_row

                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM disabled_schedules
                        WHERE start_date <= %s
                          AND end_date >= %s
                          AND start_time < %s
                          AND end_time > %s
                          AND status = 'Inhabilitado'
                    );
                    """,
                    (apt_date, apt_date, apt_end, apt_start)
                )
                is_disabled = cursor.fetchone()[0]

                cursor.execute(
                    """
                    SELECT
                        rs.appointment_duration,
                        rs.break_enabled,
                        rs.break_start_time,
                        rs.break_end_time,
                        rsd.start_time,
                        rsd.end_time
                    FROM regular_schedule rs
                    JOIN regular_schedule_days rsd ON rs.id = rsd.regular_schedule_id
                    WHERE rsd.day_of_week = EXTRACT(ISODOW FROM %s::DATE);
                    """,
                    (apt_date,)
                )
                rs_row = cursor.fetchone()

                is_in_regular = False
                if rs_row and not is_disabled:
                    rs_duration, break_enabled, b_start, b_end, d_start, d_end = rs_row
                    if (
                        apt_start >= d_start
                        and apt_end <= d_end
                        and apt_duration == rs_duration
                    ):
                        if break_enabled and b_start and b_end:
                            if not (apt_start < b_end and apt_end > b_start):
                                is_in_regular = True
                        else:
                            is_in_regular = True

                if is_in_regular and not is_disabled:
                    cursor.execute(
                        """
                        UPDATE availabilities
                        SET status = 'Disponible',
                            student_name = NULL,
                            student_initials = NULL,
                            student_age = NULL,
                            student_semester = NULL,
                            student_program = NULL,
                            consultation_reason = NULL,
                            modality = NULL,
                            location = NULL,
                            folio = NULL,
                            proposed_date = NULL,
                            proposed_start_time = NULL,
                            proposed_end_time = NULL,
                            cancellation_reason = NULL,
                            cancellation_observation = NULL
                        WHERE id = %s;
                        """,
                        (avail_id,)
                    )
                else:
                    cursor.execute(
                        "DELETE FROM availabilities WHERE id = %s;",
                        (avail_id,)
                    )

        connection.commit()
        return True
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def request_student_reschedule_db(appointment_id, student_id, reason, proposed_availability_id):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, date, start_time, end_time, duration, status
                FROM appointments
                WHERE id = %s AND student_id = %s
                FOR UPDATE;
                """,
                (appointment_id, student_id)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("No se encontró la cita o no pertenece al alumno autenticado.")

            apt_id, apt_date, apt_start, apt_end, apt_duration, apt_status = row

            if apt_status in ('Pending Reschedule', 'Reprogramacion pendiente'):
                raise ValueError("Ya existe una solicitud de reprogramación pendiente para esta cita.")

            if apt_status != 'Reserved':
                raise ValueError("Solo se pueden solicitar reprogramaciones para citas con estado Reservada.")

            cursor.execute(
                """
                SELECT id, date, start_time, end_time, status
                FROM availabilities
                WHERE id = %s
                FOR UPDATE;
                """,
                (proposed_availability_id,)
            )
            target_slot = cursor.fetchone()
            if not target_slot:
                raise ValueError("El horario propuesto no existe.")

            t_id, t_date, t_start, t_end, t_status = target_slot
            if t_status != 'Disponible':
                raise ValueError("El horario propuesto ya no se encuentra Disponible.")

            cursor.execute(
                """
                UPDATE appointments
                SET status = 'Pending Reschedule',
                    reschedule_reason = %s,
                    rescheduled_at = CURRENT_TIMESTAMP,
                    proposed_date = %s,
                    proposed_start_time = %s,
                    proposed_end_time = %s,
                    proposed_availability_id = %s,
                    reschedule_requested_by = 'alumno'
                WHERE id = %s;
                """,
                (reason, t_date, t_start, t_end, t_id, appointment_id)
            )

            # Reflejar en la disponibilidad de la psicóloga
            cursor.execute(
                """
                UPDATE availabilities
                SET status = 'Reprogramacion pendiente',
                    proposed_date = %s,
                    proposed_start_time = %s,
                    proposed_end_time = %s,
                    reschedule_requested_by = 'alumno'
                WHERE date = %s
                  AND start_time = %s
                  AND end_time = %s;
                """,
                (t_date, t_start, t_end, apt_date, apt_start, apt_end)
            )

        connection.commit()
        return True
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def approve_student_reschedule_db(appointment_id):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, student_id, student_name, date, start_time, end_time, duration,
                       modality, location, meeting_url, reason, status,
                       proposed_date, proposed_start_time, proposed_end_time, proposed_availability_id
                FROM appointments
                WHERE id = %s
                FOR UPDATE;
                """,
                (appointment_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("No se encontró la cita.")

            (apt_id, student_id, student_name, old_date, old_start, old_end, duration,
             modality, location, meeting_url, reason, status,
             prop_date, prop_start, prop_end, prop_avail_id) = row

            if not prop_date or not prop_start or not prop_end:
                raise ValueError("La cita no tiene un nuevo horario propuesto.")

            cursor.execute(
                """
                UPDATE appointments
                SET date = %s,
                    start_time = %s,
                    end_time = %s,
                    status = 'Reserved',
                    proposed_date = NULL,
                    proposed_start_time = NULL,
                    proposed_end_time = NULL,
                    proposed_availability_id = NULL,
                    reschedule_reason = NULL,
                    reschedule_requested_by = NULL
                WHERE id = %s;
                """,
                (prop_date, prop_start, prop_end, appointment_id)
            )

            if not prop_avail_id:
                cursor.execute(
                    """
                    SELECT id FROM availabilities
                    WHERE date = %s AND start_time = %s AND end_time = %s;
                    """,
                    (prop_date, prop_start, prop_end)
                )
                prop_row = cursor.fetchone()
                if prop_row:
                    prop_avail_id = prop_row[0]

            if prop_avail_id:
                folio = f"PSI-{prop_date.year}-{apt_id:04d}"
                cursor.execute(
                    """
                    UPDATE availabilities
                    SET status = 'Reservado',
                        student_name = %s,
                        consultation_reason = %s,
                        modality = %s,
                        location = %s,
                        folio = %s
                    WHERE id = %s;
                    """,
                    (student_name, reason, modality, location, folio, prop_avail_id)
                )

            cursor.execute(
                """
                SELECT id FROM availabilities
                WHERE date = %s AND start_time = %s AND end_time = %s;
                """,
                (old_date, old_start, old_end)
            )
            old_avail = cursor.fetchone()
            if old_avail:
                old_avail_id = old_avail[0]
                cursor.execute(
                    """
                    UPDATE availabilities
                    SET status = 'Disponible',
                        student_name = NULL,
                        student_initials = NULL,
                        student_age = NULL,
                        student_semester = NULL,
                        student_program = NULL,
                        consultation_reason = NULL,
                        modality = NULL,
                        location = NULL,
                        folio = NULL,
                        proposed_date = NULL,
                        proposed_start_time = NULL,
                        proposed_end_time = NULL
                    WHERE id = %s;
                    """,
                    (old_avail_id,)
                )

        connection.commit()
        return True
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def reject_student_reschedule_db(appointment_id):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, student_id, student_name, date, start_time, end_time, duration,
                       modality, location, meeting_url, reason, status,
                       proposed_date, proposed_start_time, proposed_end_time, proposed_availability_id,
                       reschedule_requested_by
                FROM appointments
                WHERE id = %s
                FOR UPDATE;
                """,
                (appointment_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("No se encontró la cita.")

            (apt_id, student_id, student_name, old_date, old_start, old_end, duration,
             modality, location, meeting_url, reason, status,
             prop_date, prop_start, prop_end, prop_avail_id,
             reschedule_requested_by) = row

            if status not in ('Pending Reschedule', 'Reprogramacion pendiente'):
                raise ValueError("La cita no tiene una reprogramación pendiente.")

            # ESCENARIO B: La psicóloga propuso el cambio (reschedule_requested_by == 'psicologo')
            # y el alumno rechaza la propuesta -> La cita se CANCELA automáticamente.
            if reschedule_requested_by == 'psicologo':
                cancel_reason = "Cancelada: El alumno no pudo aceptar la propuesta de reprogramación de la psicóloga."
                cursor.execute(
                    """
                    UPDATE appointments
                    SET status = 'Cancelled',
                        cancellation_reason = %s,
                        cancelled_at = CURRENT_TIMESTAMP,
                        proposed_date = NULL,
                        proposed_start_time = NULL,
                        proposed_end_time = NULL,
                        proposed_availability_id = NULL,
                        reschedule_requested_by = NULL
                    WHERE id = %s;
                    """,
                    (cancel_reason, appointment_id)
                )

                cursor.execute(
                    """
                    UPDATE availabilities
                    SET status = 'Cancelado',
                        cancellation_reason = %s,
                        cancellation_observation = 'Rechazo de reprogramación por parte del alumno.',
                        proposed_date = NULL,
                        proposed_start_time = NULL,
                        proposed_end_time = NULL,
                        reschedule_requested_by = NULL
                    WHERE date = %s AND start_time = %s AND end_time = %s;
                    """,
                    (cancel_reason, old_date, old_start, old_end)
                )

                if prop_avail_id:
                    cursor.execute(
                        """
                        UPDATE availabilities
                        SET status = 'Disponible',
                            proposed_date = NULL,
                            proposed_start_time = NULL,
                            proposed_end_time = NULL,
                            reschedule_requested_by = NULL
                        WHERE id = %s;
                        """,
                        (prop_avail_id,)
                    )

                connection.commit()
                return {
                    "action": "cancelled",
                    "message": "La propuesta fue rechazada y la cita ha sido cancelada definitivamente."
                }

            # ESCENARIO A: El alumno solicitó la reprogramación (reschedule_requested_by == 'alumno')
            # y la psicóloga lo rechaza -> Se mantiene el horario original de la cita.
            else:
                cursor.execute(
                    """
                    UPDATE appointments
                    SET status = 'Reserved',
                        proposed_date = NULL,
                        proposed_start_time = NULL,
                        proposed_end_time = NULL,
                        proposed_availability_id = NULL,
                        reschedule_reason = NULL,
                        reschedule_requested_by = NULL
                    WHERE id = %s;
                    """,
                    (appointment_id,)
                )

                cursor.execute(
                    """
                    UPDATE availabilities
                    SET status = 'Reservado',
                        proposed_date = NULL,
                        proposed_start_time = NULL,
                        proposed_end_time = NULL,
                        reschedule_requested_by = NULL
                    WHERE date = %s AND start_time = %s AND end_time = %s;
                    """,
                    (old_date, old_start, old_end)
                )

                if prop_avail_id:
                    cursor.execute(
                        """
                        UPDATE availabilities
                        SET status = 'Disponible',
                            proposed_date = NULL,
                            proposed_start_time = NULL,
                            proposed_end_time = NULL,
                            reschedule_requested_by = NULL
                        WHERE id = %s;
                        """,
                        (prop_avail_id,)
                    )

                connection.commit()
                return {
                    "action": "reverted_to_original",
                    "message": "La solicitud fue rechazada. La cita se mantendrá en su horario original."
                }
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
