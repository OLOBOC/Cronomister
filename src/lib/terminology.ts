/**
 * Terminología centralizada de Cronomister.
 * Usar siempre estas constantes en lugar de strings literales en los componentes.
 */

import { AttendanceStatus, AttendanceReason, NonConvocationReason, MinutesSource } from '@/types';

// ── ASISTENCIA A ENTRENAMIENTOS ──────────────────────────────────────────────

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  S: 'Asistió',
  A: 'No asistió – avisó',
  N: 'No asistió – no avisó',
};

export const ATTENDANCE_SHORT_LABELS: Record<AttendanceStatus, string> = {
  S: 'Asistió',
  A: 'Falta avisada',
  N: 'Falta sin avisar',
};

export const ATTENDANCE_PILL_LABELS: Record<AttendanceStatus, string> = {
  S: 'Asistió',
  A: 'Avisó',
  N: 'Sin avisar',
};

// Colores Tailwind para cada estado de asistencia
export const ATTENDANCE_COLORS: Record<
  AttendanceStatus,
  { bg: string; text: string; border: string; activeBg: string; activeText: string; activeBorder: string }
> = {
  S: {
    bg: 'bg-emerald-100 dark:bg-emerald-950',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    activeBorder: 'border-emerald-600',
  },
  A: {
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    activeBg: 'bg-amber-500',
    activeText: 'text-white',
    activeBorder: 'border-amber-500',
  },
  N: {
    bg: 'bg-rose-100 dark:bg-rose-950',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800',
    activeBg: 'bg-rose-600',
    activeText: 'text-white',
    activeBorder: 'border-rose-600',
  },
};

// Motivos de falta (entrenamiento)
export const ABSENCE_REASON_OPTIONS: NonNullable<AttendanceReason>[] = [
  'Lesión',
  'Enfermedad',
  'Familiar',
  'Otros',
];

// ── CONVOCATORIA Y PARTIDO ───────────────────────────────────────────────────

export const CONVOCATION_LABELS: Record<'J' | 'X', string> = {
  J: 'Convocado',
  X: 'No convocado',
};

export const STARTER_LABEL = 'Titular';
export const BENCH_LABEL = 'Suplente';

// Motivos de no convocatoria
export const NON_CONVOCATION_REASON_OPTIONS: NonNullable<NonConvocationReason>[] = [
  'Decisión técnica',
  'Sanción',
  'Lesión',
  'Trámite de federación',
  'Otros',
];

export const MATCH_ABSENCE_LABELS: Record<'warned' | 'no-warning', string> = {
  warned: 'No asistió – avisó',
  'no-warning': 'No asistió – no avisó',
};

// ── ORIGEN DE MINUTOS ────────────────────────────────────────────────────────

export const MINUTES_SOURCE_LABELS: Record<MinutesSource, string> = {
  direct: 'directo',
  manual: 'manual',
  estimated: 'estimado',
};
