-- Corrección de Jornada 7 (Codema "C", 14/11/2026):
-- Restablecer el partido a pendiente ('scheduled'), eliminar el marcador de prueba (0-0)
-- y limpiar los registros de prueba para que figure como Pendiente.

UPDATE team_app_state AS team_state
SET state = jsonb_set(
  jsonb_set(
    team_state.state,
    '{matches}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN match_item->>'id' = 'm-prec-7' OR (match_item->>'round' = '7' AND match_item->>'rival' ILIKE '%Codema%') THEN
            (match_item - 'scoreMareo' - 'scoreRival') || '{"status": "scheduled", "records": {}}'::jsonb
          ELSE match_item
        END
        ORDER BY ordinal
      )
      FROM jsonb_array_elements(team_state.state->'matches')
        WITH ORDINALITY AS matches(match_item, ordinal)
    ),
    true
  ),
  '{updatedAt}',
  to_jsonb(now()::text),
  true
),
updated_at = now()
WHERE team_state.team_id = 'team-prec'
  AND jsonb_typeof(team_state.state->'matches') = 'array';
