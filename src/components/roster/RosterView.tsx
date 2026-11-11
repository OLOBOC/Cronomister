'use client';

import React, { useState } from 'react';
import { Player, Team, UserProfile, Match, AttendanceRecord } from '@/types';
import { Plus, Upload, User, Trash2, ChevronRight, Search, Pencil } from 'lucide-react';
import { AddPlayerModal } from './AddPlayerModal';
import { CsvImportModal } from './CsvImportModal';
import { EditPlayerModal } from './EditPlayerModal';
import { deletePlayer } from '@/lib/storage';
import { calculatePlayerKPIs } from '@/lib/minuteEngine';

interface RosterViewProps {
  team: Team;
  players: Player[];
  matches: Match[];
  attendance: AttendanceRecord[];
  currentUser: UserProfile;
  onSelectPlayer: (player: Player) => void;
  onRefresh: () => void;
}

export function RosterView({
  team,
  players,
  matches,
  attendance,
  currentUser,
  onSelectPlayer,
  onRefresh,
}: RosterViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [search, setSearch] = useState('');
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const totalDuration = team.settings.halfDurationMinutes * 2;

  const filteredPlayers = players.filter((p) => {
    const query = search.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(query) ||
      (p.dorsal !== null && String(p.dorsal).includes(query)) ||
      (p.position && p.position.toLowerCase().includes(query))
    );
  });

  const handleDelete = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    if (!isAdmin) return;

    if (playerToDelete === playerId) {
      deletePlayer(playerId);
      setPlayerToDelete(null);
      onRefresh();
    } else {
      setPlayerToDelete(playerId);
      setTimeout(() => setPlayerToDelete(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Plantilla ({players.length})</h2>
          <p className="text-xs text-[var(--mute)]">
            Toca un jugador para ver su ficha técnica e informe PDF
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--mute)] text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span> CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[var(--red)] hover:bg-[var(--red-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Buscador rápido */}
      {players.length > 5 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--mute)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, dorsal o puesto..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--card)] text-xs font-medium"
          />
        </div>
      )}

      {/* Lista de Jugadores */}
      <div className="space-y-2">
        {filteredPlayers.length === 0 ? (
          <div className="p-8 text-center bg-[var(--card)] rounded-2xl border border-[var(--line)]">
            <User className="w-10 h-10 text-[var(--mute)] mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm">No hay jugadores en la plantilla</p>
            <p className="text-xs text-[var(--mute)] mt-1">
              {search ? 'No se encontraron resultados para la búsqueda.' : 'Añade tu primer jugador o importa la lista por CSV.'}
            </p>
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const playerAtt = attendance.filter((a) => a.playerId === player.id);
            const kpis = calculatePlayerKPIs(
              player.id,
              matches.map((m) => ({ id: m.id, date: m.date, records: m.records, isFinished: m.status === 'finished' })),
              playerAtt,
              totalDuration
            );

            const isPendingDelete = playerToDelete === player.id;

            return (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player)}
                className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:border-[var(--red)]/50 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center font-extrabold text-sm shrink-0">
                    {player.dorsal !== null ? player.dorsal : '—'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm tracking-tight truncate">
                        {player.fullName}
                      </span>
                      {player.note && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {player.note}
                        </span>
                      )}
                      {player.linkedPlayerId && !player.note && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {team.id === 'team-deba' ? 'Pre C' : 'Debutantes A'}
                        </span>
                      )}
                      {team.settings.showPositions && player.position && (
                        <span className="text-[11px] font-semibold text-[var(--mute)] bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--line)]">
                          {player.position}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--mute)] mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-[var(--ink)]">
                        {kpis.totalMinutes} min ({kpis.matchesAttended} partidos)
                      </span>
                      <span>·</span>
                      <span>
                        {kpis.attendanceCount.totalSessions > 0
                          ? `${Math.round(kpis.attendancePercent * 100)}% asist.`
                          : 'Sin entrenos'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayerToEdit(player);
                        }}
                        className="p-2 rounded-lg text-xs font-bold text-[var(--mute)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        title="Editar datos del jugador"
                        aria-label="Editar jugador"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, player.id)}
                        className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                          isPendingDelete
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'text-[var(--mute)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                        title={isPendingDelete ? 'Toca de nuevo para confirmar eliminación' : 'Eliminar jugador'}
                        aria-label="Eliminar jugador"
                      >
                        {isPendingDelete ? 'Confirmar' : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-[var(--mute)]" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modales */}
      <AddPlayerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        team={team}
        onPlayerAdded={onRefresh}
      />
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        team={team}
        onImportComplete={onRefresh}
      />
      {playerToEdit && (
        <EditPlayerModal
          isOpen={Boolean(playerToEdit)}
          onClose={() => setPlayerToEdit(null)}
          player={playerToEdit}
          team={team}
          onSaved={() => {
            onRefresh();
            setPlayerToEdit(null);
          }}
          onDeleted={() => {
            onRefresh();
            setPlayerToEdit(null);
          }}
        />
      )}
    </div>
  );
}
