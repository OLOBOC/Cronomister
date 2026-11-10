import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthenticatedAppUser, AuthenticatedAppUser } from '@/lib/serverAuth';
import { PermissionKey } from '@/types';

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function hasPermission(user: AuthenticatedAppUser, teamId: string, permission: PermissionKey): boolean {
  return user.role === 'admin' || user.permissionsByTeam[teamId]?.[permission] === true;
}

function isAppendOnly(previous: unknown, incoming: unknown, ownerKey: string, ownerValue: string): boolean {
  if (!Array.isArray(previous) || !Array.isArray(incoming)) return false;
  const incomingById = new Map(
    incoming
      .filter((entry) => entry && typeof entry === 'object' && 'id' in entry)
      .map((entry) => [(entry as { id: string }).id, entry])
  );
  for (const entry of previous) {
    if (!entry || typeof entry !== 'object' || !('id' in entry)) return false;
    const next = incomingById.get((entry as { id: string }).id);
    if (!next || stableStringify(next) !== stableStringify(entry)) return false;
  }
  return incoming.every((entry) => {
    if (!entry || typeof entry !== 'object' || !('id' in entry)) return false;
    const id = (entry as { id: string }).id;
    if (previous.some((oldEntry) => (oldEntry as { id?: string }).id === id)) return true;
    return ownerKey in entry && (entry as Record<string, unknown>)[ownerKey] === ownerValue;
  });
}

function mergeAttendance(existing: unknown, incoming: unknown): unknown {
  if (!Array.isArray(existing) || !Array.isArray(incoming)) return incoming;
  const merged = new Map<string, Record<string, unknown>>();
  [...existing, ...incoming].forEach((value) => {
    if (!value || typeof value !== 'object' || !('id' in value)) return;
    const record = value as Record<string, unknown>;
    const id = String(record.id);
    const current = merged.get(id);
    const currentTime = current?.updatedAt ? new Date(String(current.updatedAt)).getTime() : 0;
    const incomingTime = record.updatedAt ? new Date(String(record.updatedAt)).getTime() : 0;
    if (!current || incomingTime >= currentTime) merged.set(id, record);
  });
  return Array.from(merged.values());
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedAppUser(req);
    if (!auth.user) return auth.error;

    let query = supabaseAdmin.from('team_app_state').select('team_id, state, updated_at');
    if (auth.user.role !== 'admin') {
      if (auth.user.teamIds.length === 0) {
        return NextResponse.json({ success: true, teamIds: [], states: [] });
      }
      query = query.in('team_id', auth.user.teamIds);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[shared-data] Error cargando datos:', error.message);
      return NextResponse.json({ success: false, error: 'No se pudieron cargar los datos compartidos' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      teamIds: auth.user.role === 'admin' ? null : auth.user.teamIds,
      states: (data || []).map((row) => ({
        teamId: row.team_id,
        state: row.state,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error: unknown) {
    console.error('[shared-data] Error inesperado al cargar datos:', error);
    return NextResponse.json({ success: false, error: 'Error al cargar los datos compartidos' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await getAuthenticatedAppUser(req);
    if (!auth.user) return auth.error;

    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('teamId' in body) ||
      typeof body.teamId !== 'string' ||
      !('state' in body) ||
      !body.state ||
      typeof body.state !== 'object' ||
      Array.isArray(body.state)
    ) {
      return NextResponse.json({ success: false, error: 'Datos del equipo no válidos' }, { status: 400 });
    }

    const { teamId } = body;
    const state = body.state as Record<string, unknown>;
    if (auth.user.role !== 'admin' && !auth.user.teamIds.includes(teamId)) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a este equipo' }, { status: 403 });
    }
    const { data: currentRow, error: stateError } = await supabaseAdmin
      .from('team_app_state')
      .select('state')
      .eq('team_id', teamId)
      .maybeSingle();
    if (stateError) {
      console.error('[shared-data] Error consultando el estado del equipo:', stateError.message);
      return NextResponse.json({ success: false, error: 'No se pudo validar el estado del equipo' }, { status: 500 });
    }
    const existingState = currentRow?.state && typeof currentRow.state === 'object'
      ? currentRow.state as Record<string, unknown>
      : null;

    if (auth.user.role !== 'admin') {
      if (!existingState) {
        return NextResponse.json({ success: false, error: 'El administrador debe inicializar primero los datos del equipo' }, { status: 409 });
      }

      const protectedKeys = ['team', 'players', 'sessions'];
      if (protectedKeys.some((key) => key in state && stableStringify(state[key]) !== stableStringify(existingState[key]))) {
        return NextResponse.json({ success: false, error: 'Los delegados no pueden modificar equipos, jugadores ni sesiones' }, { status: 403 });
      }
      if (
        'attendance' in state &&
        stableStringify(state.attendance) !== stableStringify(existingState.attendance) &&
        !hasPermission(auth.user, teamId, 'pass_attendance')
      ) {
        return NextResponse.json({ success: false, error: 'No tienes permiso para registrar asistencia' }, { status: 403 });
      }
      if ('attendance' in state && Array.isArray(state.attendance) && Array.isArray(existingState.attendance)) {
        const oldAttendance = new Map(
          existingState.attendance.map((record) => [
            `${(record as { sessionId?: string }).sessionId}_${(record as { playerId?: string }).playerId}`,
            record,
          ])
        );
        const today = new Date().toISOString().slice(0, 10);
        const editsPastAttendance = state.attendance.some((record) => {
          if (!record || typeof record !== 'object') return false;
          const item = record as { sessionId?: string; playerId?: string };
          if (!item.sessionId || item.sessionId >= today) return false;
          const key = `${item.sessionId}_${item.playerId}`;
          return stableStringify(oldAttendance.get(key)) !== stableStringify(record);
        });
        if (editsPastAttendance && !hasPermission(auth.user, teamId, 'edit_past_data')) {
          return NextResponse.json({ success: false, error: 'No tienes permiso para modificar asistencias de fechas pasadas' }, { status: 403 });
        }
      }
      if (
        'events' in state &&
        stableStringify(state.events) !== stableStringify(existingState.events) &&
        !hasPermission(auth.user, teamId, 'control_match')
      ) {
        return NextResponse.json({ success: false, error: 'No tienes permiso para registrar eventos de partido' }, { status: 403 });
      }
      if ('matches' in state && stableStringify(state.matches) !== stableStringify(existingState.matches)) {
        if (!hasPermission(auth.user, teamId, 'control_match') &&
          !hasPermission(auth.user, teamId, 'edit_convocatoria')) {
          return NextResponse.json({ success: false, error: 'No tienes permiso para modificar partidos' }, { status: 403 });
        }
        const oldMatches = Array.isArray(existingState.matches) ? existingState.matches : [];
        const changesFinishedMatch = oldMatches.some((match) => {
          if (!match || typeof match !== 'object' || !('id' in match) || !('status' in match)) return false;
          if ((match as { status: string }).status !== 'finished') return false;
          const next = (Array.isArray(state.matches) ? state.matches : []).find(
            (item) => item && typeof item === 'object' && 'id' in item && item.id === match.id
          );
          return !next || stableStringify(next) !== stableStringify(match);
        });
        if (changesFinishedMatch && !hasPermission(auth.user, teamId, 'edit_past_data')) {
          return NextResponse.json({ success: false, error: 'No tienes permiso para editar partidos finalizados' }, { status: 403 });
        }
      }
      if (
        'notes' in state &&
        stableStringify(state.notes) !== stableStringify(existingState.notes) &&
        !hasPermission(auth.user, teamId, 'add_notes')
      ) {
        return NextResponse.json({ success: false, error: 'No tienes permiso para añadir notas' }, { status: 403 });
      }
      if ('notes' in state && !isAppendOnly(existingState.notes, state.notes, 'authorName', auth.user.name)) {
        return NextResponse.json({ success: false, error: 'No se puede modificar ni eliminar una nota guardada' }, { status: 403 });
      }
      if ('activityLogs' in state && !isAppendOnly(existingState.activityLogs, state.activityLogs, 'userId', auth.user.id)) {
        return NextResponse.json({ success: false, error: 'No se puede modificar ni eliminar el registro de actividad' }, { status: 403 });
      }
    }

    const mergedState = { ...existingState, ...state };
    if (auth.user.role !== 'admin' && 'attendance' in state) {
      mergedState.attendance = mergeAttendance(existingState?.attendance, state.attendance);
    }

    const { error } = await supabaseAdmin.from('team_app_state').upsert(
      {
        team_id: teamId,
        state: mergedState,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'team_id' }
    );

    if (error) {
      console.error('[shared-data] Error guardando datos:', error.message);
      return NextResponse.json({ success: false, error: 'No se pudieron guardar los datos en Supabase' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
  } catch (error: unknown) {
    console.error('[shared-data] Error inesperado al guardar datos:', error);
    return NextResponse.json({ success: false, error: 'Error al guardar los datos compartidos' }, { status: 500 });
  }
}
