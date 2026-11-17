-- Set both Debutantes teams to 20 minutes per half in shared Supabase state.
UPDATE team_app_state
SET state = jsonb_set(
  jsonb_set(
    state,
    '{team,settings,halfDurationMinutes}',
    '20'::jsonb,
    true
  ),
  '{updatedAt}',
  to_jsonb(now()::text),
  true
),
updated_at = now()
WHERE team_id IN ('team-deba', 'team-debb')
  AND state #> '{team,settings}' IS NOT NULL
  AND state #> '{team,settings,halfDurationMinutes}' IS DISTINCT FROM '20'::jsonb;
