-- Migración 009: Actualizar duración de Debutantes A a 2×20 min = 40 min totales
-- halfDurationMinutes: 25 → 20 para team-deba

UPDATE team_app_state
SET state = jsonb_set(
  state,
  '{team,settings,halfDurationMinutes}',
  '20'::jsonb
)
WHERE team_id = 'team-deba';
