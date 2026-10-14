
from datetime import date as Date
from datetime import datetime

from app.repositories.appointment_repository import (
    create_appointment,
)


def register_appointment(data):
    required_fields = (
        "student_id",
        "student_name",
        "date",
        "start_time",
        "end_time",
        "duration",
        "modality",
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

    try:
        student_id = int(data["student_id"])
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

    student_name = str(data["student_name"]).strip()
    reason = str(data["reason"]).strip()
    modality = str(data["modality"]).strip()

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

    if modality not in ("In person", "Online"):
        raise ValueError(
            "La modalidad debe ser presencial o en línea."
        )

    location = (data.get("location") or "").strip() or None
    meeting_url = (data.get("meeting_url") or "").strip() or None

    if modality == "In person" and not location:
        raise ValueError(
            "Escribe la ubicación para una cita presencial."
        )

    if modality == "Online":
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
    )
