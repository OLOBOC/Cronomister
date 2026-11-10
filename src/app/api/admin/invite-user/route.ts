import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthenticatedAppUser, requireAdmin } from '@/lib/serverAuth';
import { DEFAULT_DELEGATE_PERMISSIONS } from '@/lib/permissions';

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedAppUser(req);
    if (!auth.user) return auth.error;
    const adminError = requireAdmin(auth.user);
    if (adminError) return adminError;

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Solicitud no válida' }, { status: 400 });
    }
    const { email, name, teamIds } = body as {
      email?: unknown;
      name?: unknown;
      teamIds?: unknown;
    };
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Introduce un correo electrónico válido' }, { status: 400 });
    }
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 });
    }
    if (!Array.isArray(teamIds) || teamIds.length === 0 || teamIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ success: false, error: 'Asigna al menos un equipo al delegado' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      return NextResponse.json({ success: false, error: 'No se pudo comprobar si el usuario ya existe' }, { status: 500 });
    }
    if (existingUsers.users.some((user) => user.email?.toLowerCase() === normalizedEmail)) {
      return NextResponse.json({ success: false, error: 'Ya existe una cuenta con ese correo electrónico' }, { status: 409 });
    }

    const assignedPassword = 'mareo' + Math.floor(1000 + Math.random() * 9000);
    const permissionsByTeam = Object.fromEntries(
      teamIds.map((teamId) => [teamId, { ...DEFAULT_DELEGATE_PERMISSIONS }])
    );
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: assignedPassword,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: 'delegate',
        status: 'active',
        teamIds,
        permissionsByTeam,
      },
    });

    if (createError || !createData.user) {
      return NextResponse.json({ success: false, error: createError?.message || 'No se pudo crear el usuario' }, { status: 500 });
    }

    const { error: accessError } = await supabaseAdmin.from('app_user_access').insert({
      user_id: createData.user.id,
      role: 'delegate',
      status: 'active',
      team_ids: teamIds,
      permissions_by_team: permissionsByTeam,
    });
    if (accessError) {
      await supabaseAdmin.auth.admin.deleteUser(createData.user.id);
      console.error('[admin/invite-user] Error guardando permisos:', accessError.message);
      return NextResponse.json({ success: false, error: 'La cuenta se creó, pero no se pudieron guardar sus permisos' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createData.user.id,
        email: normalizedEmail,
        name: name.trim(),
        role: 'delegate',
        status: 'active',
        teamIds,
        permissionsByTeam,
        password: assignedPassword,
      },
    });
  } catch (error: unknown) {
    console.error('[admin/invite-user] Error inesperado:', error);
    return NextResponse.json({ success: false, error: 'Error interno al invitar al delegado' }, { status: 500 });
  }
}
