/**
 * Configuración global de la aplicación.
 * El nombre de la herramienta es configurable como constante.
 */
export const APP_CONFIG = {
  NAME: 'Cronomister',
  VERSION: '1.0.0-beta.2',
  SUBTITLE: 'Control de equipos y minutaje en tiempo real',
  CLUB_NAME: 'Escuela de Fútbol Mareo',
  SEASON: '2026/2027',
  DEFAULT_COLORS: {
    PRIMARY: '#c01c1c', // Rojo Mareo
    ACCENT: '#f2b705',  // Dorado
    DARK_BG: '#10141f',
    LIGHT_BG: '#f4f5f9',
  },
  DEFAULT_TEAM_SETTINGS: {
    PLAYERS_ON_PITCH: 5,
    HALF_DURATION_MINUTES: 25,
    TRAINING_DAYS: [2, 4], // 2 = Martes, 4 = Jueves
  },
} as const;
