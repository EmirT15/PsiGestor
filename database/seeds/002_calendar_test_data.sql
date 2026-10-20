-- =============================================================================
-- Seed 002: Horario habitual, citas reservadas, reprogramaciones, cancelaciones,
-- inhabilitaciones y bloques de disponibilidad de prueba (Octubre 2026)
-- =============================================================================

-- 1. Configuración del Horario Habitual (Duración 60 min, pausa 0 min, descanso 10:00 - 11:00)
INSERT INTO regular_schedule (
    id,
    appointment_duration,
    appointment_gap_minutes,
    break_enabled,
    break_start_time,
    break_end_time
)
VALUES (
    1,
    60,
    0,
    TRUE,
    '10:00:00',
    '11:00:00'
)
ON CONFLICT (id) DO UPDATE SET
    appointment_duration = EXCLUDED.appointment_duration,
    appointment_gap_minutes = EXCLUDED.appointment_gap_minutes,
    break_enabled = EXCLUDED.break_enabled,
    break_start_time = EXCLUDED.break_start_time,
    break_end_time = EXCLUDED.break_end_time,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Días laborales del Horario Habitual (Lunes a Viernes 08:00 - 14:00)
INSERT INTO regular_schedule_days (regular_schedule_id, day_of_week, start_time, end_time)
VALUES
    (1, 1, '08:00:00', '14:00:00'),
    (1, 2, '08:00:00', '14:00:00'),
    (1, 3, '08:00:00', '14:00:00'),
    (1, 4, '08:00:00', '14:00:00'),
    (1, 5, '08:00:00', '14:00:00')
ON CONFLICT (regular_schedule_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Citas de prueba en la tabla appointments
INSERT INTO appointments (
    student_id,
    student_name,
    date,
    start_time,
    end_time,
    duration,
    modality,
    location,
    reason,
    status
)
SELECT * FROM (
    VALUES
        (1, 'Ana Lopez Hernandez', DATE '2026-10-19', TIME '08:00:00', TIME '09:00:00', 60, 'In person', 'cubiculo 2', 'seguimiento', 'Reserved'),
        (2, 'Carlos Mendez Ruiz', DATE '2026-10-19', TIME '09:15:00', TIME '10:15:00', 60, 'In person', 'cubiculo 2', 'ALCOHOL', 'Reserved'),
        (4, 'Jose Eduardo Perez', DATE '2026-10-21', TIME '08:00:00', TIME '09:00:00', 60, 'In person', 'cubiculo 2', 'faltas', 'Reserved'),
        (5, 'Sofia Ramirez Castillo', DATE '2026-10-21', TIME '09:15:00', TIME '10:15:00', 60, 'In person', 'cubiculo 2', 'mal humor', 'Cancelled')
) AS seed_app (student_id, student_name, date, start_time, end_time, duration, modality, location, reason, status)
WHERE NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.date = seed_app.date
      AND a.start_time = seed_app.start_time
      AND a.end_time = seed_app.end_time
);

-- 4. Bloques de disponibilidad y citas en availabilities (Semanas 19 - 23 Oct y 26 - 30 Oct 2026)
INSERT INTO availabilities (
    date,
    start_time,
    end_time,
    duration,
    break_time,
    status,
    source,
    regular_schedule_id,
    student_name,
    student_initials,
    student_age,
    student_semester,
    student_program,
    consultation_reason,
    modality,
    location,
    folio,
    proposed_date,
    proposed_start_time,
    proposed_end_time
)
SELECT * FROM (
    VALUES
        -- Lunes 19 de Octubre 2026
        (DATE '2026-10-19', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Reservado', 'regular_schedule', 1, 'Ana Lopez Hernandez', 'AL', 20, '6° Semestre', 'Ingenieria en Sistemas Computacionales', 'seguimiento', 'Presencial', 'cubiculo 2', 'PSI-2026-0001', NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-19', TIME '09:15:00', TIME '10:15:00', 60, 0, 'Reprogramacion pendiente', 'regular_schedule', 1, 'Carlos Mendez Ruiz', 'CM', 20, '4° Semestre', 'Ingenieria en Sistemas Computacionales', 'ALCOHOL', 'Presencial', 'cubiculo 2', 'PSI-2026-0002', DATE '2026-10-19', TIME '11:30:00', TIME '12:30:00'),
        (DATE '2026-10-19', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-19', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-19', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Martes 20 de Octubre 2026
        (DATE '2026-10-20', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-20', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-20', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-20', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-20', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Miércoles 21 de Octubre 2026
        (DATE '2026-10-21', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Reservado', 'regular_schedule', 1, 'Jose Eduardo Perez', 'JE', 20, '2° Semestre', 'Ingenieria en Sistemas Computacionales', 'faltas', 'Presencial', 'cubiculo 2', 'PSI-2026-0003', NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-21', TIME '09:15:00', TIME '10:15:00', 60, 0, 'Cancelado', 'regular_schedule', 1, 'Sofia Ramirez Castillo', 'SR', 20, '6° Semestre', 'Ingenieria Informática', 'mal humor', 'Presencial', 'cubiculo 2', 'PSI-2026-0004', NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-21', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-21', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-21', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Jueves 22 de Octubre 2026
        (DATE '2026-10-22', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-22', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-22', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-22', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-22', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Viernes 23 de Octubre 2026
        (DATE '2026-10-23', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-23', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-23', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-23', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-23', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Lunes 26 de Octubre 2026
        (DATE '2026-10-26', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-26', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-26', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-26', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-26', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Martes 27 de Octubre 2026
        (DATE '2026-10-27', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-27', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-27', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-27', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-27', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Miércoles 28 de Octubre 2026
        (DATE '2026-10-28', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-28', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-28', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-28', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-28', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Jueves 29 de Octubre 2026
        (DATE '2026-10-29', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-29', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-29', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-29', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-29', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),

        -- Viernes 30 de Octubre 2026
        (DATE '2026-10-30', TIME '08:00:00', TIME '09:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-30', TIME '09:00:00', TIME '10:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-30', TIME '11:00:00', TIME '12:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-30', TIME '12:00:00', TIME '13:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME),
        (DATE '2026-10-30', TIME '13:00:00', TIME '14:00:00', 60, 0, 'Disponible', 'regular_schedule', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Presencial', 'Cubículo 2B', NULL, NULL::DATE, NULL::TIME, NULL::TIME)
) AS seed_avail (
    date, start_time, end_time, duration, break_time, status, source, regular_schedule_id,
    student_name, student_initials, student_age, student_semester, student_program,
    consultation_reason, modality, location, folio, proposed_date, proposed_start_time, proposed_end_time
)
WHERE NOT EXISTS (
    SELECT 1 FROM availabilities av
    WHERE av.date = seed_avail.date
      AND av.start_time = seed_avail.start_time
      AND av.end_time = seed_avail.end_time
);

-- 5. Horario inhabilitado en disabled_schedules (Viernes 23 de Octubre 2026, 09:00 - 10:00)
INSERT INTO disabled_schedules (
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    observation,
    type,
    status
)
SELECT * FROM (
    VALUES
        (DATE '2026-10-23', DATE '2026-10-23', TIME '09:00:00', TIME '10:00:00', 'Reunión', 'surgio una reunion para poder ver festividades del tecnologico', 'Puntual', 'Inhabilitado')
) AS seed_dis (start_date, end_date, start_time, end_time, reason, observation, type, status)
WHERE NOT EXISTS (
    SELECT 1 FROM disabled_schedules ds
    WHERE ds.start_date = seed_dis.start_date
      AND ds.start_time = seed_dis.start_time
      AND ds.end_time = seed_dis.end_time
);
