import os

import psycopg
from dotenv import load_dotenv
from datetime import datetime, timedelta


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

    def format_time_str(t):
        """Asegura el formato HH:MM:SS para comparar cadenas de hora correctamente"""
        t_str = str(t).strip()
        parts = t_str.split(':')
        if len(parts) == 2:
            return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:00"
        elif len(parts) == 3:
            return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:{parts[2].zfill(2)}"
        return t_str

    try:
        # 1. Buscar todas las disponibilidades que se traslapen con la inhabilitación
        select_query = """
            SELECT id, date, start_time, end_time, duration, break_time
            FROM availabilities
            WHERE date >= %s AND date <= %s
              AND start_time < %s AND end_time > %s;
        """
        cursor.execute(select_query, (start_date, end_date, end_time, start_time))
        overlapping_availabilities = cursor.fetchall()

        d_start_str = format_time_str(start_time)
        d_end_str = format_time_str(end_time)

        # 2. Recortar o dividir cada bloque de disponibilidad afectado
        for avail in overlapping_availabilities:
            avail_id, avail_date, a_start, a_end, duration, break_time = avail
            
            a_start_str = format_time_str(a_start)
            a_end_str = format_time_str(a_end)

            # Borrar el bloque continuo original
            cursor.execute("DELETE FROM availabilities WHERE id = %s;", (avail_id,))

            # Tramo A: Si la disponibilidad empezaba antes del inicio del bloqueo
            if a_start_str < d_start_str:
                new_end = min(a_end_str, d_start_str)
                cursor.execute("""
                    INSERT INTO availabilities (date, start_time, end_time, duration, break_time, status)
                    VALUES (%s, %s, %s, %s, %s, 'Disponible');
                """, (avail_date, a_start_str, new_end, duration, break_time))

            # Tramo B: Si la disponibilidad terminaba después del fin del bloqueo
            if a_end_str > d_end_str:
                new_start = max(a_start_str, d_end_str)
                cursor.execute("""
                    INSERT INTO availabilities (date, start_time, end_time, duration, break_time, status)
                    VALUES (%s, %s, %s, %s, %s, 'Disponible');
                """, (avail_date, new_start, a_end_str, duration, break_time))

        # 3. Insertar el registro de inhabilitación
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

    except Exception as e:
        conn.rollback()
        print("❌ Error al procesar inhabilitación y recortar disponibilidades:", e)
        raise e
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
        # 1. Consultar la información de la inhabilitación antes de borrarla
        select_query = """
            SELECT start_date, end_date, start_time, end_time
            FROM disabled_schedules
            WHERE id = %s;
        """
        cursor.execute(select_query, (schedule_id,))
        record = cursor.fetchone()

        if record:
            start_date, end_date, start_time, end_time = record

            # 2. Borrar el registro de inhabilitación
            cursor.execute("DELETE FROM disabled_schedules WHERE id = %s;", (schedule_id,))

            # 3. Restaurar la disponibilidad (status = 'Disponible')
            # Convierte las fechas para iterar si la inhabilitación abarcó un rango de días
            curr_date = datetime.strptime(str(start_date), "%Y-%m-%d").date()
            final_date = datetime.strptime(str(end_date), "%Y-%m-%d").date()

            while curr_date <= final_date:
                # Opcional: Evitar duplicados si ya existía algún tramo parcial
                cursor.execute("""
                    INSERT INTO availabilities (date, start_time, end_time, duration, break_time, status)
                    VALUES (%s, %s, %s, %s, %s, 'Disponible');
                """, (curr_date, start_time, end_time, 60, 0))
                
                curr_date += timedelta(days=1)

        conn.commit()
        return True

    except Exception as e:
        conn.rollback()
        print("❌ Error al rehabilitar horario y restaurar disponibilidad:", e)
        raise e
    finally:
        cursor.close()
        conn.close()