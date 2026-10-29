INSERT INTO students (student_id, name, program, semester)
VALUES
    ('TEST2026001', 'Ana Lopez Hernandez',
     'Ingenieria en Sistemas Computacionales', 6),
    ('TEST2026002', 'Carlos Mendez Ruiz',
     'Ingenieria en Sistemas Computacionales', 4),
    ('TEST2026003', 'Maria Fernanda Torres',
     'Ingenieria Informática', 8),
    ('TEST2026004', 'Jose Eduardo Perez',
     'Ingenieria en Sistemas Computacionales', 2),
    ('TEST2026005', 'Sofia Ramirez Castillo',
     'Ingenieria Informática', 6),
    ('8990', 'Jesus Alfredo May Brito',
     'Ingenieria en Sistemas Computacionales', 7),
    ('8959', 'Juan Pablo Moo Uc',
     'Ingenieria en Sistemas Computacionales', 7)
ON CONFLICT (student_id) DO NOTHING;
