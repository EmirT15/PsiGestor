from app.repositories.appointment_repository import get_db_connection


def find_user_by_email(email: str):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.id,
                    u.email,
                    u.password_hash,
                    u.name,
                    u.role,
                    u.student_id,
                    u.is_active,
                    u.created_at,
                    s.student_id AS student_code,
                    s.program,
                    s.semester
                FROM users u
                LEFT JOIN students s ON u.student_id = s.id
                WHERE LOWER(u.email) = LOWER(%s);
                """,
                (email.strip(),)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "email": row[1],
                "password_hash": row[2],
                "name": row[3],
                "role": row[4],
                "student_id": row[5],
                "is_active": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "student_code": row[8],
                "program": row[9],
                "semester": row[10]
            }
    finally:
        connection.close()


def find_user_by_id(user_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.id,
                    u.email,
                    u.password_hash,
                    u.name,
                    u.role,
                    u.student_id,
                    u.is_active,
                    u.created_at,
                    s.student_id AS student_code,
                    s.program,
                    s.semester
                FROM users u
                LEFT JOIN students s ON u.student_id = s.id
                WHERE u.id = %s;
                """,
                (user_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "email": row[1],
                "password_hash": row[2],
                "name": row[3],
                "role": row[4],
                "student_id": row[5],
                "is_active": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "student_code": row[8],
                "program": row[9],
                "semester": row[10]
            }
    finally:
        connection.close()


def find_student_by_code(student_code: str):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, student_id, name, program, semester
                FROM students
                WHERE LOWER(student_id) = LOWER(%s);
                """,
                (student_code.strip(),)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "studentId": row[1],
                "name": row[2],
                "program": row[3],
                "semester": row[4]
            }
    finally:
        connection.close()


def find_user_by_student_db_id(student_db_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, email, name FROM users
                WHERE student_id = %s AND is_active = TRUE;
                """,
                (student_db_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "email": row[1],
                "name": row[2]
            }
    finally:
        connection.close()


def create_student_user(email: str, password_hash: str, name: str, student_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (
                    email,
                    password_hash,
                    name,
                    role,
                    student_id,
                    is_active
                )
                VALUES (%s, %s, %s, 'alumno', %s, TRUE)
                RETURNING id, email, name, role, student_id, is_active, created_at;
                """,
                (email.strip().lower(), password_hash, name.strip(), student_id)
            )
            row = cursor.fetchone()
            connection.commit()
            return {
                "id": row[0],
                "email": row[1],
                "name": row[2],
                "role": row[3],
                "student_id": row[4],
                "is_active": row[5],
                "created_at": row[6].isoformat() if row[6] else None
            }
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
