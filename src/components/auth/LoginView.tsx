'use client';

import React, { useState } from 'react';
import { loginUser } from '@/lib/storage';
import { APP_CONFIG } from '@/config/appConfig';
import { Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { UserProfile } from '@/types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = loginUser(email, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Credenciales no válidas.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSuccess(true);
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('mareo2026');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Cabecera Oficial Mareo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[var(--red)] text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
            M
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--ink)]">
              {APP_CONFIG.NAME}
            </h1>
            <p className="text-xs text-[var(--mute)] font-medium">
              {APP_CONFIG.CLUB_NAME} · Temporada {APP_CONFIG.SEASON}
            </p>
          </div>
        </div>

        {/* Tarjeta de Formulario de Inicio de Sesión */}
        <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--line)] shadow-xl space-y-4">
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="text-base font-extrabold text-[var(--ink)]">Acceso a la plataforma</h2>
            <p className="text-xs text-[var(--mute)]">
              Introduce tus credenciales para acceder a tus equipos
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--mute)] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@mareo.es"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] font-medium focus:border-[var(--red)] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[var(--mute)] uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setResetSuccess(false);
                    setResetEmail(email);
                  }}
                  className="text-[11px] text-[var(--red)] hover:underline font-bold"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--mute)] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] font-medium focus:border-[var(--red)] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[var(--red)] hover:bg-[var(--red-hover)] active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Aviso estricto de seguridad RGPD y sin registro público */}
          <div className="pt-2 border-t border-[var(--line)] text-center">
            <p className="text-[11px] text-[var(--mute)] leading-relaxed">
              <span className="font-bold text-[var(--ink)]">Registro público desactivado.</span>
              <br />
              Solo pueden acceder entrenadores y delegados expresamente invitados por la dirección técnica.
            </p>
          </div>
        </div>

        {/* Acceso Rápido para Pruebas / Demostración */}
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-2">
          <span className="block text-[11px] font-bold text-[var(--mute)] uppercase text-center tracking-wider">
            Accesos de prueba configurados
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('entrenador@mareo.es')}
              className="p-2 rounded-xl border border-[var(--line)] hover:border-[var(--red)] bg-[var(--bg)] text-left transition-colors text-xs"
            >
              <span className="font-bold block text-[var(--red)]">Entrenador (Admin)</span>
              <span className="text-[10px] text-[var(--mute)] block truncate">entrenador@mareo.es</span>
            </button>
            <button
              onClick={() => handleQuickLogin('delegado@mareo.es')}
              className="p-2 rounded-xl border border-[var(--line)] hover:border-emerald-500 bg-[var(--bg)] text-left transition-colors text-xs"
            >
              <span className="font-bold block text-emerald-600">Delegado</span>
              <span className="text-[10px] text-[var(--mute)] block truncate">delegado@mareo.es</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[var(--red)]" />
                <span>Recuperar contraseña</span>
              </h3>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-[var(--mute)] hover:text-[var(--ink)]"
              >
                ✕
              </button>
            </div>

            {resetSuccess ? (
              <div className="space-y-3 py-2 text-center animate-in fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-xs text-[var(--ink)] font-medium">
                  Si la cuenta existe en Mareo, se ha enviado un enlace de restablecimiento a <b>{resetEmail}</b>.
                </p>
                <p className="text-[11px] text-[var(--mute)]">
                  También puedes solicitar al Entrenador Principal que restablezca tu acceso desde su panel.
                </p>
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2 bg-[var(--ink)] text-[var(--bg)] font-bold text-xs rounded-xl"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <p className="text-xs text-[var(--mute)] leading-relaxed">
                  Introduce tu correo electrónico registrado y te enviaremos las instrucciones para restablecer tu contraseña.
                </p>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="delegado@mareo.es"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[var(--red)] text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Enviar enlace de recuperación
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
