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


def replace_generated_availabilities(
    start_date,
    end_date,
    slots,
    regular_schedule_id=1
):
    connection = get_connection()

    cursor = None

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM availabilities
            WHERE source = 'regular_schedule'
              AND regular_schedule_id = %s
              AND status = 'Disponible'
              AND date BETWEEN %s AND %s;
            """,
            (
                regular_schedule_id,
                start_date,
                end_date
            )
        )

        deleted_count = cursor.rowcount

        inserted_count = 0
        skipped_count = 0

        for slot in slots:
            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM availabilities
                    WHERE date = %s
                      AND start_time < %s
                      AND end_time > %s
                );
                """,
                (
                    slot['date'],
                    slot['endTime'],
                    slot['startTime']
                )
            )

            has_conflict = cursor.fetchone()[0]

            if has_conflict:
                skipped_count += 1
                continue

            cursor.execute(
                """
                INSERT INTO availabilities (
                    date,
                    start_time,
                    end_time,
                    duration,
                    break_time,
                    status,
                    source,
                    regular_schedule_id
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    'Disponible',
                    'regular_schedule',
                    %s
                );
                """,
                (
                    slot['date'],
                    slot['startTime'],
                    slot['endTime'],
                    slot['duration'],
                    slot.get('breakTime', 0),
                    regular_schedule_id
                )
            )

            inserted_count += 1

        connection.commit()

        return {
            'deleted': deleted_count,
            'inserted': inserted_count,
            'skipped': skipped_count
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        if cursor is not None:
            cursor.close()

        connection.close()