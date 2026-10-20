
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
    reason
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
                    status
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 'Reserved'
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
                    reason
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