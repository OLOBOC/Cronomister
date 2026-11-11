-- Actualización de la plantilla oficial de Debutantes A (9 jugadores):
-- 1. Nicolás Abella Rodríguez (4 años)
-- 2. Martín Álvarez Menéndez (doble equipo con Pre C)
-- 3. José Díaz Díaz (Pepe) (doble equipo con Pre C)
-- 4. Manuel Asensio Huete
-- 5. Martín Díaz Rodríguez
-- 6. Alonso Jorge France González
-- 7. Jorge
-- 8. Daniel Martínez Swida
-- 9. Ander Vázquez Fernández

-- 1. Actualizar jugadores de Debutantes A en team_app_state
UPDATE team_app_state AS team_state
SET state = jsonb_set(
  jsonb_set(
    team_state.state,
    '{players}',
    '[
      {"id": "p-da-nicolas", "teamId": "team-deba", "dorsal": null, "firstName": "Nicolás", "fullName": "Nicolás Abella Rodríguez", "note": "4 años", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-martin-alvarez", "teamId": "team-deba", "dorsal": null, "firstName": "Martín", "fullName": "Martín Álvarez Menéndez", "note": "Pre C", "linkedPlayerId": "p-4", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-jose-diaz", "teamId": "team-deba", "dorsal": null, "firstName": "José", "fullName": "José Díaz Díaz (Pepe)", "note": "Pre C", "linkedPlayerId": "p-3", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-manuel-asensio", "teamId": "team-deba", "dorsal": null, "firstName": "Manuel", "fullName": "Manuel Asensio Huete", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-martin-diaz", "teamId": "team-deba", "dorsal": null, "firstName": "Martín", "fullName": "Martín Díaz Rodríguez", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-alonso-france", "teamId": "team-deba", "dorsal": null, "firstName": "Alonso", "fullName": "Alonso Jorge France González", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-jorge", "teamId": "team-deba", "dorsal": null, "firstName": "Jorge", "fullName": "Jorge", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-daniel-martinez", "teamId": "team-deba", "dorsal": null, "firstName": "Daniel", "fullName": "Daniel Martínez Swida", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"},
      {"id": "p-da-ander-vazquez", "teamId": "team-deba", "dorsal": null, "firstName": "Ander", "fullName": "Ander Vázquez Fernández", "isActive": true, "createdAt": "2026-09-01T00:00:00Z"}
    ]'::jsonb,
    true
  ),
  '{updatedAt}',
  to_jsonb(now()::text),
  true
),
updated_at = now()
WHERE team_state.team_id = 'team-deba';

-- 2. Asegurar que en Pre C, Martín Álvarez (p-4) y José Díaz (p-3) tengan linkedPlayerId
UPDATE team_app_state AS team_state
SET state = jsonb_set(
  team_state.state,
  '{players}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN player_item->>'id' = 'p-3' THEN
          player_item || '{"linkedPlayerId": "p-da-jose-diaz"}'::jsonb
        WHEN player_item->>'id' = 'p-4' THEN
          player_item || '{"linkedPlayerId": "p-da-martin-alvarez"}'::jsonb
        ELSE player_item
      END
      ORDER BY ordinal
    )
    FROM jsonb_array_elements(team_state.state->'players')
      WITH ORDINALITY AS players(player_item, ordinal)
  ),
  true
),
updated_at = now()
WHERE team_state.team_id = 'team-prec'
  AND jsonb_typeof(team_state.state->'players') = 'array';
