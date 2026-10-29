import os
import re
from functools import wraps
from flask import session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from app.repositories.user_repository import (
    find_user_by_email,
    find_user_by_id,
    find_student_by_code,
    find_user_by_student_db_id,
    create_student_user,
)

EMAIL_REGEX = re.compile(r"^[\w\.-]+@([\w\.-]+\.)+[a-zA-Z]{2,}$")


def authenticate_user(email: str, password: str):
    if not email or not password:
        raise ValueError("Correo electrónico y contraseña requeridos.")

    user = find_user_by_email(email)
    if not user:
        raise ValueError("Credenciales incorrectas o usuario no encontrado.")

    if not user.get("is_active"):
        raise PermissionError("Esta cuenta ha sido desactivada. Consulta con administración.")

    if not check_password_hash(user["password_hash"], password):
        raise ValueError("Credenciales incorrectas o usuario no encontrado.")

    # Guardar en sesión
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    session["email"] = user["email"]

    return sanitize_user(user)


def register_student(
    name: str,
    email: str,
    password: str,
    student_code: str,
    program: str = None,
    semester: int = None,
):
    if not name or not name.strip():
        raise ValueError("El nombre completo es obligatorio.")

    if not email or not EMAIL_REGEX.match(email.strip()):
        raise ValueError("El correo electrónico no tiene un formato válido.")

    if not password or len(password) < 6:
        raise ValueError("La contraseña debe tener al menos 6 caracteres.")

    if not student_code or not student_code.strip():
        raise ValueError("La matrícula es obligatoria.")

    # 1. Validar si ya existe usuario con ese correo
    existing_user = find_user_by_email(email.strip())
    if existing_user:
        raise ValueError("Ya existe una cuenta registrada con este correo electrónico.")

    # 2. Validar matrícula en catálogo oficial de estudiantes
    official_student = find_student_by_code(student_code.strip())
    if not official_student:
        raise ValueError(
            f"La matrícula '{student_code.strip()}' no se encuentra en el catálogo oficial de estudiantes."
        )

    # 3. Validar si ya tiene cuenta de usuario activa
    existing_student_user = find_user_by_student_db_id(official_student["id"])
    if existing_student_user:
        raise ValueError("Esta matrícula ya cuenta con un usuario registrado y activo.")

    # 4. Validar coherencia de datos (si se enviaron carrera / semestre)
    if program and program.strip().lower() != official_student["program"].strip().lower():
        # Tomar la oficial si difiere levemente o validar
        pass

    # 5. Hashear contraseña y crear usuario con rol automático 'alumno'
    password_hash = generate_password_hash(password)
    created_user = create_student_user(
        email=email.strip(),
        password_hash=password_hash,
        name=name.strip(),
        student_id=official_student["id"],
    )

    full_user = find_user_by_id(created_user["id"])
    return sanitize_user(full_user)


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = find_user_by_id(user_id)
    if not user or not user.get("is_active"):
        return None
    return sanitize_user(user)


def logout_user():
    session.clear()


def sanitize_user(user: dict):
    if not user:
        return None
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "studentId": user.get("student_id"),
        "studentCode": user.get("student_code"),
        "program": user.get("program"),
        "semester": user.get("semester"),
        "isActive": user.get("is_active"),
        "createdAt": user.get("created_at"),
    }


def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        # Si no hay sesión iniciada y la autenticación estricta está desactivada, permitir en desarrollo
        if not user:
            if os.getenv("STRICT_AUTH", "false").lower() == "true":
                return jsonify({"error": "No autorizado. Inicia sesión para continuar."}), 401
            return f(*args, **kwargs)
        return f(*args, **kwargs)

    return decorated_function


def require_role(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            # Si no hay sesión iniciada y la autenticación estricta está desactivada, permitir en desarrollo
            if not user:
                if os.getenv("STRICT_AUTH", "false").lower() == "true":
                    return jsonify({"error": "No autorizado. Inicia sesión para continuar."}), 401
                return f(*args, **kwargs)
            if user["role"] not in allowed_roles:
                return (
                    jsonify({
                        "error": "Acceso denegado. No tienes permisos para realizar esta acción."
                    }),
                    403,
                )
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def viewer_has_full_access():
    """
    True cuando quien consulta puede ver datos personales/históricos de citas
    (psicóloga). Un alumno autenticado nunca los ve. Sin sesión solo se permite
    mientras STRICT_AUTH esté desactivado (modo desarrollo).
    """
    user = get_current_user()
    if user:
        return user["role"] == "psicologo"
    return os.getenv("STRICT_AUTH", "false").lower() != "true"


PRIVATE_APPOINTMENT_FIELDS = (
    "studentName", "studentInitials", "studentAge", "studentSemester",
    "studentProgram", "consultationReason", "folio", "location", "modality",
    "cancellationReason", "cancellationObservation",
    "proposedDate", "proposedStartTime", "proposedEndTime", "rescheduleRequestedBy",
    "student_id", "student_name", "reason", "meeting_url", "location",
    "reschedule_reason", "cancellation_reason", "cancellation_observation",
    "proposed_date", "proposed_start_time", "proposed_end_time", "reschedule_requested_by",
    "cancelled_by", "user_id",
)


def redact_private_fields(items):
    """Elimina datos personales e históricos de una lista de dicts."""
    redacted = []
    for item in items:
        redacted.append({
            key: value
            for key, value in item.items()
            if key not in PRIVATE_APPOINTMENT_FIELDS
        })
    return redacted
