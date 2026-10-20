-- =============================================================================
-- Seed 003: Cuenta oficial del Psicólogo de PsiGestor
-- =============================================================================

INSERT INTO users (
    email,
    password_hash,
    name,
    role,
    is_active
)
SELECT * FROM (
    VALUES (
        'psicologia@itescam.edu.mx',
        'scrypt:32768:8:1$XL57t47ylxHQc8L5$d7e9f479be9ef4ad43438d5979bccefe6c590fd63260b68b96efcc57605a0793ee8f76e7c0e9a9d687d32e885881b282d27a87dc291863718c93c1cca7a3302b',
        'Lic. Psicología ITESCAM',
        'psicologo',
        TRUE
    )
) AS seed_psicologo (email, password_hash, name, role, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.role = 'psicologo'
);
