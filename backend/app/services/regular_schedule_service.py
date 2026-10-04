from datetime import datetime

from app.repositories.regular_schedule_repository import (
    get_regular_schedule as get_regular_schedule_repo,
    save_regular_schedule as save_regular_schedule_repo
)


def parse_time(value, field_name):
    if not value or not isinstance(value, str):
        raise ValueError(
            f'El campo {field_name} es obligatorio.'
        )

    try:
        parsed_time = datetime.strptime(
            value,
            '%H:%M'
        ).time()
    except ValueError as error:
        raise ValueError(
            f'El campo {field_name} debe tener formato HH:MM.'
        ) from error

    return parsed_time


def validate_positive_integer(value, field_name):
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value <= 0
    ):
        raise ValueError(
            f'{field_name} debe ser un número entero mayor que 0.'
        )


def validate_non_negative_integer(value, field_name):
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value < 0
    ):
        raise ValueError(
            f'{field_name} debe ser un número entero mayor o igual que 0.'
        )


def save_regular_schedule_config(data):
    if not isinstance(data, dict):
        raise ValueError(
            'La configuración del horario habitual es inválida.'
        )

    appointment_duration = data.get(
        'appointmentDuration'
    )

    appointment_gap_minutes = data.get(
        'appointmentGapMinutes'
    )

    work_days = data.get(
        'workDays'
    )

    break_config = data.get(
        'break',
        {}
    )


    validate_positive_integer(
        appointment_duration,
        'La duración de la cita'
    )

    validate_non_negative_integer(
        appointment_gap_minutes,
        'La pausa entre citas'
    )


    if not isinstance(work_days, list) or not work_days:
        raise ValueError(
            'Debes seleccionar al menos un día laboral.'
        )


    normalized_work_days = []

    used_days = set()


    for day in work_days:
        if not isinstance(day, dict):
            raise ValueError(
                'La configuración de los días laborales es inválida.'
            )

        day_of_week = day.get(
            'dayOfWeek'
        )

        if (
            isinstance(day_of_week, bool)
            or not isinstance(day_of_week, int)
            or day_of_week < 1
            or day_of_week > 7
        ):
            raise ValueError(
                'El día de la semana debe estar entre 1 y 7.'
            )

        if day_of_week in used_days:
            raise ValueError(
                'No puedes registrar el mismo día laboral más de una vez.'
            )

        used_days.add(
            day_of_week
        )


        start_time = parse_time(
            day.get('startTime'),
            'hora de inicio'
        )

        end_time = parse_time(
            day.get('endTime'),
            'hora de finalización'
        )


        if start_time >= end_time:
            raise ValueError(
                'La hora de inicio debe ser anterior '
                'a la hora de finalización.'
            )


        normalized_work_days.append({
            'day_of_week': day_of_week,
            'start_time': start_time,
            'end_time': end_time
        })


    if not isinstance(break_config, dict):
        raise ValueError(
            'La configuración del descanso habitual es inválida.'
        )


    break_enabled = break_config.get(
        'enabled',
        False
    )


    if not isinstance(break_enabled, bool):
        raise ValueError(
            'El estado del descanso habitual es inválido.'
        )


    break_start_time = None
    break_end_time = None


    if break_enabled:
        break_start_time = parse_time(
            break_config.get('startTime'),
            'inicio del descanso habitual'
        )

        break_end_time = parse_time(
            break_config.get('endTime'),
            'finalización del descanso habitual'
        )


        if break_start_time >= break_end_time:
            raise ValueError(
                'La hora inicial del descanso debe ser '
                'anterior a la hora final.'
            )


        for day in normalized_work_days:
            if (
                break_start_time < day['start_time']
                or break_end_time > day['end_time']
            ):
                raise ValueError(
                    'El descanso habitual debe encontrarse '
                    'dentro del horario de atención de todos '
                    'los días habilitados.'
                )


    return save_regular_schedule_repo(
        appointment_duration,
        appointment_gap_minutes,
        break_enabled,
        break_start_time,
        break_end_time,
        normalized_work_days
    )


def get_regular_schedule_config():
    result = get_regular_schedule_repo()

    if result is None:
        return None


    schedule = result['schedule']

    work_days = result['work_days']


    return {
        'id': schedule[0],

        'appointmentDuration': schedule[1],

        'appointmentGapMinutes': schedule[2],

        'break': {
            'enabled': schedule[3],

            'startTime': (
                schedule[4].strftime('%H:%M')
                if schedule[4]
                else None
            ),

            'endTime': (
                schedule[5].strftime('%H:%M')
                if schedule[5]
                else None
            )
        },

        'workDays': [
            {
                'dayOfWeek': day[2],

                'startTime': day[3].strftime(
                    '%H:%M'
                ),

                'endTime': day[4].strftime(
                    '%H:%M'
                )
            }
            for day in work_days
        ],

        'createdAt': schedule[6].isoformat(),

        'updatedAt': schedule[7].isoformat()
    }
