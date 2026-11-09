'use client';

import React from 'react';
import { APP_CONFIG } from '@/config/appConfig';
import { Team, UserProfile } from '@/types';
import { Users, Settings, Shield, UserCheck, ShieldAlert, LogOut } from 'lucide-react';

interface HeaderProps {
  currentTeam: Team | null;
  currentUser: UserProfile;
  currentTab: 'resumen' | 'entreno' | 'partidos' | 'jugadores';
  onTabChange: (tab: 'resumen' | 'entreno' | 'partidos' | 'jugadores') => void;
  onOpenTeamSelector: () => void;
  onOpenTeamSettings: () => void;
  onOpenAdminPanel?: () => void;
  onLogout?: () => void;
}

export function Header({
  currentTeam,
  currentUser,
  currentTab,
  onTabChange,
  onOpenTeamSelector,
  onOpenTeamSettings,
  onOpenAdminPanel,
  onLogout,
}: HeaderProps) {
  const tabs = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'entreno', label: 'Entreno' },
    { key: 'partidos', label: 'Partidos' },
    { key: 'jugadores', label: 'Jugadores' },
  ] as const;

  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-[var(--red)] text-white shadow-md">
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-1">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-extrabold text-white text-base shrink-0">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-base tracking-tight truncate">
                  {currentTeam ? currentTeam.name : APP_CONFIG.NAME}
                </span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  {currentTeam ? 'Mareo' : APP_CONFIG.CLUB_NAME}
                </span>
              </div>
              <div className="text-[11px] text-white/80 flex items-center gap-1">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-200">
                    <Shield className="w-3 h-3" /> Entrenador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-white/90">
                    <UserCheck className="w-3 h-3" /> Delegado
                  </span>
                )}
                <span>· {currentUser.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botón directo de Panel Admin para el entrenador */}
            {isAdmin && onOpenAdminPanel && (
              <button
                onClick={onOpenAdminPanel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 text-black font-extrabold text-xs shadow-xs hover:bg-amber-300 transition-colors"
                title="Panel de Administración (Usuarios, Permisos y Auditoría)"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Ajustes de equipo (solo admin) */}
            {isAdmin && (
              <button
                onClick={onOpenTeamSettings}
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-white transition-colors"
                title="Ajustes de equipo"
                aria-label="Ajustes de equipo"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Selector de equipos asignados */}
            <button
              onClick={onOpenTeamSelector}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-xs font-semibold text-white transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Equipos</span>
            </button>

            {/* Cerrar sesión */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-white/15 hover:bg-rose-500/80 active:bg-rose-600 text-white transition-colors"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Barra de pestañas */}
        <nav className="flex gap-1 border-t border-white/15 pt-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex-1 py-2 text-sm font-semibold text-center border-b-[3px] transition-all ${
                  isActive
                    ? 'border-[var(--gold)] text-white opacity-100 font-bold'
                    : 'border-transparent text-white/75 hover:text-white hover:opacity-90'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
