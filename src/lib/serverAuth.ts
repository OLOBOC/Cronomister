import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { UserRole, UserStatus, UserPermissions } from '@/types';

export interface AuthenticatedAppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  teamIds: string[];
  permissionsByTeam: Record<string, UserPermissions>;
}

export async function getAuthenticatedAppUser(req: Request): Promise<
  | { user: AuthenticatedAppUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return {
      error: NextResponse.json({ success: false, error: 'Autenticación obligatoria' }, { status: 401 }),
    };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return {
      error: NextResponse.json({ success: false, error: 'Sesión no válida' }, { status: 401 }),
    };
  }

  const { data: access, error: accessError } = await supabaseAdmin
    .from('app_user_access')
    .select('role, status, team_ids, permissions_by_team')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (accessError) {
    console.error('[auth] Error leyendo permisos de usuario:', accessError.message);
    return {
      error: NextResponse.json({ success: false, error: 'No se pudieron comprobar los permisos' }, { status: 500 }),
    };
  }
  if (!access || access.status !== 'active') {
    return {
      error: NextResponse.json({ success: false, error: 'Cuenta desactivada o sin permisos' }, { status: 403 }),
    };
  }

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email || '',
      name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuario',
      role: access.role as UserRole,
      status: access.status as UserStatus,
      teamIds: Array.isArray(access.team_ids) ? access.team_ids : [],
      permissionsByTeam: access.permissions_by_team || {},
    },
  };
}

export function requireAdmin(user: AuthenticatedAppUser): NextResponse | null {
  if (user.role !== 'admin' || user.status !== 'active') {
    return NextResponse.json({ success: false, error: 'Solo el administrador puede realizar esta acción' }, { status: 403 });
  }
  return null;
}
