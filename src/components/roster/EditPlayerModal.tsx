'use client';

import React, { useState } from 'react';
import { Player, Team } from '@/types';
import { X, Save, Trash2, User } from 'lucide-react';
import { updatePlayer, deletePlayer } from '@/lib/storage';

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  team: Team;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function EditPlayerModal({
  isOpen,
  onClose,
  player,
  team,
  onSaved,
  onDeleted,
}: EditPlayerModalProps) {
  const [fullName, setFullName] = useState(player.fullName);
  const [dorsal, setDorsal] = useState<string>(
    player.dorsal !== null && player.dorsal !== undefined ? String(player.dorsal) : ''
  );
  const [position, setPosition] = useState(player.position || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('El nombre completo es obligatorio.');
      return;
    }

    const trimmedFullName = fullName.trim();
    const firstName = trimmedFullName.split(' ')[0] || trimmedFullName;

    try {
      updatePlayer(player.id, {
        firstName,
        fullName: trimmedFullName,
        dorsal: dorsal.trim() !== '' ? Number(dorsal) : null,
        position: team.settings.showPositions && position.trim() ? position.trim() : undefined,
      });

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los datos del jugador');
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }

    try {
      deletePlayer(player.id);
      if (onDeleted) onDeleted();
      else onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el jugador');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-[var(--line)] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--red)]/10 text-[var(--red)] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Editar jugador</h2>
              <p className="text-xs text-[var(--mute)]">Categoría: {team.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)]"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Nombre completo */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
              Nombre y apellidos
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Pelayo Álvarez García"
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
            />
          </div>

          {/* Dorsal */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
              Dorsal (opcional)
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={dorsal}
              onChange={(e) => setDorsal(e.target.value)}
              placeholder="Ej. 10"
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
            />
          </div>

          {/* Posición */}
          {team.settings.showPositions && (
            <div>
              <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
                Posición habitual (opcional)
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ej. Portero, Defensa, Centrocampista..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
              />
            </div>
          )}

          {/* Acciones */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                confirmDelete
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmDelete ? '¿Confirmar borrado?' : 'Borrar jugador'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-[var(--line)] text-xs font-bold hover:bg-[var(--line)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--red)] hover:bg-[var(--red-hover)] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
