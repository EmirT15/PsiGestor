
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
                SELECT start_time, end_time, duration, break_time
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

            for availability_start, availability_end, slot_duration, break_time in availabilities:
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

