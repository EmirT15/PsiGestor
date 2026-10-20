-- =============================================================================
-- Migración 009: Campos y estados para reprogramación y cancelación de citas
-- =============================================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
    ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS proposed_date DATE,
    ADD COLUMN IF NOT EXISTS proposed_start_time TIME,
    ADD COLUMN IF NOT EXISTS proposed_end_time TIME,
    ADD COLUMN IF NOT EXISTS proposed_availability_id INTEGER,
    ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Actualizar restricción de estados para admitir solicitudes de reprogramación
ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (
        status IN (
            'Reserved',
            'Pending Reschedule',
            'Reprogramacion pendiente',
            'Cancelled'
        )
    );

-- Índice para búsquedas rápidas de citas por estudiante
CREATE INDEX IF NOT EXISTS idx_appointments_student_id
ON appointments (student_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id
ON appointments (user_id);
