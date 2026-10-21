from datetime import date as Date
from datetime import datetime

from app.repositories.appointment_repository import (
    create_appointment,
    get_student_appointments_db,
    cancel_student_appointment_db,
    request_student_reschedule_db,
    approve_student_reschedule_db,
)


def register_appointment(data, user=None):
    required_fields = (
        "date",
        "start_time",
        "end_time",
        "duration",
        "reason",
    )

    missing_fields = [
        field
        for field in required_fields
        if data.get(field) is None
        or str(data.get(field)).strip() == ""
    ]

    if missing_fields:
        raise ValueError(
            "Faltan campos obligatorios: "
            + ", ".join(missing_fields)
        )

    # Si se pasa el usuario autenticado (alumno), tomar student_id y student_name de la sesión
    user_id = None
    if user:
        student_id = user.get("student_id") or user.get("studentId")
        student_name = user.get("name")
        user_id = user.get("id")
        if not student_id:
            raise ValueError("Tu usuario no tiene un perfil de estudiante vinculado.")
    else:
        student_id = data.get("student_id") or data.get("studentId")
        student_name = data.get("student_name")

    if not student_id or not student_name:
        raise ValueError("Se requieren los datos del estudiante para la cita.")

    try:
        student_id = int(student_id)
        duration = int(data["duration"])

        appointment_date = Date.fromisoformat(
            str(data["date"])
        )

        start_time = datetime.strptime(
            str(data["start_time"])[:5],
            "%H:%M",
        ).time()

        end_time = datetime.strptime(
            str(data["end_time"])[:5],
            "%H:%M",
        ).time()

    except (ValueError, TypeError):
        raise ValueError(
            "Los datos de fecha, hora, estudiante "
            "o duración no tienen un formato válido."
        )

    if student_id <= 0:
        raise ValueError(
            "El identificador del estudiante debe ser positivo."
        )

    student_name = str(student_name).strip()
    reason = str(data["reason"]).strip()

    raw_modality = str(data.get("modality", "Presencial")).strip()
    if raw_modality in ("Presencial", "In person"):
        modality = "In person"
    elif raw_modality in ("En línea", "Online"):
        modality = "Online"
    else:
        raise ValueError("La modalidad debe ser presencial o en línea.")

    if len(student_name) > 150:
        raise ValueError(
            "El nombre del estudiante no puede superar 150 caracteres."
        )

    if not reason:
        raise ValueError("El motivo de la consulta es obligatorio.")

    if duration <= 0:
        raise ValueError("La duración debe ser mayor que cero.")

    if start_time >= end_time:
        raise ValueError(
            "La hora de inicio debe ser anterior a la hora de fin."
        )

    elapsed_minutes = (
        end_time.hour * 60 + end_time.minute
        - start_time.hour * 60 - start_time.minute
    )

    if elapsed_minutes != duration:
        raise ValueError(
            "La duración no coincide con el intervalo seleccionado."
        )

    location = (data.get("location") or "").strip() or None
    meeting_url = (data.get("meeting_url") or "").strip() or None

    if modality == "In person":
        if not location:
            location = "Cubículo 2B"
    elif modality == "Online":
        location = None

    if location and len(location) > 150:
        raise ValueError(
            "La ubicación no puede superar 150 caracteres."
        )

    if meeting_url and len(meeting_url) > 500:
        raise ValueError(
            "El enlace no puede superar 500 caracteres."
        )

    return create_appointment(
        student_id=student_id,
        student_name=student_name,
        date=appointment_date,
        start_time=start_time,
        end_time=end_time,
        duration=duration,
        modality=modality,
        location=location,
        meeting_url=meeting_url,
        reason=reason,
        user_id=user_id,
    )


def book_student_appointment(user, data):
    return register_appointment(data, user=user)


def get_student_appointments(user):
    student_id = user.get("student_id") or user.get("studentId")
    if not student_id:
        return []
    return get_student_appointments_db(student_id)


def cancel_student_appointment(user, appointment_id, data):
    student_id = user.get("student_id") or user.get("studentId")
    if not student_id:
        raise ValueError("Usuario sin perfil de estudiante.")

    reason = (data.get("reason") or "").strip()
    if not reason:
        raise ValueError("El motivo de cancelación es obligatorio.")

    return cancel_student_appointment_db(appointment_id, student_id, reason)


def request_student_reschedule(user, appointment_id, data):
    student_id = user.get("student_id") or user.get("studentId")
    if not student_id:
        raise ValueError("Usuario sin perfil de estudiante.")

    reason = (data.get("reason") or "").strip()
    if not reason:
        raise ValueError("El motivo de la solicitud de reprogramación es obligatorio.")

    proposed_availability_id = (
        data.get("proposed_availability_id")
        or data.get("availability_id")
    )
    if not proposed_availability_id:
        raise ValueError("Debes seleccionar un horario disponible para solicitar la reprogramación.")

    return request_student_reschedule_db(
        appointment_id=appointment_id,
        student_id=student_id,
        reason=reason,
        proposed_availability_id=int(proposed_availability_id),
    )


def approve_student_reschedule(appointment_id):
    return approve_student_reschedule_db(appointment_id)
