-- Load Aitor's verified historical report and the confirmed Perchera minutes.
-- Existing player records and attendance are preserved if this is re-run.
-- Scores and match status are stored as Mareo's result/status.
WITH aitor_attendance(session_id, attendance_status) AS (
  VALUES
    ('2026-09-01', 'S'), ('2026-09-03', 'S'), ('2026-09-08', 'S'), ('2026-09-10', 'S'),
    ('2026-09-15', 'S'), ('2026-09-17', 'S'), ('2026-09-22', 'S'), ('2026-09-24', 'S'),
    ('2026-09-29', 'S'), ('2026-10-01', 'S'), ('2026-10-06', 'S'), ('2026-10-08', 'S'),
    ('2026-10-13', 'S'), ('2026-10-15', 'S'), ('2026-10-20', 'S'), ('2026-10-22', 'N'),
    ('2026-10-27', 'N'), ('2026-10-29', 'A'), ('2026-11-03', 'N'), ('2026-11-05', 'S')
),
aitor_attendance_json AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', 'att-' || session_id || '-p-8',
      'sessionId', session_id,
      'playerId', 'p-8',
      'status', attendance_status,
      'reason', NULL,
      'note', '',
      'updatedAt', now()
    )
    ORDER BY session_id
  ) AS records
  FROM aitor_attendance
)
UPDATE team_app_state AS team_state
SET state = jsonb_set(
  jsonb_set(
    team_state.state,
    '{matches}',
    (
      SELECT jsonb_agg(
        jsonb_set(
          jsonb_set(
            match_item,
            '{status}',
            CASE
              WHEN match_item->>'id' IN ('m-prec-1', 'm-prec-2', 'm-prec-3', 'm-prec-4', 'm-prec-5', 'm-prec-6')
                THEN '"finished"'::jsonb
              ELSE match_item->'status'
            END,
            true
          ),
          '{records}',
          coalesce(match_item->'records', '{}'::jsonb) ||
          (
          CASE match_item->>'id'
            WHEN 'm-prec-1' THEN jsonb_build_object('p-8', jsonb_build_object(
              'playerId', 'p-8', 'status', 'J', 'isStarter', true, 'minutes', 35, 'source', 'manual'
            ))
            WHEN 'm-prec-2' THEN jsonb_build_object('p-8', jsonb_build_object(
              'playerId', 'p-8', 'status', 'X', 'isStarter', false, 'minutes', 0, 'source', 'manual'
            ))
            WHEN 'm-prec-3' THEN jsonb_build_object('p-8', jsonb_build_object(
              'playerId', 'p-8', 'status', 'J', 'isStarter', false, 'minutes', 29, 'source', 'manual'
            ))
            WHEN 'm-prec-4' THEN jsonb_build_object('p-8', jsonb_build_object(
              'playerId', 'p-8', 'status', 'J', 'isStarter', false, 'minutes', 20, 'source', 'manual'
            ))
            WHEN 'm-prec-5' THEN jsonb_build_object('p-8', jsonb_build_object(
              'playerId', 'p-8', 'status', 'J', 'isStarter', false, 'minutes', 25, 'source', 'manual'
            ))
            WHEN 'm-prec-6' THEN jsonb_build_object(
              'p-1', jsonb_build_object('playerId', 'p-1', 'status', 'J', 'isStarter', false, 'minutes', 50, 'source', 'manual'),
              'p-2', jsonb_build_object('playerId', 'p-2', 'status', 'J', 'isStarter', false, 'minutes', 50, 'source', 'manual'),
              'p-4', jsonb_build_object('playerId', 'p-4', 'status', 'J', 'isStarter', false, 'minutes', 30, 'source', 'manual'),
              'p-5', jsonb_build_object('playerId', 'p-5', 'status', 'J', 'isStarter', false, 'minutes', 24, 'source', 'manual'),
              'p-6', jsonb_build_object('playerId', 'p-6', 'status', 'J', 'isStarter', false, 'minutes', 48, 'source', 'manual'),
              'p-8', jsonb_build_object('playerId', 'p-8', 'status', 'X', 'isStarter', false, 'minutes', 0, 'source', 'manual'),
              'p-10', jsonb_build_object('playerId', 'p-10', 'status', 'J', 'isStarter', false, 'minutes', 18, 'source', 'manual')
            )
            ELSE '{}'::jsonb
          END -
          ARRAY(SELECT jsonb_object_keys(coalesce(match_item->'records', '{}'::jsonb)))
          ),
          true
        )
        ORDER BY ordinal
      )
      FROM jsonb_array_elements(team_state.state->'matches')
        WITH ORDINALITY AS matches(match_item, ordinal)
    ),
    true
  ),
  '{attendance}',
  (
    SELECT coalesce(jsonb_agg(attendance_record ORDER BY record_order), '[]'::jsonb)
    FROM (
      SELECT DISTINCT ON (attendance_record->>'id') attendance_record, record_order
      FROM jsonb_array_elements(
        coalesce(team_state.state->'attendance', '[]'::jsonb) || aitor_attendance_json.records
      ) WITH ORDINALITY AS attendance_rows(attendance_record, record_order)
      ORDER BY attendance_record->>'id', record_order
    ) AS deduplicated_attendance
  ),
  true
),
updated_at = now()
FROM aitor_attendance_json
WHERE team_state.team_id = 'team-prec'
  AND jsonb_typeof(team_state.state->'matches') = 'array';
