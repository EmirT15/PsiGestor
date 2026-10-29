-- =============================================================================
-- Migración 011: Auditoría de cancelación y rehabilitación de citas
-- Las citas canceladas se conservan como historial; estas columnas registran
-- quién canceló, observaciones y si el horario fue rehabilitado.
-- =============================================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS cancellation_observation TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20),
    ADD COLUMN IF NOT EXISTS rehabilitated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rehabilitated_by INTEGER;
