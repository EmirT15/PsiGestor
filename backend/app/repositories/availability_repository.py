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
                   duration, break_time, status, created_at
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
                  AND status = 'active'
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