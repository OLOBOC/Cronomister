-- Add Jose Diaz Diaz (#3, player ID p-3) to the Perchera match report.
UPDATE team_app_state AS team_state
SET state = jsonb_set(
  jsonb_set(
    team_state.state,
    '{matches}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN match_item->>'id' = 'm-prec-6' THEN jsonb_set(
            jsonb_set(match_item, '{status}', '"finished"'::jsonb, true),
            '{records}',
            coalesce(match_item->'records', '{}'::jsonb) || jsonb_build_object(
              'p-3',
              jsonb_build_object(
                'playerId', 'p-3',
                'status', 'J',
                'isStarter', false,
                'minutes', 30,
                'source', 'manual'
              )
            ),
            true
          )
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
  AND jsonb_typeof(team_state.state->'matches') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(team_state.state->'matches') AS match_item
    WHERE match_item->>'id' = 'm-prec-6'
  );
