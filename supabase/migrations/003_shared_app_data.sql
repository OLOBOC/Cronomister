-- Persistencia compartida para todos los dispositivos Cronomister.
-- Los identificadores de los datos de la aplicación son texto (p. ej. team-prec),
-- por lo que se guardan como JSONB sin perder los registros locales existentes.

CREATE TABLE IF NOT EXISTS app_user_access (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'delegate')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  team_ids TEXT[] NOT NULL DEFAULT '{}',
  permissions_by_team JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_app_state (
  team_id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_app_state ENABLE ROW LEVEL SECURITY;

-- Inicializa el acceso desde los metadatos que ya usa la versión actual.
-- A partir de esta migración, la aplicación lee permisos desde app_user_access.
INSERT INTO app_user_access (user_id, role, status, team_ids, permissions_by_team)
SELECT
  u.id,
  CASE WHEN u.raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'delegate' END,
  CASE
    WHEN u.raw_user_meta_data->>'status' IN ('active', 'invited', 'disabled')
      THEN u.raw_user_meta_data->>'status'
    ELSE 'active'
  END,
  ARRAY(
    SELECT jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(u.raw_user_meta_data->'teamIds') = 'array'
          THEN u.raw_user_meta_data->'teamIds'
        ELSE '[]'::jsonb
      END
    )
  ),
  CASE
    WHEN jsonb_typeof(u.raw_user_meta_data->'permissionsByTeam') = 'object'
      THEN u.raw_user_meta_data->'permissionsByTeam'
    ELSE '{}'::jsonb
  END
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
