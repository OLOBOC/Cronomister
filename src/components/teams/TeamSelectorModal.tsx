'use client';

import React from 'react';
import { Team, UserProfile } from '@/types';
import { X, Check, AlertTriangle, Shield, UserCheck } from 'lucide-react';

interface TeamSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  currentTeamId: string;
  onSelectTeam: (teamId: string) => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onOpenSettings: (teamId: string) => void;
}

export function TeamSelectorModal({
  isOpen,
  onClose,
  teams,
  currentTeamId,
  onSelectTeam,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenSettings,
}: TeamSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-[var(--line)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Seleccionar equipo</h2>
            <p className="text-xs text-[var(--mute)]">Equipos asignados a tu cuenta</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de equipos */}
        <div className="space-y-3 mb-6">
          {teams.map((team) => {
            const isSelected = team.id === currentTeamId;
            const isNotConfigured = !team.settings.isConfigured;

            return (
              <div
                key={team.id}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--red)] bg-[var(--red)]/5'
                    : 'border-[var(--line)] hover:border-[var(--mute)] bg-[var(--card)]'
                }`}
                onClick={() => {
                  onSelectTeam(team.id);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{team.name}</span>
                      {isSelected && (
                        <span className="bg-[var(--red)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--mute)] mt-0.5">
                      {team.settings.playersOnPitch} en pista · {team.settings.halfDurationMinutes} min/parte ·{' '}
                      {team.settings.showPositions ? 'Con puestos' : 'Sin puestos'}
                    </p>
                  </div>
                </div>

                {isNotConfigured && (
                  <div className="mt-2.5 p-2 rounded-lg bg-[var(--warnbg)] text-[var(--warn)] text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Configuración pendiente (valores por defecto)</span>
                    </div>
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTeam(team.id);
                          onClose();
                          onOpenSettings(team.id);
                        }}
                        className="underline font-bold text-xs shrink-0 hover:opacity-80"
                      >
                        Ajustar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selector de Usuario / Rol para pruebas y control */}
        <div className="pt-4 border-t border-[var(--line)]">
          <div className="text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Cambiar perfil de usuario (Simulación)
          </div>
          <div className="grid grid-cols-1 gap-2">
            {allUsers.map((u) => {
              const isCurrent = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => onSwitchUser(u.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition-all text-xs ${
                    isCurrent
                      ? 'border-[var(--gold)] bg-[var(--warnbg)]/30 font-bold'
                      : 'border-[var(--line)] hover:bg-[var(--line)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {u.role === 'admin' ? (
                      <Shield className="w-4 h-4 text-[var(--red)]" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    )}
                    <div>
                      <div>{u.name}</div>
                      <div className="text-[11px] text-[var(--mute)] font-normal">{u.email}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'admin'
                        ? 'bg-[var(--red)] text-white'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    }`}
                  >
                    {u.role === 'admin' ? 'Entrenador' : 'Delegado'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
