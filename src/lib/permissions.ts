import { PermissionKey, UserPermissions, UserProfile } from '@/types';

export const DEFAULT_DELEGATE_PERMISSIONS: UserPermissions = {
  pass_attendance: true,
  edit_convocatoria: true,
  control_match: true,
  add_notes: true,
  edit_past_data: false,
  download_pdf: false,
  view_stats: false,
};

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  pass_attendance: true,
  edit_convocatoria: true,
  control_match: true,
  add_notes: true,
  edit_past_data: true,
  download_pdf: true,
  view_stats: true,
};

export const PERMISSION_METADATA: Record<
  PermissionKey,
  { label: string; description: string; defaultDelegate: boolean }
> = {
  pass_attendance: {
    label: 'Pasar lista',
    description: 'Registrar asistencia en entrenamientos presentes o pasados',
    defaultDelegate: true,
  },
  edit_convocatoria: {
    label: 'Convocatoria y alineaciones',
    description: 'Configurar titulares, suplentes y no convocados antes de un partido',
    defaultDelegate: true,
  },
  control_match: {
    label: 'Iniciar y controlar partidos',
    description: 'Operar el cronómetro, registrar cambios y goles durante el juego',
    defaultDelegate: true,
  },
  add_notes: {
    label: 'Anotar notas',
    description: 'Escribir observaciones técnicas en entrenamientos y partidos',
    defaultDelegate: true,
  },
  edit_past_data: {
    label: 'Editar datos pasados',
    description: 'Modificar actas de partidos finalizados y fechas históricas',
    defaultDelegate: false,
  },
  download_pdf: {
    label: 'Descargar PDF',
    description: 'Generar y exportar informes técnicos oficiales de jugadores',
    defaultDelegate: false,
  },
  view_stats: {
    label: 'Ver estadísticas',
    description: 'Visualizar gráficos comparativos y porcentajes del equipo',
    defaultDelegate: false,
  },
};

/**
 * Comprueba si un usuario tiene un permiso específico para un equipo determinado.
 * El rol 'admin' siempre tiene todos los permisos activos.
 */
export function hasPermission(
  user: UserProfile | null,
  teamId: string,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  if (user.status === 'disabled') return false;
  if (user.role === 'admin') return true;

  // Comprobar pertenencia al equipo
  if (!user.teamIds.includes(teamId)) return false;

  // Permisos específicos por equipo o valor por defecto
  const teamPerms = user.permissionsByTeam?.[teamId];
  if (teamPerms && typeof teamPerms[permission] === 'boolean') {
    return teamPerms[permission];
  }

  return DEFAULT_DELEGATE_PERMISSIONS[permission];
}

/**
 * Valida una operación en el cliente/servidor y lanza un error explicativo si no está autorizado
 */
export function assertPermission(
  user: UserProfile | null,
  teamId: string,
  permission: PermissionKey,
  actionName?: string
): void {
  if (!hasPermission(user, teamId, permission)) {
    const meta = PERMISSION_METADATA[permission];
    throw new Error(
      `Acceso denegado: Se requiere el permiso "${meta?.label || permission}" para ${
        actionName || 'realizar esta acción'
      }.`
    );
  }
}
