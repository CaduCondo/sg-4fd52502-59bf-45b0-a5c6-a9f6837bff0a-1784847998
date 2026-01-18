-- Habilitar extensão pgcrypto (necessária para bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar se a extensão foi habilitada
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pgcrypto';