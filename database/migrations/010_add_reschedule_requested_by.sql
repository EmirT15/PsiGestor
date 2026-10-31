-- =============================================================================
-- Migración 010: Campo reschedule_requested_by para identificar el emisor de la reprogramación
-- =============================================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS reschedule_requested_by VARCHAR(20) DEFAULT 'psicologo';

ALTER TABLE availabilities
    ADD COLUMN IF NOT EXISTS reschedule_requested_by VARCHAR(20) DEFAULT 'psicologo';

COMMENT ON COLUMN appointments.reschedule_requested_by IS 'Indica quién propuso la reprogramación: psicologo o alumno';
COMMENT ON COLUMN availabilities.reschedule_requested_by IS 'Indica quién propuso la reprogramación: psicologo o alumno';
