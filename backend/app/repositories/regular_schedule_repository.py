import os

import psycopg
from dotenv import load_dotenv


load_dotenv()


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


def save_regular_schedule(
    appointment_duration,
    appointment_gap_minutes,
    break_enabled,
    break_start_time,
    break_end_time,
    work_days
):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO regular_schedule (
                id,
                appointment_duration,
                appointment_gap_minutes,
                break_enabled,
                break_start_time,
                break_end_time
            )
            VALUES (
                1,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            ON CONFLICT (id)
            DO UPDATE SET
                appointment_duration = EXCLUDED.appointment_duration,
                appointment_gap_minutes = EXCLUDED.appointment_gap_minutes,
                break_enabled = EXCLUDED.break_enabled,
                break_start_time = EXCLUDED.break_start_time,
                break_end_time = EXCLUDED.break_end_time,
                updated_at = CURRENT_TIMESTAMP
            RETURNING
                id,
                appointment_duration,
                appointment_gap_minutes,
                break_enabled,
                break_start_time,
                break_end_time,
                created_at,
                updated_at;
            """,
            (
                appointment_duration,
                appointment_gap_minutes,
                break_enabled,
                break_start_time,
                break_end_time
            )
        )

        schedule = cursor.fetchone()

        cursor.execute(
            """
            DELETE FROM regular_schedule_days
            WHERE regular_schedule_id = 1;
            """
        )

        for day in work_days:
            cursor.execute(
                """
                INSERT INTO regular_schedule_days (
                    regular_schedule_id,
                    day_of_week,
                    start_time,
                    end_time
                )
                VALUES (
                    1,
                    %s,
                    %s,
                    %s
                );
                """,
                (
                    day["day_of_week"],
                    day["start_time"],
                    day["end_time"]
                )
            )

        connection.commit()

        return schedule

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


def get_regular_schedule():
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                appointment_duration,
                appointment_gap_minutes,
                break_enabled,
                break_start_time,
                break_end_time,
                created_at,
                updated_at
            FROM regular_schedule
            WHERE id = 1;
            """
        )

        schedule = cursor.fetchone()

        if schedule is None:
            return None

        cursor.execute(
            """
            SELECT
                id,
                regular_schedule_id,
                day_of_week,
                start_time,
                end_time,
                created_at,
                updated_at
            FROM regular_schedule_days
            WHERE regular_schedule_id = 1
            ORDER BY day_of_week;
            """
        )

        work_days = cursor.fetchall()

        return {
            "schedule": schedule,
            "work_days": work_days
        }

    finally:
        cursor.close()
        connection.close()