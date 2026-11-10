import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthenticatedAppUser, requireAdmin } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedAppUser(req);
    if (!auth.user) return auth.error;
    const adminError = requireAdmin(auth.user);
    if (adminError) return adminError;

    const [{ data: authData, error: authError }, { data: accessRows, error: accessError }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from('app_user_access').select('user_id, role, status, team_ids, permissions_by_team'),
    ]);

    if (authError || accessError) {
      const message = authError?.message || accessError?.message || 'Error al consultar usuarios';
      console.error('[admin/users] Error consultando usuarios:', message);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }

    const accessById = new Map((accessRows || []).map((row) => [row.user_id, row]));
    const users = (authData?.users || []).flatMap((user) => {
      const access = accessById.get(user.id);
      if (!access) return [];
      return [{
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
        role: access.role,
        status: access.status,
        teamIds: access.team_ids || [],
        permissionsByTeam: access.permissions_by_team || {},
        createdAt: user.created_at,
      }];
    });

    return NextResponse.json({ success: true, users });
  } catch (error: unknown) {
    console.error('[admin/users] Error inesperado al listar usuarios:', error);
    return NextResponse.json({ success: false, error: 'Error al listar usuarios' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuthenticatedAppUser(req);
    if (!auth.user) return auth.error;
    const adminError = requireAdmin(auth.user);
    if (adminError) return adminError;

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || !('userId' in body) || typeof body.userId !== 'string' ||
      !('updates' in body) || !body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ success: false, error: 'Solicitud de actualización no válida' }, { status: 400 });
    }

    const { userId, updates } = body;
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetError || !target.user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }
    const { data: currentAccess, error: accessError } = await supabaseAdmin
      .from('app_user_access')
      .select('role, status, team_ids, permissions_by_team')
      .eq('user_id', userId)
      .maybeSingle();
    if (accessError || !currentAccess) {
      return NextResponse.json({ success: false, error: 'No se encontró el perfil de acceso del usuario' }, { status: 404 });
    }
    if (currentAccess.role === 'admin' && userId === auth.user.id) {
      return NextResponse.json({ success: false, error: 'No puedes modificar tu propio acceso de administrador' }, { status: 400 });
    }

    const patch = updates as Record<string, unknown>;
    const nextStatus = patch.status ?? currentAccess.status;
    const nextTeamIds = patch.teamIds ?? currentAccess.team_ids;
    const nextPermissions = patch.permissionsByTeam ?? currentAccess.permissions_by_team;
    const password = patch.password;
    if (nextStatus !== 'active' && nextStatus !== 'invited' && nextStatus !== 'disabled') {
      return NextResponse.json({ success: false, error: 'Estado de usuario no válido' }, { status: 400 });
    }
    if (!Array.isArray(nextTeamIds) || nextTeamIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ success: false, error: 'La lista de equipos no es válida' }, { status: 400 });
    }
    if (currentAccess.role === 'delegate' && nextTeamIds.length === 0) {
      return NextResponse.json({ success: false, error: 'El delegado debe tener al menos un equipo asignado' }, { status: 400 });
    }
    if (!nextPermissions || typeof nextPermissions !== 'object' || Array.isArray(nextPermissions)) {
      return NextResponse.json({ success: false, error: 'Los permisos no son válidos' }, { status: 400 });
    }
    if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
      return NextResponse.json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const { error: saveError } = await supabaseAdmin
      .from('app_user_access')
      .update({
        status: nextStatus,
        team_ids: nextTeamIds,
        permissions_by_team: nextPermissions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (saveError) {
      console.error('[admin/users] Error guardando permisos:', saveError.message);
      return NextResponse.json({ success: false, error: 'No se pudieron guardar los cambios' }, { status: 500 });
    }

    const userMetadata = {
      ...target.user.user_metadata,
      status: nextStatus,
      teamIds: nextTeamIds,
      permissionsByTeam: nextPermissions,
    };
    const updatePayload: {
      user_metadata: Record<string, unknown>;
      password?: string;
    } = { user_metadata: userMetadata };
    if (typeof password === 'string') updatePayload.password = password;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
    if (updateError) {
      console.error('[admin/users] Error actualizando Auth:', updateError.message);
      return NextResponse.json({ success: false, error: 'Los permisos se guardaron, pero no se pudo actualizar la cuenta de acceso' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: target.user.email || '',
        name: target.user.user_metadata?.name || target.user.email?.split('@')[0] || 'Usuario',
        role: currentAccess.role,
        status: nextStatus,
        teamIds: nextTeamIds,
        permissionsByTeam: nextPermissions,
        createdAt: target.user.created_at,
      },
    });
  } catch (error: unknown) {
    console.error('[admin/users] Error inesperado al actualizar usuario:', error);
    return NextResponse.json({ success: false, error: 'Error al actualizar usuario' }, { status: 500 });
  }
}
