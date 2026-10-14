-- Copia recuperable de contraseñas de CALIFICADOR + auditoría de recuperación.
-- NO aplicada. Ejecutar antes de desplegar el código que la usa:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/20261014_credenciales_calificador.sql
--
-- Por qué no se reutiliza `camara_secreta`: su `texto varchar(50)` no alcanza para el texto
-- cifrado (iv + tag + ciphertext en base64 supera los 50 caracteres), y no tiene PK, FK, fecha
-- ni versión de la clave que cifró. `camara_secreta` queda intacta.
--
-- La clave de cifrado NO vive acá: está en la variable CREDENCIALES_CLAVE de Vercel (Sensitive)
-- y se usa con AES-256-GCM en src/lib/credenciales.ts. Esta tabla solo guarda el resultado.
BEGIN;

CREATE TABLE IF NOT EXISTS credenciales_calificador (
  usuario_id     uuid PRIMARY KEY REFERENCES usuarios(id),
  password_cifrada text NOT NULL,         -- iv.tag.ciphertext en base64 (AES-256-GCM); nunca texto plano
  version_clave  text NOT NULL,           -- versión de CREDENCIALES_CLAVE que cifró (para rotación)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_credenciales_calificador_updated_at ON credenciales_calificador;
CREATE TRIGGER trg_credenciales_calificador_updated_at
  BEFORE UPDATE ON credenciales_calificador
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Quién recuperó la contraseña de quién y cuándo. Nunca guarda la contraseña.
CREATE TABLE IF NOT EXISTS auditoria_recuperacion_credencial (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid NOT NULL REFERENCES usuarios(id),
  calificador_id uuid NOT NULL REFERENCES usuarios(id),
  motivo         text NOT NULL,
  resultado      text NOT NULL CHECK (resultado IN ('ENTREGADA', 'SIN_COPIA', 'ERROR_DESCIFRADO')),
  ip             text,
  user_agent     text,
  fecha          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_recuperacion_calificador
  ON auditoria_recuperacion_credencial (calificador_id, fecha);

COMMIT;
