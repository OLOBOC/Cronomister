'use client';

import React, { useState, useEffect } from 'react';
import { Team, UserProfile } from '@/types';
import { X, Save, ShieldAlert, UserPlus, Download, Check } from 'lucide-react';
import { updateTeamSettings, inviteDelegate, exportTeamData } from '@/lib/storage';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  currentUser: UserProfile;
}

export function TeamSettingsModal({ isOpen, onClose, team, currentUser }: TeamSettingsModalProps) {
  const isAdmin = currentUser.role === 'admin';

  const [playersOnPitch, setPlayersOnPitch] = useState(5);
  const [halfDuration, setHalfDuration] = useState(25);
  const [showPositions, setShowPositions] = useState(false);
  const [trainingDays, setTrainingDays] = useState<number[]>([2, 4]);

  // Invitación delegado
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateName, setDelegateName] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (team) {
      setPlayersOnPitch(team.settings.playersOnPitch);
      setHalfDuration(team.settings.halfDurationMinutes);
      setShowPositions(team.settings.showPositions);
      setTrainingDays(team.settings.trainingDays);
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const daysList = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
  ];

  const handleToggleDay = (dayId: number) => {
    if (!isAdmin) return;
    if (trainingDays.includes(dayId)) {
      setTrainingDays(trainingDays.filter((d) => d !== dayId));
    } else {
      setTrainingDays([...trainingDays, dayId].sort());
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    updateTeamSettings(team.id, {
      playersOnPitch,
      halfDurationMinutes: halfDuration,
      showPositions,
      trainingDays,
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleInviteDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !delegateEmail || !delegateName) return;

    inviteDelegate(team.id, delegateEmail, delegateName);
    setInviteSuccess(true);
    setDelegateEmail('');
    setDelegateName('');
    setTimeout(() => setInviteSuccess(false), 2500);
  };

  const handleExportData = () => {
    const jsonStr = exportTeamData(team.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datos_${team.name.replace(/\s+/g, '_')}_mareo.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-[var(--line)] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-sm border border-[var(--line)] flex items-center justify-center shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Cronomister" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Ajustes: {team.name}</h2>
              <p className="text-xs text-[var(--mute)]">Configuración técnica de partidos y entrenamientos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdmin && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Modo solo lectura: solo el Entrenador Principal (Admin) puede modificar los parámetros.</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                Jugadores en pista
              </label>
              <input
                type="number"
                min={2}
                max={11}
                disabled={!isAdmin}
                value={playersOnPitch}
                onChange={(e) => setPlayersOnPitch(Math.max(2, Math.min(11, Number(e.target.value) || 5)))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] font-semibold text-center focus:border-[var(--red)]"
              />
              <span className="text-[11px] text-[var(--mute)] mt-0.5 block">5 en fútbol sala / debutantes</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                Minutos por parte
              </label>
              <input
                type="number"
                min={5}
                max={45}
                disabled={!isAdmin}
                value={halfDuration}
                onChange={(e) => setHalfDuration(Math.max(5, Math.min(45, Number(e.target.value) || 25)))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] font-semibold text-center focus:border-[var(--red)]"
              />
              <span className="text-[11px] text-[var(--mute)] mt-0.5 block">Duración total: {halfDuration * 2} min</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)]/50">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-sm block">Mostrar puesto en plantilla</span>
                <span className="text-xs text-[var(--mute)]">
                  Activado para Pre C (PT, Cierre, Ala, Pívot); desactivado para Debutantes.
                </span>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={showPositions}
                onChange={(e) => setShowPositions(e.target.checked)}
                className="w-5 h-5 accent-[var(--red)] rounded cursor-pointer"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
              Días habituales de entrenamiento
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {daysList.map((d) => {
                const isSelected = trainingDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleToggleDay(d.id)}
                    className={`py-2 px-1 text-xs rounded-lg font-semibold border text-center transition-all ${
                      isSelected
                        ? 'bg-[var(--red)] text-white border-[var(--red)]'
                        : 'bg-[var(--card)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--mute)]'
                    }`}
                  >
                    {d.label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {isAdmin && (
            <button
              type="submit"
              className="w-full py-3 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Guardado correctamente
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Guardar ajustes del equipo
                </>
              )}
            </button>
          )}
        </form>

        {/* Sección Invitar Delegado (solo Admin) */}
        {isAdmin && (
          <div className="mt-6 pt-5 border-t border-[var(--line)]">
            <h3 className="text-sm font-bold tracking-tight mb-1 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[var(--red)]" /> Dar acceso a un delegado
            </h3>
            <p className="text-xs text-[var(--mute)] mb-3">
              Podrá pasar lista y controlar el partido, pero no borrar jugadores ni equipos.
            </p>

            <form onSubmit={handleInviteDelegate} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombre del delegado"
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
                  required
                />
                <input
                  type="email"
                  placeholder="Email del delegado"
                  value={delegateEmail}
                  onChange={(e) => setDelegateEmail(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[var(--ink)] text-[var(--bg)] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                {inviteSuccess ? '¡Invitación registrada!' : 'Crear acceso para el delegado'}
              </button>
            </form>
          </div>
        )}

        {/* Portabilidad y RGPD */}
        <div className="mt-5 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--mute)]">
          <span>Cumplimiento RGPD / LOPDGDD</span>
          <button
            onClick={handleExportData}
            className="flex items-center gap-1 text-[var(--red)] font-semibold hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Exportar datos (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
