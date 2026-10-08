ALTER TABLE availabilities
ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'manual';

ALTER TABLE availabilities
ADD COLUMN IF NOT EXISTS regular_schedule_id SMALLINT NULL;

ALTER TABLE availabilities
DROP CONSTRAINT IF EXISTS availabilities_source_check;

ALTER TABLE availabilities
ADD CONSTRAINT availabilities_source_check
CHECK (
    source IN (
        'manual',
        'regular_schedule'
    )
);

ALTER TABLE availabilities
DROP CONSTRAINT IF EXISTS fk_availability_regular_schedule;

ALTER TABLE availabilities
ADD CONSTRAINT fk_availability_regular_schedule
FOREIGN KEY (regular_schedule_id)
REFERENCES regular_schedule(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_availabilities_source_date_status
ON availabilities (
    source,
    date,
    status
);