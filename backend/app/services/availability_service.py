from app.repositories.availability_repository import (
    create_availability,
    get_availabilities,
    has_overlapping_availability,
    cancel_availability_repo,
    propose_reschedule_repo,
    create_disabled_schedule_db,
    get_all_disabled_schedules_db,
    count_appointment_conflicts,
    update_disabled_schedule_db,
    delete_disabled_schedule_db
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
            'La hora de inicio debe ser anterior '
            'a la hora de fin.'
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
            'Ya existe una disponibilidad que '
            'se traslapa con este horario.'
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


# =========================================================
# CANCELACIÓN DE CITAS
# =========================================================

def cancel_appointment(
    availability_id,
    reason,
    observation
):
    if not reason:
        raise ValueError(
            'El motivo de cancelación es requerido.'
        )

    return cancel_availability_repo(
        availability_id,
        reason,
        observation
    )


# =========================================================
# REPROGRAMACIÓN DE CITAS
# =========================================================

def reschedule_appointment(
    availability_id,
    date,
    start_time,
    end_time
):
    if start_time >= end_time:
        raise ValueError(
            'La hora de inicio debe ser anterior '
            'a la hora de fin.'
        )

    if has_overlapping_availability(
        date,
        start_time,
        end_time
    ):
        raise ValueError(
            'Ya existe una disponibilidad que '
            'se traslapa con el horario propuesto.'
        )

    return propose_reschedule_repo(
        availability_id,
        date,
        start_time,
        end_time
    )


# =========================================================
# HORARIOS INHABILITADOS
# =========================================================

def register_disabled_schedule(
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    observation,
    schedule_type
):
    return create_disabled_schedule_db(
        start_date,
        end_date,
        start_time,
        end_time,
        reason,
        observation,
        schedule_type
    )


def list_disabled_schedules():
    return get_all_disabled_schedules_db()


def check_schedule_conflicts(
    start_date,
    end_date,
    start_time,
    end_time
):
    return count_appointment_conflicts(
        start_date,
        end_date,
        start_time,
        end_time
    )


def modify_disabled_schedule(
    schedule_id,
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    observation,
    schedule_type
):
    return update_disabled_schedule_db(
        schedule_id,
        start_date,
        end_date,
        start_time,
        end_time,
        reason,
        observation,
        schedule_type
    )


def remove_disabled_schedule(
    schedule_id
):
    return delete_disabled_schedule_db(
        schedule_id
    )