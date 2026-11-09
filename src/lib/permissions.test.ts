import { describe, it, expect, beforeEach } from 'vitest';
import { UserProfile } from '@/types';
import {
  hasPermission,
  assertPermission,
  DEFAULT_DELEGATE_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
} from './permissions';
import { ATTENDANCE_LABELS, CONVOCATION_LABELS, MINUTES_SOURCE_LABELS } from './terminology';

describe('Terminología oficial de Mareo', () => {
  it('mapea correctamente los estados de asistencia a entrenamientos', () => {
    expect(ATTENDANCE_LABELS.S).toBe('Asistió');
    expect(ATTENDANCE_LABELS.A).toBe('No asistió – avisó');
    expect(ATTENDANCE_LABELS.N).toBe('No asistió – no avisó');
  });

  it('mapea correctamente la convocatoria de partidos', () => {
    expect(CONVOCATION_LABELS.J).toBe('Convocado');
    expect(CONVOCATION_LABELS.X).toBe('No convocado');
  });

  it('mapea correctamente los orígenes de los minutos con auditoría', () => {
    expect(MINUTES_SOURCE_LABELS.direct).toBe('directo');
    expect(MINUTES_SOURCE_LABELS.manual).toBe('manual');
    expect(MINUTES_SOURCE_LABELS.estimated).toBe('estimado');
  });
});

describe('Sistema de permisos granulares por usuario y equipo', () => {
  const adminUser: UserProfile = {
    id: 'user-coach-1',
    email: 'entrenador@mareo.es',
    name: 'Entrenador Principal',
    role: 'admin',
    status: 'active',
    teamIds: ['team-prec', 'team-deba'],
  };

  const delegateUser: UserProfile = {
    id: 'user-delegate-1',
    email: 'delegado@mareo.es',
    name: 'Delegado de Campo',
    role: 'delegate',
    status: 'active',
    teamIds: ['team-prec'],
    permissionsByTeam: {
      'team-prec': {
        pass_attendance: true,
        edit_convocatoria: true,
        control_match: true,
        add_notes: true,
        edit_past_data: false,
        download_pdf: false,
        view_stats: false,
      },
    },
  };

  it('el administrador tiene siempre todos los permisos en todos sus equipos', () => {
    expect(hasPermission(adminUser, 'team-prec', 'pass_attendance')).toBe(true);
    expect(hasPermission(adminUser, 'team-prec', 'edit_past_data')).toBe(true);
    expect(hasPermission(adminUser, 'team-prec', 'download_pdf')).toBe(true);
    expect(hasPermission(adminUser, 'team-prec', 'view_stats')).toBe(true);
    expect(() => assertPermission(adminUser, 'team-prec', 'edit_past_data')).not.toThrow();
  });

  it('el delegado por defecto puede pasar lista, controlar partido y notas', () => {
    expect(hasPermission(delegateUser, 'team-prec', 'pass_attendance')).toBe(true);
    expect(hasPermission(delegateUser, 'team-prec', 'control_match')).toBe(true);
    expect(hasPermission(delegateUser, 'team-prec', 'add_notes')).toBe(true);
    expect(hasPermission(delegateUser, 'team-prec', 'edit_convocatoria')).toBe(true);
  });

  it('el delegado por defecto NO puede editar datos pasados, descargar PDF ni ver estadísticas avanzadas', () => {
    expect(hasPermission(delegateUser, 'team-prec', 'edit_past_data')).toBe(false);
    expect(hasPermission(delegateUser, 'team-prec', 'download_pdf')).toBe(false);
    expect(hasPermission(delegateUser, 'team-prec', 'view_stats')).toBe(false);

    // assertPermission debe lanzar excepción explicativa
    expect(() =>
      assertPermission(delegateUser, 'team-prec', 'edit_past_data', 'modificar actas pasadas')
    ).toThrowError(/Acceso denegado/);
    expect(() =>
      assertPermission(delegateUser, 'team-prec', 'download_pdf', 'descargar informes')
    ).toThrowError(/Acceso denegado/);
  });

  it('un delegado no tiene permisos en equipos a los que no está asignado', () => {
    expect(hasPermission(delegateUser, 'team-deba', 'pass_attendance')).toBe(false);
    expect(() => assertPermission(delegateUser, 'team-deba', 'pass_attendance')).toThrow();
  });

  it('un usuario desactivado es rechazado en todas las operaciones', () => {
    const disabledUser: UserProfile = {
      ...delegateUser,
      status: 'disabled',
    };
    expect(hasPermission(disabledUser, 'team-prec', 'pass_attendance')).toBe(false);
    expect(() => assertPermission(disabledUser, 'team-prec', 'pass_attendance')).toThrow();
  });

  it('cuando el admin activa un permiso específico para un equipo, el delegado puede operar', () => {
    const updatedDelegate: UserProfile = {
      ...delegateUser,
      permissionsByTeam: {
        'team-prec': {
          ...delegateUser.permissionsByTeam!['team-prec'],
          download_pdf: true,
          view_stats: true,
        },
      },
    };

    expect(hasPermission(updatedDelegate, 'team-prec', 'download_pdf')).toBe(true);
    expect(hasPermission(updatedDelegate, 'team-prec', 'view_stats')).toBe(true);
    expect(() => assertPermission(updatedDelegate, 'team-prec', 'download_pdf')).not.toThrow();
  });
});
