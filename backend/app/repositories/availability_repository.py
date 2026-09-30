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
            RETURNING id, date, start_time, end_time,
                      duration, break_time, status, created_at;
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
            SELECT id, date, start_time, end_time,
                   duration, break_time, status, created_at,
                   student_name, student_initials, student_age, student_semester,
                   student_program, consultation_reason, modality, location, folio,
                   proposed_date, proposed_start_time, proposed_end_time,
                   cancellation_reason, cancellation_observation
            FROM availabilities
            ORDER BY date, start_time;
            """
        )

        availabilities = cursor.fetchall()

        return availabilities

    finally:
        cursor.close()
        connection.close()

def has_overlapping_availability(date, start_time, end_time):
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

        return cursor.fetchone()[0]

    finally:
        cursor.close()
        connection.close()
def cancel_availability_repo(availability_id, reason, observation):
    connection = psycopg.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    try:
        cursor = connection.cursor()
        cursor.execute(
            '''
            UPDATE availabilities
            SET status = 'Cancelado',
                cancellation_reason = %s,
                cancellation_observation = %s
            WHERE id = %s
            RETURNING id;
            ''',
            (reason, observation, availability_id)
        )
        connection.commit()
        return cursor.fetchone()
    finally:
        cursor.close()
        connection.close()

def propose_reschedule_repo(availability_id, date, start_time, end_time):
    connection = psycopg.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        dbname=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    try:
        cursor = connection.cursor()
        cursor.execute(
            '''
            UPDATE availabilities
            SET status = 'Reprogramacion pendiente',
                proposed_date = %s,
                proposed_start_time = %s,
                proposed_end_time = %s
            WHERE id = %s
            RETURNING id;
            ''',
            (date, start_time, end_time, availability_id)
        )
        connection.commit()
        return cursor.fetchone()
    finally:
        cursor.close()
        connection.close()

