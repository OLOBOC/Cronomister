-- Update Pre C match 7 against Codema "C" (round 7):
-- Result: 3-2 (Mareo 3 - 2 Codema "C")
-- Status: finished
-- Minutes: Unai (50), Mario (50), Jose/Pepe (40), Gino (39), Martín (35), Gonzalo (25), Jorge (11)
-- Uncalled / Not played (0 mins): Salvador (p-7), Aitor (p-8), Aleister (p-9), Tokyo (p-11)
UPDATE team_app_state AS team_state
SET state = jsonb_set(
  jsonb_set(
    team_state.state,
    '{matches}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN match_item->>'id' = 'm-prec-7' OR (match_item->>'round' = '7' AND match_item->>'rival' ILIKE '%Codema%') THEN
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      match_item,
                      '{status}',
                      '"finished"'::jsonb,
                      true
                    ),
                    '{scoreMareo}',
                    '3'::jsonb,
                    true
                  ),
                  '{scoreRival}',
                  '2'::jsonb,
                  true
                ),
                '{generalNote}',
                '"Victoria 3-2."'::jsonb,
                true
              ),
              '{records}',
              coalesce(match_item->'records', '{}'::jsonb) || jsonb_build_object(
                'p-1', jsonb_build_object('playerId', 'p-1', 'status', 'J', 'isStarter', true, 'minutes', 50, 'source', 'manual'),
                'p-2', jsonb_build_object('playerId', 'p-2', 'status', 'J', 'isStarter', true, 'minutes', 50, 'source', 'manual'),
                'p-3', jsonb_build_object('playerId', 'p-3', 'status', 'J', 'isStarter', true, 'minutes', 40, 'source', 'manual'),
                'p-4', jsonb_build_object('playerId', 'p-4', 'status', 'J', 'isStarter', true, 'minutes', 35, 'source', 'manual'),
                'p-5', jsonb_build_object('playerId', 'p-5', 'status', 'J', 'isStarter', false, 'minutes', 25, 'source', 'manual'),
                'p-6', jsonb_build_object('playerId', 'p-6', 'status', 'J', 'isStarter', true, 'minutes', 39, 'source', 'manual'),
                'p-7', jsonb_build_object('playerId', 'p-7', 'status', 'X', 'isStarter', false, 'minutes', 0, 'source', 'manual'),
                'p-8', jsonb_build_object('playerId', 'p-8', 'status', 'X', 'isStarter', false, 'minutes', 0, 'source', 'manual'),
                'p-9', jsonb_build_object('playerId', 'p-9', 'status', 'X', 'isStarter', false, 'minutes', 0, 'source', 'manual'),
                'p-10', jsonb_build_object('playerId', 'p-10', 'status', 'J', 'isStarter', false, 'minutes', 11, 'source', 'manual'),
                'p-11', jsonb_build_object('playerId', 'p-11', 'status', 'X', 'isStarter', false, 'minutes', 0, 'source', 'manual')
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
    WHERE match_item->>'id' = 'm-prec-7' OR (match_item->>'round' = '7' AND match_item->>'rival' ILIKE '%Codema%')
  );
