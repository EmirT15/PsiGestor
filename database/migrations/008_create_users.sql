-- =============================================================================
-- Migración 008: Tabla de usuarios para autenticación y roles en PsiGestor
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL,
    student_id INTEGER NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_role_check
        CHECK (role IN ('psicologo', 'alumno')),

    CONSTRAINT fk_users_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE SET NULL
);

-- Índice único condicional: garantiza que SOLO pueda existir un psicólogo activo en la universidad
CREATE UNIQUE INDEX IF NOT EXISTS unique_single_active_psicologo
ON users (role)
WHERE role = 'psicologo' AND is_active = TRUE;

-- Índice para búsquedas rápidas por correo
CREATE INDEX IF NOT EXISTS idx_users_email
ON users (email);

-- Si es alumno, el student_id no debe repetirse entre cuentas activas
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_student_user
ON users (student_id)
WHERE student_id IS NOT NULL;
