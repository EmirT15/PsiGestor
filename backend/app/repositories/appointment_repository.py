import os

import psycopg
from dotenv import load_dotenv


load_dotenv()


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
                reason
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, student_id, student_name,
                      date, start_time, end_time,
                      duration, modality, location,
                      meeting_url, reason, status,
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

    finally:
        cursor.close()
        connection.close()


def get_appointments():
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
            SELECT id, student_id, student_name,
                   date, start_time, end_time,
                   duration, modality, location,
                   meeting_url, reason, status,
                   created_at
            FROM appointments
            ORDER BY date, start_time;
            """
        )

        appointments = cursor.fetchall()

        return appointments

    finally:
        cursor.close()
        connection.close()