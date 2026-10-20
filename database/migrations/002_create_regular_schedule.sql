CREATE TABLE IF NOT EXISTS regular_schedule (
    id SMALLINT PRIMARY KEY DEFAULT 1,

    appointment_duration INTEGER NOT NULL,
    appointment_gap_minutes INTEGER NOT NULL DEFAULT 0,

    break_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    break_start_time TIME NULL,
    break_end_time TIME NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT regular_schedule_singleton
        CHECK (id = 1),

    CONSTRAINT regular_schedule_duration_positive
        CHECK (appointment_duration > 0),

    CONSTRAINT regular_schedule_gap_non_negative
        CHECK (appointment_gap_minutes >= 0),

    CONSTRAINT regular_schedule_break_valid
        CHECK (
            (
                break_enabled = FALSE
                AND break_start_time IS NULL
                AND break_end_time IS NULL
            )
            OR
            (
                break_enabled = TRUE
                AND break_start_time IS NOT NULL
                AND break_end_time IS NOT NULL
                AND break_start_time < break_end_time
            )
        )
);


CREATE TABLE IF NOT EXISTS regular_schedule_days (
    id SERIAL PRIMARY KEY,

    regular_schedule_id SMALLINT NOT NULL DEFAULT 1,

    day_of_week SMALLINT NOT NULL,

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_regular_schedule
        FOREIGN KEY (regular_schedule_id)
        REFERENCES regular_schedule(id)
        ON DELETE CASCADE,

    CONSTRAINT regular_schedule_day_valid
        CHECK (day_of_week BETWEEN 1 AND 7),

    CONSTRAINT regular_schedule_day_time_valid
        CHECK (start_time < end_time),

    CONSTRAINT regular_schedule_day_unique
        UNIQUE (regular_schedule_id, day_of_week)
);