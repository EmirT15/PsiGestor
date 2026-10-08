CREATE TABLE IF NOT EXISTS disabled_schedules (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255) NOT NULL,
    observation TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Inhabilitado',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);