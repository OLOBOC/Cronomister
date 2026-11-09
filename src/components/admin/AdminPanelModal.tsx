'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, Team, ActivityLogEntry, PermissionKey } from '@/types';
import {
  X,
  Shield,
  UserCheck,
  UserPlus,
  Key,
  Calendar,
  Filter,
  Download,
  AlertCircle,
  RefreshCw,
  Power,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getUsers,
  getActivityLogs,
  inviteUser,
  toggleUserStatus,
  updateUserPermissions,
  updateUserTeams,
  resetUserPassword,
  saveCloudUserToStorage,
  fetchAndSyncUsersFromCloud,
} from '@/lib/storage';
import { PERMISSION_METADATA, DEFAULT_DELEGATE_PERMISSIONS } from '@/lib/permissions';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  teams: Team[];
  onRefresh: () => void;
}

export function AdminPanelModal({
  isOpen,
  onClose,
  currentUser,
  teams,
  onRefresh,
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  // Estado para gestión de usuarios
  const [users, setUsers] = useState<UserProfile[]>(() => getUsers());
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<string | null>(null);
  const [selectedTeamForPerms, setSelectedTeamForPerms] = useState<string>(teams[0]?.id || '');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteTeams, setInviteTeams] = useState<string[]>(teams.map((t) => t.id));
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  // Estado para auditoría
  const [logs, setLogs] = useState<ActivityLogEntry[]>(() => getActivityLogs());
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAndSyncUsersFromCloud().then(() => reloadData());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;
  if (currentUser.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="bg-[var(--card)] p-6 rounded-2xl border border-[var(--line)] text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-[var(--red)] mx-auto mb-2" />
          <h3 className="font-bold text-base">Acceso restringido</h3>
          <p className="text-xs text-[var(--mute)] mt-1 mb-4">
            Solo el entrenador principal (administrador) tiene acceso al panel de control de Mareo.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-[var(--red)] text-white font-bold rounded-xl text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const reloadData = () => {
    setUsers(getUsers());
    setLogs(
      getActivityLogs({
        userId: filterUser || undefined,
        teamId: filterTeam || undefined,
        date: filterDate || undefined,
      })
    );
    onRefresh();
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteFeedback(null);
    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          name: inviteName.trim(),
          role: 'delegate',
          teamIds: inviteTeams,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al invitar delegado');
      }

      saveCloudUserToStorage(data.user);
      setInviteFeedback(
        `✅ Delegado creado en la nube. Contraseña asignada: ${data.user.password}`
      );
      setInviteEmail('');
      setInviteName('');
      reloadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Error al invitar');
    }
  };

  const handleToggleStatus = (userId: string) => {
    if (confirm('¿Deseas cambiar el estado de acceso de este usuario?')) {
      toggleUserStatus(userId);
      reloadData();

      const all = getUsers();
      const targetUser = all.find((u) => u.id === userId);
      if (targetUser) {
        fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            updates: { status: targetUser.status },
          }),
        }).catch((err) => console.warn('Error syncing status to cloud:', err));
      }
    }
  };

  const handleResetPassword = (userId: string) => {
    const newPass = prompt('Introduce nueva contraseña provisional (o deja vacío para autogenerar):');
    if (newPass !== null) {
      const assigned = resetUserPassword(userId, newPass || undefined);
      reloadData();
      alert(`Acceso actualizado. Nueva contraseña: ${assigned}`);

      fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { password: assigned },
        }),
      }).catch((err) => console.warn('Error syncing password to cloud:', err));
    }
  };

  const handleTogglePermission = (
    userId: string,
    teamId: string,
    permKey: PermissionKey,
    currentValue: boolean
  ) => {
    updateUserPermissions(userId, teamId, { [permKey]: !currentValue });
    reloadData();

    const all = getUsers();
    const targetUser = all.find((u) => u.id === userId);
    if (targetUser) {
      fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { permissionsByTeam: targetUser.permissionsByTeam },
        }),
      }).catch((err) => console.warn('Error syncing permission to cloud:', err));
    }
  };

  const handleToggleTeamAssignment = (userId: string, teamId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    let newTeams: string[];
    if (targetUser.teamIds.includes(teamId)) {
      if (targetUser.teamIds.length <= 1) {
        alert('El usuario debe tener al menos un equipo asignado.');
        return;
      }
      newTeams = targetUser.teamIds.filter((id) => id !== teamId);
    } else {
      newTeams = [...targetUser.teamIds, teamId];
    }

    updateUserTeams(userId, newTeams);
    reloadData();

    fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        updates: { teamIds: newTeams },
      }),
    }).catch((err) => console.warn('Error syncing teams to cloud:', err));
  };

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_cronomister_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-3xl rounded-2xl shadow-2xl border border-[var(--line)] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera del Panel */}
        <div className="p-4 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-0.5 shadow-sm flex items-center justify-center shrink-0 border border-[var(--line)] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Cronomister" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base tracking-tight">Panel de Administración</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20">
                  Solo Entrenador Principal
                </span>
              </div>
              <p className="text-xs text-[var(--mute)]">
                Control de delegados, permisos por equipo y auditoría inmutable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas del Panel */}
        <div className="flex border-b border-[var(--line)] bg-[var(--card)] px-4 shrink-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-[var(--red)] text-[var(--red)]'
                : 'border-transparent text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Usuarios y Permisos ({users.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('audit');
              reloadData();
            }}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-[var(--red)] text-[var(--red)]'
                : 'border-transparent text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Registro de Auditoría ({logs.length})</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'users' ? (
            <div className="space-y-4">
              {/* Barra superior con botón de invitar */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                  Delegados y Entrenadores
                </span>
                <button
                  onClick={() => {
                    setIsInviteModalOpen(!isInviteModalOpen);
                    setInviteFeedback(null);
                  }}
                  className="px-3 py-1.5 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invitar Delegado</span>
                </button>
              </div>

              {/* Formulario desplegable para invitar */}
              {isInviteModalOpen && (
                <form
                  onSubmit={handleInviteSubmit}
                  className="p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] space-y-3 animate-in fade-in"
                >
                  <h4 className="font-bold text-xs uppercase text-[var(--ink)] flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[var(--red)]" />
                    <span>Invitar nuevo usuario (Registro público desactivado)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--mute)] mb-1">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        required
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Ej. Carlos Delegado"
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--mute)] mb-1">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="delegado@mareo.es"
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--mute)] mb-1">
                      Equipos asignados:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {teams.map((t) => {
                        const isChecked = inviteTeams.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border select-none transition-colors ${
                              isChecked
                                ? 'bg-[var(--red)] text-white border-[var(--red)]'
                                : 'bg-[var(--card)] text-[var(--mute)] border-[var(--line)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isChecked}
                              onChange={() => {
                                setInviteTeams((prev) =>
                                  prev.includes(t.id)
                                    ? prev.filter((id) => id !== t.id)
                                    : [...prev, t.id]
                                );
                              }}
                            />
                            {t.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {inviteFeedback && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                      {inviteFeedback}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[var(--red)] text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      Enviar invitación
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de usuarios */}
              <div className="space-y-2.5">
                {users.map((user) => {
                  const isAdmin = user.role === 'admin';
                  const isExpanded = selectedUserForPerms === user.id;
                  const status = user.status || 'active';

                  return (
                    <div
                      key={user.id}
                      className="rounded-xl border border-[var(--line)] bg-[var(--card)] overflow-hidden shadow-xs"
                    >
                      <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isAdmin
                                ? 'bg-[var(--red)] text-white'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {isAdmin ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm truncate">{user.name}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                  isAdmin
                                    ? 'bg-[var(--red)] text-white'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {isAdmin ? 'Entrenador (Admin)' : 'Delegado'}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50'
                                    : status === 'invited'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50'
                                }`}
                              >
                                {status === 'active'
                                  ? 'Activo'
                                  : status === 'invited'
                                  ? 'Invitado'
                                  : 'Desactivado'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--mute)] mt-0.5">
                              {user.email} · {user.teamIds.length} equipos asignados
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isAdmin && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(user.id)}
                                title={status === 'active' ? 'Desactivar acceso' : 'Reactivar acceso'}
                                className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                  status === 'active'
                                    ? 'border-[var(--line)] text-emerald-600 hover:bg-rose-50 hover:text-rose-600'
                                    : 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-emerald-50 hover:text-emerald-600'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleResetPassword(user.id)}
                                title="Restablecer contraseña"
                                className="p-1.5 rounded-lg border border-[var(--line)] text-xs text-[var(--mute)] hover:text-[var(--ink)]"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() =>
                              setSelectedUserForPerms(isExpanded ? null : user.id)
                            }
                            className="px-2.5 py-1 rounded-lg border border-[var(--line)] text-xs font-bold flex items-center gap-1 hover:border-[var(--mute)]"
                          >
                            <span>Permisos</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Panel desplegable de permisos y equipos */}
                      {isExpanded && (
                        <div className="p-4 border-t border-[var(--line)] bg-[var(--bg)] space-y-4 animate-in fade-in">
                          {/* Asignación de equipos */}
                          <div>
                            <span className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1.5">
                              Equipos asignados a {user.name}:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {teams.map((t) => {
                                const isAssigned = user.teamIds.includes(t.id);
                                return (
                                  <button
                                    key={t.id}
                                    disabled={isAdmin}
                                    onClick={() => handleToggleTeamAssignment(user.id, t.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                      isAssigned
                                        ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                                        : 'bg-[var(--card)] text-[var(--mute)] border-[var(--line)] hover:border-[var(--mute)]'
                                    } disabled:opacity-50`}
                                  >
                                    {t.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Permisos granulares por equipo */}
                          {!isAdmin ? (
                            <div className="space-y-3 pt-2 border-t border-[var(--line)]">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-[var(--mute)] uppercase">
                                  Permisos en el equipo:
                                </span>
                                <div className="flex gap-1">
                                  {user.teamIds.map((tId) => {
                                    const t = teams.find((item) => item.id === tId);
                                    if (!t) return null;
                                    return (
                                      <button
                                        key={t.id}
                                        onClick={() => setSelectedTeamForPerms(t.id)}
                                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                          selectedTeamForPerms === t.id
                                            ? 'bg-[var(--red)] text-white border-[var(--red)]'
                                            : 'bg-[var(--card)] text-[var(--mute)] border-[var(--line)]'
                                        }`}
                                      >
                                        {t.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Lista de interruptores de permisos */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(Object.keys(PERMISSION_METADATA) as PermissionKey[]).map(
                                  (permKey) => {
                                    const meta = PERMISSION_METADATA[permKey];
                                    const teamPerms =
                                      user.permissionsByTeam?.[selectedTeamForPerms] ||
                                      DEFAULT_DELEGATE_PERMISSIONS;
                                    const isEnabled = teamPerms[permKey] ?? meta.defaultDelegate;

                                    return (
                                      <div
                                        key={permKey}
                                        onClick={() =>
                                          handleTogglePermission(
                                            user.id,
                                            selectedTeamForPerms,
                                            permKey,
                                            isEnabled
                                          )
                                        }
                                        className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-start justify-between gap-2 ${
                                          isEnabled
                                            ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                                            : 'bg-[var(--card)] border-[var(--line)] opacity-60'
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <span className="font-bold text-xs block text-[var(--ink)]">
                                            {meta.label}
                                          </span>
                                          <span className="text-[10px] text-[var(--mute)] block leading-tight">
                                            {meta.description}
                                          </span>
                                        </div>
                                        <div
                                          className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                                            isEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                                          }`}
                                        >
                                          <div
                                            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                          />
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--mute)] italic pt-2 border-t border-[var(--line)]">
                              El rol de Entrenador Principal (Admin) posee automáticamente todos los permisos sin restricción.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Pestaña AUDITORÍA INMUTABLE */
            <div className="space-y-4">
              {/* Filtros de Auditoría */}
              <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold flex items-center gap-1 text-[var(--mute)]">
                  <Filter className="w-3.5 h-3.5" /> Filtros:
                </span>
                <select
                  value={filterUser}
                  onChange={(e) => {
                    setFilterUser(e.target.value);
                    setLogs(
                      getActivityLogs({
                        userId: e.target.value || undefined,
                        teamId: filterTeam || undefined,
                        date: filterDate || undefined,
                      })
                    );
                  }}
                  className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs font-semibold"
                >
                  <option value="">Todos los usuarios</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterTeam}
                  onChange={(e) => {
                    setFilterTeam(e.target.value);
                    setLogs(
                      getActivityLogs({
                        userId: filterUser || undefined,
                        teamId: e.target.value || undefined,
                        date: filterDate || undefined,
                      })
                    );
                  }}
                  className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs font-semibold"
                >
                  <option value="">Todos los equipos</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setLogs(
                      getActivityLogs({
                        userId: filterUser || undefined,
                        teamId: filterTeam || undefined,
                        date: e.target.value || undefined,
                      })
                    );
                  }}
                  className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs"
                />

                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={reloadData}
                    className="p-1 rounded-lg border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--line)]"
                    title="Refrescar logs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleExportLogs}
                    className="px-2.5 py-1 bg-[var(--card)] border border-[var(--line)] hover:border-[var(--mute)] rounded-lg font-bold flex items-center gap-1 text-xs"
                  >
                    <Download className="w-3 h-3" /> Exportar
                  </button>
                </div>
              </div>

              {/* Lista de Registros Inmutables */}
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-xs text-[var(--mute)] text-center py-8">
                    No se han registrado eventos con los filtros seleccionados.
                  </p>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const dateFormatted = new Date(log.timestamp).toLocaleString('es-ES');

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl border border-[var(--line)] bg-[var(--card)] text-xs space-y-1 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[var(--red)] uppercase tracking-wide text-[10px]">
                              {log.action}
                            </span>
                            <span className="font-semibold text-[var(--ink)]">
                              {log.userName}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--mute)] tabular-nums">
                            {dateFormatted}
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--ink)] opacity-90">{log.details}</p>

                        {/* Detalle de valores anterior y nuevo */}
                        {(log.previousValue || log.newValue) && (
                          <div className="pt-1">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-[10px] text-[var(--mute)] hover:text-[var(--ink)] underline font-bold"
                            >
                              {isExpanded ? 'Ocultar cambio detallado' : 'Ver cambio detallado'}
                            </button>

                            {isExpanded && (
                              <div className="mt-1.5 p-2 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-[10px] font-mono space-y-1">
                                {log.previousValue && (
                                  <div className="text-rose-600 dark:text-rose-400 break-all">
                                    - Antes: {log.previousValue}
                                  </div>
                                )}
                                {log.newValue && (
                                  <div className="text-emerald-600 dark:text-emerald-400 break-all">
                                    + Ahora: {log.newValue}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
