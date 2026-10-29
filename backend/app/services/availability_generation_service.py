from datetime import date, timedelta


def _time_to_minutes(value):
    hours, minutes = value.split(':')

    return (
        int(hours) * 60
        + int(minutes)
    )


def _minutes_to_time(value):
    hours = value // 60
    minutes = value % 60

    return (
        f'{hours:02d}:'
        f'{minutes:02d}'
    )


def generate_slots_for_day(
    target_date,
    work_day,
    appointment_duration,
    appointment_gap_minutes,
    break_config,
    regular_schedule_id=1
):
    if not isinstance(target_date, date):
        raise ValueError(
            'La fecha para generar disponibilidades es inválida.'
        )

    if target_date.isoweekday() != work_day['dayOfWeek']:
        return []

    current_minutes = _time_to_minutes(
        work_day['startTime']
    )

    end_minutes = _time_to_minutes(
        work_day['endTime']
    )

    break_enabled = (
        break_config.get('enabled', False)
    )

    break_start_minutes = None
    break_end_minutes = None

    if break_enabled:
        break_start_minutes = _time_to_minutes(
            break_config['startTime']
        )

        break_end_minutes = _time_to_minutes(
            break_config['endTime']
        )

    slots = []

    while (
        current_minutes
        + appointment_duration
        <= end_minutes
    ):
        slot_end_minutes = (
            current_minutes
            + appointment_duration
        )

        if (
            break_enabled
            and current_minutes < break_end_minutes
            and slot_end_minutes > break_start_minutes
        ):
            current_minutes = break_end_minutes

            continue

        slots.append({
            'date': target_date.isoformat(),

            'startTime': _minutes_to_time(
                current_minutes
            ),

            'endTime': _minutes_to_time(
                slot_end_minutes
            ),

            'duration': appointment_duration,

            'breakTime': 0,

            'status': 'Disponible',

            'source': 'regular_schedule',

            'regularScheduleId': regular_schedule_id
        })

        current_minutes = (
            slot_end_minutes
            + appointment_gap_minutes
        )

    return slots


def generate_slots_for_range(
    schedule,
    start_date,
    end_date
):
    if schedule is None:
        raise ValueError(
            'No existe un horario habitual configurado.'
        )

    if not isinstance(start_date, date):
        raise ValueError(
            'La fecha inicial es inválida.'
        )

    if not isinstance(end_date, date):
        raise ValueError(
            'La fecha final es inválida.'
        )

    if start_date > end_date:
        raise ValueError(
            'La fecha inicial no puede ser posterior a la fecha final.'
        )

    appointment_duration = schedule[
        'appointmentDuration'
    ]

    appointment_gap_minutes = schedule[
        'appointmentGapMinutes'
    ]

    break_config = schedule[
        'break'
    ]

    work_days = schedule[
        'workDays'
    ]

    regular_schedule_id = schedule.get(
        'id',
        1
    )

    work_days_by_number = {
        work_day['dayOfWeek']: work_day
        for work_day in work_days
    }

    generated_slots = []

    current_date = start_date

    while current_date <= end_date:
        day_of_week = current_date.isoweekday()

        work_day = work_days_by_number.get(
            day_of_week
        )

        if work_day is not None:
            generated_slots.extend(
                generate_slots_for_day(
                    current_date,
                    work_day,
                    appointment_duration,
                    appointment_gap_minutes,
                    break_config,
                    regular_schedule_id
                )
            )

        current_date += timedelta(
            days=1
        )

    return generated_slots