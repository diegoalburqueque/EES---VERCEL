-- Ejecutar antes de desplegar el login por RUT.
-- Esta migración agrega el campo y el índice, pero no inventa ni asigna RUT.
-- Cargar los RUT verificados de todas las cuentas activas antes de habilitar el nuevo login.
BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rut text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_rut ON usuarios (rut) WHERE rut IS NOT NULL;

COMMIT;
