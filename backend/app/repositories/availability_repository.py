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

def get_db_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def create_disabled_schedule_db(start_date, end_date, start_time, end_time, reason, observation, schedule_type):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Eliminar la disponibilidad activa que coincida o se traslape en fecha y rango horario
        delete_query = """
            DELETE FROM availabilities
            WHERE date >= %s AND date <= %s
              AND start_time < %s AND end_time > %s;
        """
        cursor.execute(delete_query, (start_date, end_date, end_time, start_time))

        # 2. Registrar el nuevo horario inhabilitado
        insert_query = """
            INSERT INTO disabled_schedules 
                (start_date, end_date, start_time, end_time, reason, observation, type, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Inhabilitado')
            RETURNING id, start_date, end_date, start_time, end_time, reason, observation, type, status, created_at;
        """

        cursor.execute(insert_query, (
            start_date,
            end_date,
            start_time,
            end_time,
            reason,
            observation,
            schedule_type
        ))

        new_record = cursor.fetchone()
        conn.commit()
        return new_record
    finally:
        cursor.close()
        conn.close()

def get_all_disabled_schedules_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, start_date, end_date, start_time, end_time, reason, observation, type, status, created_at
        FROM disabled_schedules
        ORDER BY id DESC;
    """

    cursor.execute(query)
    records = cursor.fetchall()

    cursor.close()
    conn.close()

    return records

def count_appointment_conflicts(start_date, end_date, start_time, end_time):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verifica si hay citas agendadas en ese rango de fecha y hora.
        # Ajusta la tabla 'appointments' (o 'citas') según la estructura de tu base de datos.
        query = """
            SELECT COUNT(*)
            FROM appointments
            WHERE date >= %s AND date <= %s
              AND start_time < %s AND end_time > %s
              AND status NOT IN ('Cancelada', 'Inactiva');
        """
        cursor.execute(query, (start_date, end_date, end_time, start_time))
        result = cursor.fetchone()
        return result[0] if result else 0
    except Exception as e:
        print("Nota: Consulta de conflictos omitida o la tabla no existe aún:", e)
        return 0
    finally:
        cursor.close()
        conn.close()

def update_disabled_schedule_db(schedule_id, start_date, end_date, start_time, end_time, reason, observation, schedule_type):
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
            RETURNING id, start_date, end_date, start_time, end_time, reason, observation, type, status, created_at;
        """
        cursor.execute(query, (
            start_date, end_date, start_time, end_time, reason, observation, schedule_type, schedule_id
        ))
        updated_record = cursor.fetchone()
        conn.commit()
        return updated_record
    finally:
        cursor.close()
        conn.close()


def delete_disabled_schedule_db(schedule_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = "DELETE FROM disabled_schedules WHERE id = %s;"
        cursor.execute(query, (schedule_id,))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()