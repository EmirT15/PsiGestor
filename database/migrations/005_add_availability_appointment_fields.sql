ALTER TABLE availabilities
    ADD COLUMN IF NOT EXISTS student_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS student_initials VARCHAR(10),
    ADD COLUMN IF NOT EXISTS student_age INTEGER,
    ADD COLUMN IF NOT EXISTS student_semester VARCHAR(100),
    ADD COLUMN IF NOT EXISTS student_program VARCHAR(150),
    ADD COLUMN IF NOT EXISTS consultation_reason TEXT,
    ADD COLUMN IF NOT EXISTS modality VARCHAR(100) DEFAULT 'Presencial',
    ADD COLUMN IF NOT EXISTS location VARCHAR(150) DEFAULT 'Cubículo 2B',
    ADD COLUMN IF NOT EXISTS folio VARCHAR(50),
    ADD COLUMN IF NOT EXISTS proposed_date DATE,
    ADD COLUMN IF NOT EXISTS proposed_start_time TIME,
    ADD COLUMN IF NOT EXISTS proposed_end_time TIME,
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(150),
    ADD COLUMN IF NOT EXISTS cancellation_observation TEXT;

ALTER TABLE availabilities
    DROP CONSTRAINT IF EXISTS availabilities_status_check;

ALTER TABLE availabilities
    ADD CONSTRAINT availabilities_status_check
    CHECK (
        status IN (
            'Disponible',
            'Reservado',
            'Reprogramacion pendiente',
            'Inhabilitado',
            'Cancelado'
        )
    );

