from app.repositories.availability_repository import (
    create_availability,
    get_availabilities,
    has_overlapping_availability,
    cancel_availability_repo,
    propose_reschedule_repo
)


def register_availability(
    date,
    start_time,
    end_time,
    duration,
    break_time
):
    if start_time >= end_time:
        raise ValueError(
            'La hora de inicio debe ser anterior a la hora de fin.'
        )

    if duration <= 0:
        raise ValueError(
            'La duración debe ser mayor que 0.'
        )

    if break_time < 0:
        raise ValueError(
            'El tiempo de descanso no puede ser negativo.'
        )

    if has_overlapping_availability(
        date,
        start_time,
        end_time
    ):
        raise ValueError(
            'Ya existe una disponibilidad que se traslapa con este horario.'
        )

    return create_availability(
        date,
        start_time,
        end_time,
        duration,
        break_time
    )

def list_availabilities():
    return get_availabilities()
def cancel_appointment(availability_id, reason, observation):
    if not reason:
        raise ValueError('El motivo de cancelación es requerido.')
    return cancel_availability_repo(availability_id, reason, observation)

def reschedule_appointment(availability_id, date, start_time, end_time):
    if start_time >= end_time:
        raise ValueError('La hora de inicio debe ser anterior a la hora de fin.')
    
    # We should technically check overlap, but skipping for simplicity right now unless required
    if has_overlapping_availability(date, start_time, end_time):
        raise ValueError('Ya existe una disponibilidad que se traslapa con el horario propuesto.')
        
    return propose_reschedule_repo(availability_id, date, start_time, end_time)

