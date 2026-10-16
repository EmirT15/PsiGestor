
from app.repositories.appointment_repository import get_db_connection


def search_students(search_text=""):
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, student_id, name, program, semester
                FROM students
                WHERE
                    %s = ''
                    OR name ILIKE %s
                    OR student_id ILIKE %s
                ORDER BY name
                LIMIT 20;
                """,
                (
                    search_text.strip(),
                    f"%{search_text.strip()}%",
                    f"%{search_text.strip()}%"
                )
            )

            rows = cursor.fetchall()

            return [
                {
                    "id": row[0],
                    "studentId": row[1],
                    "name": row[2],
                    "program": row[3],
                    "semester": row[4]
                }
                for row in rows
            ]
    finally:
        connection.close()
