CREATE TABLE availabilities (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL,
    break_time INTEGER NOT NULL DEFAULT 0,

    status VARCHAR(40) NOT NULL DEFAULT 'Disponible',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT availabilities_status_check
        CHECK (
            status IN (
                'Disponible',
                'Reservado',
                'Reprogramacion pendiente',
                'Inhabilitado'
            )
        )
);