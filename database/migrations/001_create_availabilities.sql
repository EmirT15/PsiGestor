CREATE TABLE availabilities (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL,
    break_time INTEGER NOT NULL DEFAULT 0,

    status VARCHAR(40) NOT NULL DEFAULT 'Disponible',

    -- Appointment details (nullable because an availability starts as empty)
    student_name VARCHAR(150),
    student_initials VARCHAR(10),
    student_age INTEGER,
    student_semester VARCHAR(100),
    student_program VARCHAR(150),
    consultation_reason TEXT,
    modality VARCHAR(100) DEFAULT 'Presencial',
    location VARCHAR(150) DEFAULT 'Cubículo 2B',
    folio VARCHAR(50),
    
    -- Reschedule details
    proposed_date DATE,
    proposed_start_time TIME,
    proposed_end_time TIME,
    
    -- Cancellation details
    cancellation_reason VARCHAR(150),
    cancellation_observation TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT availabilities_status_check
        CHECK (
            status IN (
                'Disponible',
                'Reservado',
                'Reprogramacion pendiente',
                'Inhabilitado',
                'Cancelado'
            )
        )
);