-- Migración 001: Esquema Inicial Cronomister BETA v1
-- Escuela de Fútbol Mareo
-- Cumplimiento estricto de RGPD: aislamiento por equipo mediante Row Level Security (RLS)

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA DE EQUIPOS
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  players_on_pitch INTEGER NOT NULL DEFAULT 5 CHECK (players_on_pitch BETWEEN 2 AND 11),
  half_duration_minutes INTEGER NOT NULL DEFAULT 25 CHECK (half_duration_minutes BETWEEN 5 AND 45),
  show_positions BOOLEAN NOT NULL DEFAULT false,
  training_days INTEGER[] NOT NULL DEFAULT '{2,4}', -- 2 = Martes, 4 = Jueves
  is_configured BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MIEMBROS DEL EQUIPO Y ROLES (Admin vs Delegado)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'delegate')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 5. TABLA DE JUGADORES (Datos protegidos de menores)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  dorsal INTEGER,
  first_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SESIONES DE ENTRENAMIENTO
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  general_note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, session_date)
);

-- 7. ASISTENCIA A ENTRENAMIENTOS
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status CHAR(1) NOT NULL CHECK (status IN ('S', 'A', 'N')), -- S: Vino, A: Avisó, N: No avisó
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, player_id)
);

-- 8. PARTIDOS
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_date DATE NOT NULL,
  rival TEXT NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT true,
  general_note TEXT,
  score_mareo INTEGER DEFAULT 0,
  score_rival INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'finished')),
  locked_by_user_id UUID REFERENCES profiles(id),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. REGISTRO DE MINUTOS Y CONVOCATORIA POR PARTIDO
CREATE TABLE IF NOT EXISTS match_roster (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status CHAR(1) NOT NULL DEFAULT 'J' CHECK (status IN ('J', 'X')),
  is_starter BOOLEAN NOT NULL DEFAULT false,
  minutes INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'manual', 'estimated')),
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- 10. EVENTOS EN VIVO DEL CRONÓMETRO (Inmutables)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  period INTEGER NOT NULL CHECK (period IN (1, 2)),
  event_type TEXT NOT NULL,
  player_out_id UUID REFERENCES players(id),
  player_in_id UUID REFERENCES players(id),
  goal_player_id UUID REFERENCES players(id),
  match_second INTEGER NOT NULL,
  real_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  comment TEXT
);

-- 11. ANOTACIONES GENERALES Y TÉCNICAS
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('session', 'match')),
  target_id UUID NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Función helper: Comprobar pertenencia al equipo
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper: Comprobar rol de Admin en el equipo
CREATE OR REPLACE FUNCTION is_team_admin(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reglas para Equipos
CREATE POLICY "Ver solo equipos asignados" ON teams
  FOR SELECT USING (is_team_member(id));

CREATE POLICY "Solo admin puede editar ajustes de equipo" ON teams
  FOR UPDATE USING (is_team_admin(id));

-- Reglas para Jugadores
CREATE POLICY "Ver jugadores de mis equipos" ON players
  FOR SELECT USING (is_team_member(team_id));

CREATE POLICY "Crear o actualizar jugadores" ON players
  FOR ALL USING (is_team_member(team_id));

CREATE POLICY "Solo admin puede borrar jugadores" ON players
  FOR DELETE USING (is_team_admin(team_id));

-- Reglas para Sesiones y Asistencia
CREATE POLICY "Ver y registrar sesiones de mis equipos" ON sessions
  FOR ALL USING (is_team_member(team_id));

CREATE POLICY "Ver y registrar asistencias" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = attendance.session_id AND is_team_member(s.team_id)
    )
  );

-- Reglas para Partidos y Eventos
CREATE POLICY "Ver y gestionar partidos de mis equipos" ON matches
  FOR ALL USING (is_team_member(team_id));

CREATE POLICY "Ver y gestionar convocatoria y actas" ON match_roster
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_roster.match_id AND is_team_member(m.team_id)
    )
  );

CREATE POLICY "Ver y registrar eventos de cronómetro" ON match_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_events.match_id AND is_team_member(m.team_id)
    )
  );

-- Reglas para Notas
CREATE POLICY "Ver y crear notas" ON notes
  FOR ALL USING (is_team_member(team_id));
