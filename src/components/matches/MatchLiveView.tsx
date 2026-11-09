'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Match, Team, Player, UserProfile, MatchEvent, MatchPlayerRecord } from '@/types';
import {
  Play,
  Pause,
  ArrowRightLeft,
  Lock,
  Check,
  ChevronLeft,
  FastForward,
  Trophy,
} from 'lucide-react';
import {
  acquireMatchLock,
  releaseMatchLock,
  appendMatchEvent,
  getMatchEvents,
  updateMatch,
} from '@/lib/storage';
import { calculateMinutesFromEvents } from '@/lib/minuteEngine';

interface MatchLiveViewProps {
  match: Match;
  team: Team;
  players: Player[];
  currentUser: UserProfile;
  onExit: () => void;
  onFinishMatch: () => void;
}

export function MatchLiveView({
  match,
  team,
  players,
  currentUser,
  onExit,
  onFinishMatch,
}: MatchLiveViewProps) {
  const pitchCapacity = team.settings.playersOnPitch;
  const halfSeconds = team.settings.halfDurationMinutes * 60;
  const totalMatchSeconds = halfSeconds * 2;

  // Estado previo (setup) vs juego (live)
  const [phase, setPhase] = useState<'setup' | 'live' | 'break' | 'finished'>('setup');
  const [starters, setStarters] = useState<string[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [uncalled, setUncalled] = useState<string[]>([]);

  // Control de bloqueo (Match Lock)
  const [hasLock, setHasLock] = useState(false);
  const [lockHolder, setLockHolder] = useState<string | null>(null);

  // Reloj y eventos
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<1 | 2>(1);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [matchSecond, setMatchSecond] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Marcador
  const [scoreMareo, setScoreMareo] = useState(match.scoreMareo ?? 0);
  const [scoreRival, setScoreRival] = useState(match.scoreRival ?? 0);

  // Selección para sustitución en 2 toques
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState<string | null>(null);

  // Modal para asignar goleador
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Logs visuales
  const [eventLog, setEventLog] = useState<string[]>([]);

  // Referencias para el temporizador resistente a suspensión / apagado de pantalla
  const lastTickTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Inicialización de Convocatoria y Titulares
  useEffect(() => {
    // Si ya hay registros previos o eventos
    const loadedEvents = getMatchEvents(match.id);
    setEvents(loadedEvents);

    if (loadedEvents.length > 0) {
      // Identificar jugadores en pista a partir de eventos
      const calc = calculateMinutesFromEvents(loadedEvents, []);
      setMatchSecond(calc.currentMatchSecond);
      setIsClockRunning(calc.isClockRunning);

      const onPitch = Array.from(calc.activeOnPitch);
      setStarters(onPitch);
      setBench(players.filter((p) => !onPitch.includes(p.id)).map((p) => p.id));
      setPhase(calc.currentMatchSecond >= halfSeconds && calc.currentMatchSecond < totalMatchSeconds ? 'break' : 'live');
    } else {
      // Setup inicial: primeros N jugadores como titulares por defecto
      const initialStarters = players.slice(0, pitchCapacity).map((p) => p.id);
      const initialBench = players.slice(pitchCapacity).map((p) => p.id);
      setStarters(initialStarters);
      setBench(initialBench);
      setUncalled([]);
    }

    // Intentar adquirir el bloqueo de partido
    tryAcquireLock();

    // Heartbeat para renovar el bloqueo cada 15 segundos
    const heartbeat = setInterval(() => {
      tryAcquireLock();
    }, 15000);

    return () => {
      clearInterval(heartbeat);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [match.id]);

  const tryAcquireLock = () => {
    const res = acquireMatchLock(match.id);
    if (res.success) {
      setHasLock(true);
      setLockHolder(null);
    } else {
      setHasLock(false);
      setLockHolder(res.holderName || 'otro usuario');
    }
  };

  const handleForceTakeControl = () => {
    if (currentUser.role === 'admin') {
      acquireMatchLock(match.id);
      setHasLock(true);
      setLockHolder(null);
    }
  };

  // Formateador MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 2. Loop del cronómetro con compensación de Date.now() para sobrevivir a bloqueo de pantalla
  useEffect(() => {
    if (isClockRunning && hasLock) {
      lastTickTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const deltaRealSeconds = ((now - lastTickTimeRef.current) / 1000) * speedMultiplier;
        lastTickTimeRef.current = now;

        setMatchSecond((prev) => {
          const limit = currentPeriod === 1 ? halfSeconds : totalMatchSeconds;
          const next = Math.min(limit, prev + deltaRealSeconds);

          // Si llega al final de la parte
          if (next >= limit) {
            if (currentPeriod === 1) {
              handleHalfEnd(limit);
            } else {
              handleMatchTimeFinished(limit);
            }
          }
          return next;
        });
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isClockRunning, currentPeriod, speedMultiplier, hasLock]);

  // Manejadores de Setup
  const toggleStarter = (playerId: string) => {
    if (starters.includes(playerId)) {
      setStarters(starters.filter((id) => id !== playerId));
      setBench([...bench, playerId]);
    } else {
      if (starters.length >= pitchCapacity) {
        alert(`Solo puede haber ${pitchCapacity} jugadores titulares en pista.`);
        return;
      }
      setBench(bench.filter((id) => id !== playerId));
      setStarters([...starters, playerId]);
    }
  };

  const handleStartMatch = () => {
    if (starters.length !== pitchCapacity) {
      alert(`Debes seleccionar exactamente ${pitchCapacity} jugadores titulares.`);
      return;
    }

    const ev = appendMatchEvent({
      matchId: match.id,
      period: 1,
      type: 'MATCH_START',
      matchSecond: 0,
      comment: 'Inicio del partido',
    });

    setEvents((prev) => [...prev, ev]);
    setIsClockRunning(true);
    setPhase('live');
    addLog('00:00 · Comienza el partido');
  };

  const handleToggleClock = () => {
    if (!hasLock) return;

    if (isClockRunning) {
      // Pausa
      const ev = appendMatchEvent({
        matchId: match.id,
        period: currentPeriod,
        type: 'CLOCK_PAUSE',
        matchSecond: Math.floor(matchSecond),
        comment: 'Pausa del cronómetro',
      });
      setEvents((prev) => [...prev, ev]);
      setIsClockRunning(false);
      addLog(`${formatTime(matchSecond)} · Reloj pausado`);
    } else {
      // Reanudación
      const ev = appendMatchEvent({
        matchId: match.id,
        period: currentPeriod,
        type: 'CLOCK_RESUME',
        matchSecond: Math.floor(matchSecond),
        comment: 'Reanudación del cronómetro',
      });
      setEvents((prev) => [...prev, ev]);
      setIsClockRunning(true);
      addLog(`${formatTime(matchSecond)} · Reloj en marcha`);
    }
  };

  const handleHalfEnd = (sec: number) => {
    setIsClockRunning(false);
    setPhase('break');
    const ev = appendMatchEvent({
      matchId: match.id,
      period: 1,
      type: 'HALF_END',
      matchSecond: sec,
      comment: 'Fin de la 1ª parte',
    });
    setEvents((prev) => [...prev, ev]);
    addLog(`${formatTime(sec)} · Descanso (Fin 1ª parte)`);
  };

  const handleStartSecondHalf = () => {
    setCurrentPeriod(2);
    setPhase('live');
    setIsClockRunning(true);
    const ev = appendMatchEvent({
      matchId: match.id,
      period: 2,
      type: 'SECOND_HALF_START',
      matchSecond: halfSeconds,
      comment: 'Inicio de la 2ª parte',
    });
    setEvents((prev) => [...prev, ev]);
    addLog(`${formatTime(halfSeconds)} · Comienza la 2ª parte`);
  };

  const handleMatchTimeFinished = (sec: number) => {
    setIsClockRunning(false);
    setPhase('finished');
    const ev = appendMatchEvent({
      matchId: match.id,
      period: 2,
      type: 'MATCH_END',
      matchSecond: sec,
      comment: 'Fin reglamentario del partido',
    });
    setEvents((prev) => [...prev, ev]);
    addLog(`${formatTime(sec)} · Fin del partido`);
  };

  // Sustitución en 2 toques:
  // 1. Tocar al jugador en pista
  // 2. Tocar al jugador del banquillo
  const handlePitchPlayerTap = (playerId: string) => {
    if (!hasLock) return;
    if (phase === 'break') {
      alert('Los cambios durante el descanso se aplican al reanudar o ajustando la alineación.');
      return;
    }

    if (selectedPitchPlayerId === playerId) {
      setSelectedPitchPlayerId(null);
    } else {
      setSelectedPitchPlayerId(playerId);
    }
  };

  const handleBenchPlayerTap = (benchPlayerId: string) => {
    if (!hasLock) return;
    if (!selectedPitchPlayerId) {
      alert('Toca primero al jugador de la pista que va a salir.');
      return;
    }

    const outPlayer = players.find((p) => p.id === selectedPitchPlayerId);
    const inPlayer = players.find((p) => p.id === benchPlayerId);

    const currentSec = Math.floor(matchSecond);

    const ev = appendMatchEvent({
      matchId: match.id,
      period: currentPeriod,
      type: 'SUBSTITUTION',
      playerOutId: selectedPitchPlayerId,
      playerInId: benchPlayerId,
      matchSecond: currentSec,
      comment: `Sale ${outPlayer?.firstName}, entra ${inPlayer?.firstName}`,
    });

    setEvents((prev) => [...prev, ev]);

    // Actualizar listas de pista y banquillo
    setStarters((prev) => prev.map((id) => (id === selectedPitchPlayerId ? benchPlayerId : id)));
    setBench((prev) => prev.map((id) => (id === benchPlayerId ? selectedPitchPlayerId : id)));

    addLog(`${formatTime(currentSec)} · Cambio: Sale ${outPlayer?.firstName}, entra ${inPlayer?.firstName}`);
    setSelectedPitchPlayerId(null);
  };

  // Gestión de goles
  const handleGoal = (side: 'mareo' | 'rival') => {
    if (!hasLock) return;
    if (side === 'mareo') {
      setIsGoalModalOpen(true);
    } else {
      // Gol rival directo
      setScoreRival((prev) => prev + 1);
      const ev = appendMatchEvent({
        matchId: match.id,
        period: currentPeriod,
        type: 'GOAL_RIVAL',
        matchSecond: Math.floor(matchSecond),
        comment: 'Gol del rival',
      });
      setEvents((prev) => [...prev, ev]);
      addLog(`${formatTime(matchSecond)} · Gol del rival (${scoreMareo} - ${scoreRival + 1})`);
    }
  };

  const handleConfirmMareoGoal = (scorerId?: string) => {
    setScoreMareo((prev) => prev + 1);
    const scorer = players.find((p) => p.id === scorerId);

    const ev = appendMatchEvent({
      matchId: match.id,
      period: currentPeriod,
      type: 'GOAL_MAREO',
      goalPlayerId: scorerId,
      matchSecond: Math.floor(matchSecond),
      comment: scorer ? `Gol de ${scorer.fullName}` : 'Gol de Mareo',
    });

    setEvents((prev) => [...prev, ev]);
    addLog(
      `${formatTime(matchSecond)} · Gol de Mareo! ${scorer ? scorer.firstName : ''} (${scoreMareo + 1} - ${scoreRival})`
    );
    setIsGoalModalOpen(false);
  };

  const addLog = (msg: string) => {
    setEventLog((prev) => [msg, ...prev.slice(0, 15)]);
  };

  // Guardar partido finalizado
  const handleFinishAndSave = () => {
    // 1. Asegurar evento MATCH_END
    const calc = calculateMinutesFromEvents(
      events,
      // Jugadores que empezaron como titulares en MATCH_START
      events.length > 0 && events[0].type === 'MATCH_START' ? starters : []
    );

    // 2. Construir records con origen 'direct'
    const finalRecords: Record<string, MatchPlayerRecord> = {};
    players.forEach((p) => {
      const isCalled = !uncalled.includes(p.id);
      if (isCalled) {
        const mins = calc.playerMinutes[p.id] || 0;
        finalRecords[p.id] = {
          playerId: p.id,
          status: 'J',
          isStarter: starters.includes(p.id),
          minutes: mins,
          source: 'direct', // Origen directo de cronómetro
        };
      } else {
        finalRecords[p.id] = {
          playerId: p.id,
          status: 'X',
          isStarter: false,
          minutes: 0,
          source: 'direct',
        };
      }
    });

    updateMatch(match.id, {
      scoreMareo,
      scoreRival,
      status: 'finished',
      records: finalRecords,
    });

    releaseMatchLock(match.id);
    onFinishMatch();
  };

  // Cálculo en vivo de minutos acumulados por jugador
  const liveMinutesCalc = calculateMinutesFromEvents(events, starters);

  // --- RENDER VISTA DE SETUP (PREVIA AL PARTIDO) ---
  if (phase === 'setup') {
    return (
      <div className="space-y-4 animate-in fade-in">
        <button
          onClick={onExit}
          className="text-xs font-bold text-[var(--red)] flex items-center gap-1 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" /> Cancelar y volver
        </button>

        <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Convocatoria y Titulares
              </h2>
              <p className="text-xs text-[var(--mute)]">
                {match.matchType === 'tournament'
                  ? match.tournamentName || 'Torneo'
                  : match.matchType === 'friendly'
                  ? 'Amistoso'
                  : `Jornada ${match.round}`}{' '}
                · {match.isHome ? 'Mareo vs ' : ''}
                {match.rival}
                {!match.isHome ? ' vs Mareo' : ''}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                starters.length === pitchCapacity
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              Titulares: {starters.length} de {pitchCapacity}
            </span>
          </div>

          <p className="text-xs text-[var(--mute)] mb-4">
            Toca a los jugadores para designar los <b>{pitchCapacity} titulares</b> que comenzarán en pista.
          </p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {players.map((p) => {
              const isStarter = starters.includes(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => toggleStarter(p.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isStarter
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--mute)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[var(--bg)] font-bold text-xs flex items-center justify-center">
                      {p.dorsal ?? '—'}
                    </span>
                    <div>
                      <span className="font-bold text-sm block">{p.fullName}</span>
                      {team.settings.showPositions && p.position && (
                        <span className="text-[11px] text-[var(--mute)]">{p.position}</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      isStarter
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg)] text-[var(--mute)] border border-[var(--line)]'
                    }`}
                  >
                    {isStarter ? 'Titular en pista' : 'Banquillo'}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleStartMatch}
            disabled={starters.length !== pitchCapacity}
            className="w-full mt-4 py-3.5 bg-[var(--red)] disabled:opacity-40 hover:bg-[var(--red-hover)] text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Inicio del partido</span>
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER VISTA EN DIRECTO (LIVE STOPWATCH) ---
  const selectedPitchPlayer = players.find((p) => p.id === selectedPitchPlayerId);

  return (
    <div className="space-y-4 animate-in fade-in pb-12">
      {/* Aviso de Match Lock (si otro dispositivo tiene el mando) */}
      {!hasLock && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <b>Modo monitor:</b> El cronómetro está controlado por <b>{lockHolder}</b>.
            </span>
          </div>
          {currentUser.role === 'admin' && (
            <button
              onClick={handleForceTakeControl}
              className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg shrink-0 text-[11px]"
            >
              Forzar control
            </button>
          )}
        </div>
      )}

      {/* Tarjeta principal del Cronómetro y Marcador */}
      <div className="bg-[var(--card)] p-4 rounded-3xl border border-[var(--line)] shadow-lg text-center space-y-3">
        {/* Marcador */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex-1 text-right">
            <span className="text-xs font-bold text-[var(--mute)] block uppercase">Mareo</span>
            <span className="text-3xl font-black tracking-tight">{scoreMareo}</span>
          </div>
          <span className="text-xl font-bold text-[var(--mute)]">–</span>
          <div className="flex-1 text-left">
            <span className="text-xs font-bold text-[var(--mute)] block uppercase truncate">{match.rival}</span>
            <span className="text-3xl font-black tracking-tight">{scoreRival}</span>
          </div>
        </div>

        {/* Botones de Gol rápidos */}
        {hasLock && phase !== 'finished' && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => handleGoal('mareo')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs"
            >
              <Trophy className="w-3.5 h-3.5" /> + Gol Mareo
            </button>
            <button
              onClick={() => handleGoal('rival')}
              className="px-3 py-1.5 rounded-xl bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 font-extrabold text-xs shadow-xs"
            >
              + Gol Rival
            </button>
          </div>
        )}

        {/* Reloj Digital Grande */}
        <div className="py-2">
          <div className="tabular-clock text-6xl font-black tracking-tight text-[var(--ink)]">
            {formatTime(matchSecond)}
          </div>
          <div className="text-xs font-bold text-[var(--mute)] mt-1 uppercase tracking-wider">
            {phase === 'break'
              ? 'Descanso reglamentario'
              : phase === 'finished'
              ? 'Partido finalizado'
              : `${currentPeriod}ª Parte · ${isClockRunning ? 'En juego' : 'Parado'}`}
          </div>
        </div>

        {/* Controles de Cronómetro */}
        {hasLock && (
          <div className="flex items-center justify-center gap-2 pt-1">
            {phase === 'break' ? (
              <button
                onClick={handleStartSecondHalf}
                className="w-full py-3 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" /> Empezar 2ª parte
              </button>
            ) : phase === 'finished' ? (
              <button
                onClick={handleFinishAndSave}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Check className="w-5 h-5" /> Guardar y cerrar partido
              </button>
            ) : (
              <>
                <button
                  onClick={handleToggleClock}
                  className={`flex-1 py-3 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs ${
                    isClockRunning
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isClockRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" /> Pausar tiempo
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Reanudar tiempo
                    </>
                  )}
                </button>
                <button
                  onClick={handleFinishAndSave}
                  className="px-4 py-3 bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--mute)] text-[var(--ink)] font-bold text-xs rounded-xl"
                >
                  Terminar
                </button>
              </>
            )}
          </div>
        )}

        {/* Multiplicador de velocidad para pruebas */}
        <div className="pt-2 border-t border-[var(--line)]/50 flex items-center justify-center gap-2 text-xs text-[var(--mute)]">
          <span className="flex items-center gap-1 font-semibold">
            <FastForward className="w-3.5 h-3.5" /> Modo test:
          </span>
          {[1, 30, 120].map((s) => (
            <button
              key={s}
              onClick={() => setSpeedMultiplier(s)}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors ${
                speedMultiplier === s
                  ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                  : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
              }`}
            >
              x{s}
            </button>
          ))}
        </div>
      </div>

      {/* Banner de cambio activo (Toque 1 en pista) */}
      {selectedPitchPlayer && (
        <div className="p-3 rounded-2xl bg-[var(--warnbg)] border-2 border-[var(--gold)] text-xs flex items-center justify-between gap-2 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-bold text-[var(--warn)]">
            <ArrowRightLeft className="w-4 h-4 animate-spin-slow" />
            <span>
              Sale: <b>{selectedPitchPlayer.fullName}</b>. Toca al jugador del banquillo que entra.
            </span>
          </div>
          <button
            onClick={() => setSelectedPitchPlayerId(null)}
            className="px-2.5 py-1 bg-black/10 hover:bg-black/20 rounded-lg font-bold"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Sección EN PISTA */}
      <div>
        <div className="flex items-center justify-between text-xs text-[var(--mute)] px-1 mb-2">
          <span className="font-extrabold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            En Pista ({starters.length})
          </span>
          <span>Toca para sustituir</span>
        </div>

        <div className="space-y-2">
          {starters.map((playerId) => {
            const p = players.find((item) => item.id === playerId);
            if (!p) return null;

            const isSelected = selectedPitchPlayerId === playerId;
            const liveSec = liveMinutesCalc.playerSeconds[p.id] || 0;

            return (
              <button
                key={p.id}
                onClick={() => handlePitchPlayerTap(p.id)}
                className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition-all ${
                  isSelected
                    ? 'border-[var(--gold)] bg-[var(--warnbg)] shadow-md ring-2 ring-[var(--gold)]'
                    : 'border-emerald-500/60 bg-[var(--card)] hover:border-emerald-500 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                    {p.dorsal ?? '—'}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate">{p.fullName}</span>
                    {team.settings.showPositions && p.position && (
                      <span className="text-[11px] text-[var(--mute)]">{p.position}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="tabular-clock font-black text-sm text-emerald-700 dark:text-emerald-300">
                    {formatTime(liveSec)}
                  </span>
                  <span className="text-[10px] text-[var(--mute)] block">
                    ({Math.round(liveSec / 60)} min)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sección BANQUILLO */}
      <div>
        <div className="flex items-center justify-between text-xs text-[var(--mute)] px-1 mb-2">
          <span className="font-extrabold uppercase tracking-wider text-[var(--mute)]">
            Banquillo ({bench.length})
          </span>
          {selectedPitchPlayer && <span className="font-bold text-[var(--warn)]">Toca quien entra</span>}
        </div>

        <div className="space-y-2">
          {bench.map((playerId) => {
            const p = players.find((item) => item.id === playerId);
            if (!p) return null;

            const liveSec = liveMinutesCalc.playerSeconds[p.id] || 0;

            return (
              <button
                key={p.id}
                onClick={() => handleBenchPlayerTap(p.id)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                  selectedPitchPlayer
                    ? 'border-amber-400 bg-amber-500/5 hover:bg-amber-500/15 cursor-pointer animate-pulse'
                    : 'border-[var(--line)] bg-[var(--card)] opacity-90'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] font-bold text-xs flex items-center justify-center shrink-0">
                    {p.dorsal ?? '—'}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate">{p.fullName}</span>
                    {team.settings.showPositions && p.position && (
                      <span className="text-[11px] text-[var(--mute)]">{p.position}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="tabular-clock font-bold text-sm text-[var(--mute)]">
                    {formatTime(liveSec)}
                  </span>
                  <span className="text-[10px] text-[var(--mute)] block">
                    ({Math.round(liveSec / 60)} min)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registro de Últimos Movimientos */}
      {eventLog.length > 0 && (
        <div className="bg-[var(--card)] p-3.5 rounded-2xl border border-[var(--line)] shadow-xs">
          <span className="text-xs font-bold text-[var(--mute)] uppercase tracking-wider block mb-2">
            Registro en tiempo real
          </span>
          <div className="space-y-1 text-xs text-[var(--mute)] font-mono max-h-28 overflow-y-auto">
            {eventLog.map((log, idx) => (
              <div key={idx} className="truncate">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para asignar Goleador */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[var(--line)]">
            <h3 className="font-extrabold text-base mb-1">¡Gol de Mareo!</h3>
            <p className="text-xs text-[var(--mute)] mb-3">¿Quién marcó el gol? (Opcional)</p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-3">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleConfirmMareoGoal(p.id)}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-emerald-500 text-left text-xs font-bold flex items-center justify-between"
                >
                  <span>{p.fullName}</span>
                  {starters.includes(p.id) && (
                    <span className="text-[10px] text-emerald-600 font-semibold">En pista</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleConfirmMareoGoal(undefined)}
              className="w-full py-2 bg-[var(--ink)] text-[var(--bg)] rounded-xl text-xs font-bold hover:opacity-90"
            >
              Gol general sin asignar jugador
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
