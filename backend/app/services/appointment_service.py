from app.repositories.appointment_repository import (
    create_appointment,
    get_appointments
)


def register_appointment(
    student_id,
    student_name,
    date,
    start_time,
    end_time,
    duration,
    modality,
    location,
    meeting_url,
    reason
):
    if not student_id:
        raise ValueError(
            'El alumno es obligatorio.'
        )

    if not student_name:
        raise ValueError(
            'El nombre del alumno es obligatorio.'
        )

    if start_time >= end_time:
        raise ValueError(
            'La hora de inicio debe ser anterior a la hora de fin.'
        )

    if duration <= 0:
        raise ValueError(
            'La duración debe ser mayor que 0.'
        )

    if modality not in ('In person', 'Online'):
        raise ValueError(
            'La modalidad no es válida.'
        )

    if modality == 'In person' and not location:
        raise ValueError(
            'La ubicación es obligatoria para una cita presencial.'
        )

    if modality == 'Online' and not meeting_url:
        raise ValueError(
            'La URL de la reunión es obligatoria para una cita en línea.'
        )

    if not reason or not reason.strip():
        raise ValueError(
            'El motivo de la cita es obligatorio.'
        )

    return create_appointment(
        student_id,
        student_name,
        date,
        start_time,
        end_time,
        duration,
        modality,
        location,
        meeting_url,
        reason
    )


def list_appointments():
    return get_appointments()