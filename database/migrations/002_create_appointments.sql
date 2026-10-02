CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,

    student_id INTEGER NOT NULL,
    student_name VARCHAR(150) NOT NULL,

    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL,

    modality VARCHAR(20) NOT NULL,

    location VARCHAR(150),
    meeting_url VARCHAR(500),

    reason TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'Reserved',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT appointments_modality_check
        CHECK (modality IN ('In person', 'Online')),

    CONSTRAINT appointments_status_check
        CHECK (status IN ('Reserved', 'Cancelled'))
);