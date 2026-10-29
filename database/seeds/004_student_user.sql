-- =============================================================================
-- Seed 004: Cuentas de Alumnos de prueba oficiales para PsiGestor
-- =============================================================================
-- Contraseña para ambas cuentas: password123

-- 1. Alumna de prueba: Ana Lopez Hernandez
INSERT INTO users (
    email,
    password_hash,
    name,
    role,
    student_id,
    is_active
)
SELECT
    'ana.lopez@itescam.edu.mx',
    'scrypt:32768:8:1$La5CgSq1FT9QEZAu$99be02d2819d7b6ab31668144dac661ae9359c9b253fb190bf2b69f409f4c861d2647a09f8a580c41473c007adaee441a139983c8824b07e3e0622e96bb96e1a',
    'Ana Lopez Hernandez',
    'alumno',
    s.id,
    TRUE
FROM students s
WHERE s.student_id = 'TEST2026001'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = 'ana.lopez@itescam.edu.mx'
  );

-- 2. Alumno de prueba: Juan Pablo Moo Uc
INSERT INTO users (
    email,
    password_hash,
    name,
    role,
    student_id,
    is_active
)
SELECT
    '8959@itescam.edu.mx',
    'scrypt:32768:8:1$La5CgSq1FT9QEZAu$99be02d2819d7b6ab31668144dac661ae9359c9b253fb190bf2b69f409f4c861d2647a09f8a580c41473c007adaee441a139983c8824b07e3e0622e96bb96e1a',
    'Juan Pablo Moo Uc',
    'alumno',
    s.id,
    TRUE
FROM students s
WHERE s.student_id = '8959'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = '8959@itescam.edu.mx'
  );
