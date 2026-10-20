ALTER TABLE regular_schedule
ADD COLUMN IF NOT EXISTS availability_range_value INTEGER;

ALTER TABLE regular_schedule
ADD COLUMN IF NOT EXISTS availability_range_unit VARCHAR(10);


-- Mantener la configuración existente
-- equivalente al comportamiento anterior de 3 meses.
UPDATE regular_schedule
SET
    availability_range_value = 3,
    availability_range_unit = 'months'
WHERE
    availability_range_value IS NULL
    OR availability_range_unit IS NULL;


ALTER TABLE regular_schedule
ALTER COLUMN availability_range_value
SET NOT NULL;

ALTER TABLE regular_schedule
ALTER COLUMN availability_range_unit
SET NOT NULL;


ALTER TABLE regular_schedule
DROP CONSTRAINT IF EXISTS regular_schedule_availability_range_valid;

ALTER TABLE regular_schedule
ADD CONSTRAINT regular_schedule_availability_range_valid
CHECK (
    (
        availability_range_unit = 'days'
        AND availability_range_value BETWEEN 1 AND 365
    )
    OR
    (
        availability_range_unit = 'weeks'
        AND availability_range_value BETWEEN 1 AND 52
    )
    OR
    (
        availability_range_unit = 'months'
        AND availability_range_value BETWEEN 1 AND 12
    )
);