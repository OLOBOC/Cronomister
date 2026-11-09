'use client';

import React, { useState, useEffect } from 'react';
import {
  initStore,
  subscribeToStore,
  getCurrentTeam,
  getCurrentUser,
  getUsers,
  getAvailableTeamsForCurrentUser,
  setCurrentTeamId,
  getPlayers,
  getMatches,
  getSessions,
  getAttendance,
  getNotes,
  logoutUser,
  isAuthenticated,
} from '@/lib/storage';
import { Team, Player, Match, TrainingSession, AttendanceRecord, AppNote, UserProfile } from '@/types';
import { Header } from '@/components/layout/Header';
import { TeamSelectorModal } from '@/components/teams/TeamSelectorModal';
import { TeamSettingsModal } from '@/components/teams/TeamSettingsModal';
import { AdminPanelModal } from '@/components/admin/AdminPanelModal';
import { LoginView } from '@/components/auth/LoginView';
import { TeamSummaryView } from '@/components/summary/TeamSummaryView';
import { TrainingView } from '@/components/training/TrainingView';
import { MatchListView } from '@/components/matches/MatchListView';
import { MatchDetailView } from '@/components/matches/MatchDetailView';
import { MatchLiveView } from '@/components/matches/MatchLiveView';
import { RosterView } from '@/components/roster/RosterView';
import { PlayerFichaView } from '@/components/player-profile/PlayerFichaView';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Estados principales de navegación
  const [currentTab, setCurrentTab] = useState<'resumen' | 'entreno' | 'partidos' | 'jugadores'>('resumen');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeLiveMatch, setActiveLiveMatch] = useState<Match | null>(null);

  // Modales
  const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Datos reactivos del Store
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsersState] = useState<UserProfile[]>([]);
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
  const [availableTeams, setAvailableTeamsState] = useState<Team[]>([]);
  const [players, setPlayersState] = useState<Player[]>([]);
  const [matches, setMatchesState] = useState<Match[]>([]);
  const [sessions, setSessionsState] = useState<TrainingSession[]>([]);
  const [attendance, setAttendanceState] = useState<AttendanceRecord[]>([]);
  const [notes, setNotesState] = useState<AppNote[]>([]);

  // Sincronización de datos
  const syncDataFromStore = () => {
    const user = getCurrentUser();
    const team = getCurrentTeam();
    setCurrentUserState(user);
    setAllUsersState(getUsers());
    setCurrentTeamState(team);
    setAvailableTeamsState(getAvailableTeamsForCurrentUser());

    if (team) {
      setPlayersState(getPlayers(team.id));
      setMatchesState(getMatches(team.id));
      setSessionsState(getSessions(team.id));
      setAttendanceState(getAttendance(team.id));
      setNotesState(getNotes());
    }
  };

  useEffect(() => {
    setIsClient(true);
    initStore();
    const authStatus = isAuthenticated();
    setIsLoggedIn(authStatus);
    syncDataFromStore();

    const unsubscribe = subscribeToStore(() => {
      syncDataFromStore();
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUserState(user);
    setIsLoggedIn(true);
    syncDataFromStore();
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setCurrentUserState(null);
    setSelectedPlayer(null);
    setSelectedMatch(null);
    setActiveLiveMatch(null);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--mute)] text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-[var(--red)] border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando Cronomister Mareo...</span>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de inicio de sesión real (sin registro público)
  if (!isLoggedIn || !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (!currentTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--mute)] text-sm p-4 text-center">
        <div className="space-y-3">
          <p className="font-bold text-base text-[var(--ink)]">No tienes ningún equipo asignado actualmente.</p>
          <p className="text-xs">Contacta con el Entrenador Principal de Mareo para que te asigne a un equipo.</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-[var(--red)] text-white text-xs font-bold rounded-xl"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // Manejador de cambio de equipo
  const handleSelectTeam = (teamId: string) => {
    setCurrentTeamId(teamId);
    setSelectedPlayer(null);
    setSelectedMatch(null);
    setActiveLiveMatch(null);
    syncDataFromStore();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      {/* Cabecera unificada con acceso directo a Admin Panel para el entrenador */}
      <Header
        currentTeam={currentTeam}
        currentUser={currentUser}
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSelectedPlayer(null);
          setSelectedMatch(null);
          setActiveLiveMatch(null);
        }}
        onOpenTeamSelector={() => setIsTeamSelectorOpen(true)}
        onOpenTeamSettings={() => setIsTeamSettingsOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onLogout={handleLogout}
      />

      {/* Contenedor Principal Responsive (Mobile First, Max-W-2xl centrado en escritorio) */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        {/* Vista de Cronómetro en Vivo a pantalla completa */}
        {activeLiveMatch ? (
          <MatchLiveView
            match={activeLiveMatch}
            team={currentTeam}
            players={players}
            currentUser={currentUser}
            onExit={() => setActiveLiveMatch(null)}
            onFinishMatch={() => {
              setActiveLiveMatch(null);
              syncDataFromStore();
            }}
          />
        ) : selectedPlayer ? (
          /* Ficha de Jugador */
          <PlayerFichaView
            player={selectedPlayer}
            team={currentTeam}
            matches={matches}
            sessions={sessions}
            attendance={attendance}
            notes={notes}
            currentUser={currentUser}
            onBack={() => setSelectedPlayer(null)}
            onRefresh={syncDataFromStore}
          />
        ) : selectedMatch ? (
          /* Detalle de Partido */
          <MatchDetailView
            match={selectedMatch}
            team={currentTeam}
            players={players}
            onBack={() => setSelectedMatch(null)}
            onPlayLive={() => {
              setActiveLiveMatch(selectedMatch);
            }}
            onRefresh={syncDataFromStore}
          />
        ) : currentTab === 'resumen' ? (
          /* Pestaña RESUMEN */
          <TeamSummaryView
            team={currentTeam}
            players={players}
            matches={matches}
            attendance={attendance}
            currentUser={currentUser}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onSelectMatchForLive={(m) => setActiveLiveMatch(m)}
            onOpenSettings={() => setIsTeamSettingsOpen(true)}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        ) : currentTab === 'entreno' ? (
          /* Pestaña ENTRENO */
          <TrainingView team={currentTeam} players={players} />
        ) : currentTab === 'partidos' ? (
          /* Pestaña PARTIDOS */
          <MatchListView
            team={currentTeam}
            matches={matches}
            onSelectMatch={(m) => setSelectedMatch(m)}
            onRefresh={syncDataFromStore}
          />
        ) : (
          /* Pestaña JUGADORES */
          <RosterView
            team={currentTeam}
            players={players}
            matches={matches}
            attendance={attendance}
            currentUser={currentUser}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onRefresh={syncDataFromStore}
          />
        )}
      </main>

      {/* Modales de Gestión */}
      <TeamSelectorModal
        isOpen={isTeamSelectorOpen}
        onClose={() => setIsTeamSelectorOpen(false)}
        teams={availableTeams}
        currentTeamId={currentTeam.id}
        onSelectTeam={handleSelectTeam}
        currentUser={currentUser}
        allUsers={allUsers}
        onOpenSettings={() => setIsTeamSettingsOpen(true)}
        onLogout={handleLogout}
      />

      <TeamSettingsModal
        isOpen={isTeamSettingsOpen}
        onClose={() => setIsTeamSettingsOpen(false)}
        team={currentTeam}
        currentUser={currentUser}
      />

      {/* Panel de Administración exclusivo del Entrenador Principal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        currentUser={currentUser}
        teams={availableTeams}
        onRefresh={syncDataFromStore}
      />
    </div>
  );
}
