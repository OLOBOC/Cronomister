'use client';

import React, { useState } from 'react';
import { Team } from '@/types';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { parsePlayersCsv, ParsedCsvPlayer } from '@/lib/csvParser';
import { importPlayers } from '@/lib/storage';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onImportComplete?: (count: number) => void;
}

export function CsvImportModal({ isOpen, onClose, team, onImportComplete }: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<{ valid: ParsedCsvPlayer[]; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleParse = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    const result = parsePlayersCsv(text);
    setPreview(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!preview || preview.valid.length === 0) return;

    const count = importPlayers(preview.valid, team.id);
    if (onImportComplete) onImportComplete(count);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-[var(--line)] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Importar jugadores por CSV</h2>
            <p className="text-xs text-[var(--mute)]">Añadir múltiples jugadores a {team.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--mute)]">
          <p className="font-semibold text-[var(--ink)] mb-1">Formato admitido (separado por comas o punto y coma):</p>
          <code>Dorsal, Nombre, Apellidos, Puesto</code>
          <p className="mt-1">Ejemplo: <code>7, Salvador, Milano, Pívot</code></p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-dashed border-[var(--line)] hover:border-[var(--red)] transition-colors text-xs font-semibold">
              <UploadCloud className="w-4 h-4 text-[var(--red)]" />
              <span>Seleccionar archivo .csv</span>
              <input type="file" accept=".csv,text/csv,text/plain" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
              O pegar contenido CSV aquí:
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder={"1, Unai, Robledo Sanchez, PT\n7, Salvador, Milano, Pívot\n8, Aitor, Pedrayes Caravia, Ala"}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-mono"
            />
          </div>

          {preview && (
            <div className="border border-[var(--line)] rounded-xl p-3 bg-[var(--bg)]/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> {preview.valid.length} jugadores detectados
                </span>
                {preview.errors.length > 0 && (
                  <span className="text-xs font-bold flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-4 h-4" /> {preview.errors.length} avisos
                  </span>
                )}
              </div>

              {preview.valid.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                  {preview.valid.slice(0, 10).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-[var(--line)]/50">
                      <span className="font-semibold">
                        {p.dorsal ? `#${p.dorsal} ` : ''}{p.fullName}
                      </span>
                      {p.position && <span className="text-[11px] text-[var(--mute)]">{p.position}</span>}
                    </div>
                  ))}
                  {preview.valid.length > 10 && (
                    <div className="text-[11px] text-[var(--mute)] text-center pt-1">
                      ... y {preview.valid.length - 10} jugadores más
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!preview || preview.valid.length === 0}
            className="w-full py-3 bg-[var(--red)] disabled:opacity-40 hover:bg-[var(--red-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <FileText className="w-4 h-4" /> Importar {preview ? preview.valid.length : 0} jugadores
          </button>
        </div>
      </div>
    </div>
  );
}
