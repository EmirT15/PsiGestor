from datetime import datetime
from pathlib import Path
import os
import sys
import time

import psycopg
from dotenv import load_dotenv

from app.services.regular_schedule_service import (
    LOCAL_TIMEZONE,
    calculate_generation_end_date,
    get_regular_schedule_config,
)
from app.services.availability_generation_service import (
    generate_slots_for_range,
)
from app.repositories.generated_availability_repository import (
    replace_generated_availabilities,
)


load_dotenv()


def get_database_dir() -> Path:
    docker_path = Path("/database")
    if docker_path.exists():
        return docker_path

    repo_root = Path(__file__).resolve().parents[2]
    return repo_root / "database"


def connect_with_retry(max_retries: int = 15, delay_seconds: float = 1.0):
    last_error = None
    for _ in range(max_retries):
        try:
            return psycopg.connect(
                host=os.getenv("DB_HOST", "postgres"),
                port=os.getenv("DB_PORT", "5432"),
                dbname=os.getenv("DB_NAME", "psigestor_db"),
                user=os.getenv("DB_USER", "psigestor_user"),
                password=os.getenv("DB_PASSWORD", "psigestor_password"),
            )
        except Exception as error:
            last_error = error
            time.sleep(delay_seconds)
    raise RuntimeError(
        f"No se pudo conectar a PostgreSQL después de {max_retries} intentos: {last_error}"
    )


def sync_regular_schedule_availabilities() -> None:
    saved_schedule = get_regular_schedule_config()

    if saved_schedule is None:
        return

    range_value = saved_schedule.get(
        "availabilityRangeValue"
    )

    range_unit = saved_schedule.get(
        "availabilityRangeUnit"
    )

    if (
        range_value is None
        or range_unit is None
    ):
        print(
            "[init_db] El horario habitual no tiene "
            "un rango de disponibilidad configurado."
        )
        return

    start_date = datetime.now(
        LOCAL_TIMEZONE
    ).date()

    end_date = calculate_generation_end_date(
        start_date,
        range_value,
        range_unit,
    )

    generated_slots = generate_slots_for_range(
        saved_schedule,
        start_date,
        end_date,
    )

    replace_generated_availabilities(
        start_date,
        end_date,
        generated_slots,
        saved_schedule["id"],
    )


def init_database(reset: bool = False) -> None:
    db_dir = get_database_dir()
    migrations_dir = db_dir / "migrations"
    seeds_dir = db_dir / "seeds"

    if not migrations_dir.exists():
        print(f"[init_db] No se encontró el directorio de migraciones en {migrations_dir}")
        return

    connection = connect_with_retry()

    try:
        with connection.cursor() as cursor:
            # 1. Ejecutar todas las migraciones (001 a 007) en orden
            migration_files = sorted(migrations_dir.glob("*.sql"))
            for migration_file in migration_files:
                sql_content = migration_file.read_text(encoding="utf-8")
                cursor.execute(sql_content)
            connection.commit()

            # 2. Si se pidió --reset, limpiar todas las tablas para dejarlas igual que la semilla base
            if reset:
                cursor.execute(
                    """
                    TRUNCATE TABLE
                        appointments,
                        availabilities,
                        disabled_schedules,
                        regular_schedule_days,
                        regular_schedule,
                        users,
                        students
                    RESTART IDENTITY CASCADE;
                    """
                )
                connection.commit()
                print("[init_db] Tablas limpiadas correctamente (--reset).")

            # 3. Asegurar catálogo de alumnos base (001_students_test_data.sql)
            students_seed = seeds_dir / "001_students_test_data.sql"
            if students_seed.exists():
                cursor.execute(students_seed.read_text(encoding="utf-8"))
                connection.commit()

            # 4. Asegurar cuenta oficial del psicólogo (003_psychologist_user.sql)
            psychologist_seed = seeds_dir / "003_psychologist_user.sql"
            if psychologist_seed.exists():
                cursor.execute(psychologist_seed.read_text(encoding="utf-8"))
                connection.commit()

            # 5. Verificar si la base de datos ya tiene horario habitual o citas cargadas
            cursor.execute("SELECT COUNT(*) FROM regular_schedule;")
            regular_schedule_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM availabilities;")
            availabilities_count = cursor.fetchone()[0]

            should_seed_calendar = (
                reset
                or regular_schedule_count == 0
                or availabilities_count == 0
            )

            if should_seed_calendar:
                calendar_seed = seeds_dir / "002_calendar_test_data.sql"
                if calendar_seed.exists():
                    cursor.execute(calendar_seed.read_text(encoding="utf-8"))
                    connection.commit()
                    print("[init_db] Datos semilla del calendario aplicados (002_calendar_test_data.sql).")

        if should_seed_calendar:
            sync_regular_schedule_availabilities()
            print("[init_db] Disponibilidades generadas automáticamente para los próximos 90 días.")

    except Exception as error:
        connection.rollback()
        print(f"[init_db] Error inicializando base de datos: {error}")
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    init_database(reset=reset_flag)
    if reset_flag:
        print("[init_db] ¡Base de datos sincronizada al 100% con los datos semilla del equipo!")
    else:
        print("[init_db] Verificación de migraciones y semillas completada.")
