from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.repositories.regular_schedule_repository import (
    get_regular_schedule as get_regular_schedule_repo,
    save_regular_schedule as save_regular_schedule_repo
)

from app.services.availability_generation_service import (
    generate_slots_for_range
)

from app.repositories.generated_availability_repository import (
    replace_generated_availabilities
)


AVAILABILITY_GENERATION_DAYS = 90

LOCAL_TIMEZONE = ZoneInfo(
    'America/Merida'
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

def time_to_minutes(value):
    return (
        value.hour * 60
        + value.minute
    )

def validate_positive_integer(
    value,
    field_name
):
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value <= 0
    ):
        raise ValueError(
            f'{field_name} debe ser un número entero mayor que 0.'
        )


def validate_non_negative_integer(
    value,
    field_name
):
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


    if (
        not isinstance(work_days, list)
        or not work_days
    ):
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

        overlaps = (
            break_start_time < day['end_time']
            and
            break_end_time > day['start_time']
        )

        fully_inside = (
            break_start_time >= day['start_time']
            and
            break_end_time <= day['end_time']
        )

        if overlaps and not fully_inside:
            raise ValueError(
                'El descanso habitual se cruza '
                'parcialmente con uno o más '
                'horarios de atención. Debe '
                'quedar completamente dentro '
                'o fuera de cada jornada.'
            )

            day_names = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'
}


    for day in normalized_work_days:

     work_start_minutes = time_to_minutes(
        day['start_time']
    )

    work_end_minutes = time_to_minutes(
        day['end_time']
    )


    has_capacity = (
        work_start_minutes
        + appointment_duration
        <=
        work_end_minutes
    )


    if (
        break_enabled
        and break_start_time is not None
        and break_end_time is not None
    ):

        break_applies = (
            break_start_time
            >= day['start_time']
            and
            break_end_time
            <= day['end_time']
        )


        if break_applies:

            break_start_minutes = (
                time_to_minutes(
                    break_start_time
                )
            )

            break_end_minutes = (
                time_to_minutes(
                    break_end_time
                )
            )


            fits_before_break = (
                work_start_minutes
                + appointment_duration
                <=
                break_start_minutes
            )


            fits_after_break = (
                break_end_minutes
                + appointment_duration
                <=
                work_end_minutes
            )


            has_capacity = (
                fits_before_break
                or fits_after_break
            )


    if not has_capacity:

        day_name = day_names.get(
            day['day_of_week'],
            'Día laboral'
        )

        raise ValueError(
            f'El horario de {day_name} no tiene '
            f'espacio suficiente para generar '
            f'al menos una cita de '
            f'{appointment_duration} minutos.'
        )
    # ---------------------------------------------------------
    # GUARDAR CONFIGURACIÓN DEL HORARIO HABITUAL
    # ---------------------------------------------------------

    save_regular_schedule_repo(
        appointment_duration,
        appointment_gap_minutes,
        break_enabled,
        break_start_time,
        break_end_time,
        normalized_work_days
    )


    # ---------------------------------------------------------
    # RECUPERAR CONFIGURACIÓN NORMALIZADA
    # ---------------------------------------------------------

    saved_schedule = get_regular_schedule_config()

    if saved_schedule is None:
        raise ValueError(
            'No fue posible recuperar el horario habitual guardado.'
        )

    # ---------------------------------------------------------
    # DEFINIR RANGO DE GENERACIÓN
    # ---------------------------------------------------------

    generation_start_date = datetime.now(
        LOCAL_TIMEZONE
    ).date()

    generation_end_date = (
        generation_start_date
        + timedelta(
            days=AVAILABILITY_GENERATION_DAYS - 1
        )
    )


    # ---------------------------------------------------------
    # GENERAR DISPONIBILIDADES
    # ---------------------------------------------------------

    generated_slots = generate_slots_for_range(
        saved_schedule,
        generation_start_date,
        generation_end_date
    )


    # ---------------------------------------------------------
    # GUARDAR DISPONIBILIDADES GENERADAS
    # ---------------------------------------------------------

    generation_result = replace_generated_availabilities(
        generation_start_date,
        generation_end_date,
        generated_slots,
        saved_schedule['id']
    )


    return {
        'schedule': saved_schedule,

        'generation': {
            'startDate': generation_start_date.isoformat(),
            'endDate': generation_end_date.isoformat(),

            'generated': len(
                generated_slots
            ),

            'deleted': generation_result[
                'deleted'
            ],

            'inserted': generation_result[
                'inserted'
            ],

            'skipped': generation_result[
                'skipped'
            ]
        }
    }


def get_regular_schedule_config():
    result = get_regular_schedule_repo()

    if result is None:
        return None


    schedule = result[
        'schedule'
    ]

    work_days = result[
        'work_days'
    ]


    return {
        'id': schedule[0],

        'appointmentDuration': schedule[1],

        'appointmentGapMinutes': schedule[2],

        'break': {
            'enabled': schedule[3],

            'startTime': (
                schedule[4].strftime(
                    '%H:%M'
                )
                if schedule[4]
                else None
            ),

            'endTime': (
                schedule[5].strftime(
                    '%H:%M'
                )
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

        'createdAt': schedule[
            6
        ].isoformat(),

        'updatedAt': schedule[
            7
        ].isoformat()
    }