'use client';

import React, { useState } from 'react';
import { Team } from '@/types';
import { X, UserPlus } from 'lucide-react';
import { addPlayer } from '@/lib/storage';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onPlayerAdded?: () => void;
}

export function AddPlayerModal({ isOpen, onClose, team, onPlayerAdded }: AddPlayerModalProps) {
  const [dorsal, setDorsal] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    const fullName = lastName.trim() ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim();

    addPlayer(
      {
        dorsal: dorsal ? parseInt(dorsal, 10) : null,
        firstName: firstName.trim(),
        fullName,
        position: team.settings.showPositions && position.trim() ? position.trim() : undefined,
        isActive: true,
      },
      team.id
    );

    setDorsal('');
    setFirstName('');
    setLastName('');
    setPosition('');

    if (onPlayerAdded) onPlayerAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-[var(--line)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Nuevo jugador</h2>
            <p className="text-xs text-[var(--mute)]">Añadir a la plantilla de {team.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                Dorsal
              </label>
              <input
                type="number"
                min={1}
                max={99}
                placeholder="Nº"
                value={dorsal}
                onChange={(e) => setDorsal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-bold text-center"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                Nombre
              </label>
              <input
                type="text"
                placeholder="Ej. Salvador"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
              Apellidos
            </label>
            <input
              type="text"
              placeholder="Ej. Milano"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-medium"
            />
          </div>

          {team.settings.showPositions && (
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                Puesto en el campo
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {['PT', 'Cierre', 'Ala', 'Pívot'].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosition(pos)}
                    className={`py-2 text-xs rounded-xl font-bold border transition-all ${
                      position === pos
                        ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                        : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)] hover:border-[var(--mute)]'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-3 py-3 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" /> Añadir a la plantilla
          </button>
        </form>
      </div>
    </div>
  );
}
