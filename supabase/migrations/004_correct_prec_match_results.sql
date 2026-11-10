-- Correct historical Pre C scores. Stored scores are always Mareo first,
-- even when the match was played away.
UPDATE team_app_state AS team_state
SET state = jsonb_set(
  team_state.state,
  '{matches}',
  (
    SELECT jsonb_agg(
      CASE match_item->>'id'
        WHEN 'm-prec-1' THEN jsonb_set(jsonb_set(match_item, '{scoreMareo}', '13'::jsonb, true), '{scoreRival}', '2'::jsonb, true)
        WHEN 'm-prec-2' THEN jsonb_set(jsonb_set(match_item, '{scoreMareo}', '0'::jsonb, true), '{scoreRival}', '12'::jsonb, true)
        WHEN 'm-prec-3' THEN jsonb_set(jsonb_set(match_item, '{scoreMareo}', '3'::jsonb, true), '{scoreRival}', '9'::jsonb, true)
        WHEN 'm-prec-4' THEN jsonb_set(jsonb_set(match_item, '{scoreMareo}', '10'::jsonb, true), '{scoreRival}', '0'::jsonb, true)
        WHEN 'm-prec-5' THEN jsonb_set(jsonb_set(match_item, '{scoreMareo}', '6'::jsonb, true), '{scoreRival}', '1'::jsonb, true)
        WHEN 'm-prec-6' THEN jsonb_set(jsonb_set(match_item, '{scoreMareo}', '3'::jsonb, true), '{scoreRival}', '0'::jsonb, true)
        ELSE match_item
      END
      ORDER BY ordinal
    )
    FROM jsonb_array_elements(team_state.state->'matches') WITH ORDINALITY AS matches(match_item, ordinal)
  ),
  true
),
updated_at = now()
WHERE team_state.team_id = 'team-prec'
  AND jsonb_typeof(team_state.state->'matches') = 'array';
