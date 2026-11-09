-- Migración 002: Autenticación, Permisos Granulares y Auditoría Inmutable
-- Escuela de Fútbol Mareo · Cronomister BETA v1

-- 1. MODIFICAR PERFILES CON ESTADO Y ROL GLOBAL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'delegate' CHECK (role IN ('admin', 'delegate'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- 2. TABLA DE PERMISOS GRANULARES POR USUARIO Y EQUIPO
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL CHECK (
    permission_key IN (
      'pass_attendance',
      'edit_convocatoria',
      'control_match',
      'add_notes',
      'edit_past_data',
      'download_pdf',
      'view_stats'
    )
  ),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, team_id, permission_key)
);

-- 3. REGISTRO DE AUDITORÍA INMUTABLE (RGPD / LOPDGDD)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activar RLS en las nuevas tablas
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. FUNCIONES HELPER DE PERMISOS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_team_permission(p_team_id UUID, p_perm TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Si es admin activo, tiene todos los permisos
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Comprobar si el delegado está activo y tiene el permiso explícito habilitado
  RETURN EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN profiles p ON p.id = up.user_id
    WHERE up.user_id = auth.uid()
      AND up.team_id = p_team_id
      AND up.permission_key = p_perm
      AND up.is_enabled = TRUE
      AND p.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. POLÍTICAS RLS PARA PERMISOS DE USUARIO
CREATE POLICY "Solo admin gestiona permisos de usuario" ON user_permissions
  FOR ALL USING (is_admin());

CREATE POLICY "Usuarios pueden consultar sus propios permisos" ON user_permissions
  FOR SELECT USING (user_id = auth.uid());

-- 6. POLÍTICAS RLS PARA AUDITORÍA INMUTABLE
-- Solo admin puede leer el registro de actividad
CREATE POLICY "Solo admin puede leer logs de actividad" ON activity_logs
  FOR SELECT USING (is_admin());

-- Cualquier usuario autenticado puede insertar un registro de auditoría de su acción
CREATE POLICY "Usuarios autenticados pueden registrar actividad" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- IMPORTANTE: NO SE CREAN POLÍTICAS DE UPDATE NI DELETE PARA activity_logs.
-- Por defecto en PostgreSQL RLS, la ausencia de política DENIEGA cualquier UPDATE o DELETE.
-- Esto garantiza la inmutabilidad legal del registro.

-- 7. REFORZAR POLÍTICAS RLS EN ENTIDADES PRINCIPALES

-- JUGADORES: Solo admin puede crear y borrar; delegados solo leen
DROP POLICY IF EXISTS "Crear o actualizar jugadores" ON players;
DROP POLICY IF EXISTS "Solo admin puede borrar jugadores" ON players;

CREATE POLICY "Solo admin crea jugadores" ON players
  FOR INSERT WITH CHECK (is_admin() AND is_team_member(team_id));

CREATE POLICY "Solo admin actualiza jugadores" ON players
  FOR UPDATE USING (is_admin() AND is_team_member(team_id));

CREATE POLICY "Solo admin borra jugadores" ON players
  FOR DELETE USING (is_admin() AND is_team_member(team_id));

-- SESIONES: Solo admin puede crear/borrar sesiones
DROP POLICY IF EXISTS "Ver y registrar sesiones de mis equipos" ON sessions;

CREATE POLICY "Ver sesiones de mis equipos" ON sessions
  FOR SELECT USING (is_team_member(team_id));

CREATE POLICY "Solo admin crea o edita sesiones" ON sessions
  FOR INSERT WITH CHECK (is_admin() AND is_team_member(team_id));

CREATE POLICY "Solo admin borra sesiones" ON sessions
  FOR DELETE USING (is_admin() AND is_team_member(team_id));

-- ASISTENCIA: Requiere permiso 'pass_attendance'
DROP POLICY IF EXISTS "Ver y registrar asistencias" ON attendance;

CREATE POLICY "Ver asistencias de mis equipos" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = attendance.session_id AND is_team_member(s.team_id)
    )
  );

CREATE POLICY "Registrar asistencia con permiso" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = attendance.session_id AND has_team_permission(s.team_id, 'pass_attendance')
    )
  );

CREATE POLICY "Modificar asistencia con permiso" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = attendance.session_id AND has_team_permission(s.team_id, 'pass_attendance')
    )
  );

-- PARTIDOS: Solo admin crea y borra
DROP POLICY IF EXISTS "Ver y gestionar partidos de mis equipos" ON matches;

CREATE POLICY "Ver partidos de mis equipos" ON matches
  FOR SELECT USING (is_team_member(team_id));

CREATE POLICY "Solo admin crea partidos" ON matches
  FOR INSERT WITH CHECK (is_admin() AND is_team_member(team_id));

CREATE POLICY "Controlar o actualizar partido" ON matches
  FOR UPDATE USING (
    is_team_admin(team_id) OR (
      has_team_permission(team_id, 'control_match')
      AND (status != 'finished' OR has_team_permission(team_id, 'edit_past_data'))
    )
  );

CREATE POLICY "Solo admin borra partidos" ON matches
  FOR DELETE USING (is_admin() AND is_team_member(team_id));

-- EVENTOS DE CRONÓMETRO: Requiere permiso 'control_match'
DROP POLICY IF EXISTS "Ver y registrar eventos de cronómetro" ON match_events;

CREATE POLICY "Ver eventos de cronómetro" ON match_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_events.match_id AND is_team_member(m.team_id)
    )
  );

CREATE POLICY "Registrar eventos de cronómetro con permiso" ON match_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_events.match_id AND has_team_permission(m.team_id, 'control_match')
    )
  );
