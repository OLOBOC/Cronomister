import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player, Team, Match, TrainingSession, AttendanceRecord, AppNote } from '@/types';
import { calculatePlayerKPIs } from './minuteEngine';
import { APP_CONFIG } from '@/config/appConfig';

interface GeneratePdfOptions {
  player: Player;
  team: Team;
  matches: Match[];
  sessions: TrainingSession[];
  attendance: AttendanceRecord[];
  notes: AppNote[];
}

export function generatePlayerPdf({
  player,
  team,
  matches,
  sessions,
  attendance,
  notes,
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const RED: [number, number, number] = [192, 28, 28]; // #c01c1c
  const GOLD: [number, number, number] = [242, 183, 5]; // #f2b705
  const DARK_TEXT: [number, number, number] = [27, 34, 51];

  const totalMatchDuration = team.settings.halfDurationMinutes * 2;
  const playerAttendance = attendance.filter((a) => a.playerId === player.id);
  const kpis = calculatePlayerKPIs(
    player.id,
    matches.map((m) => ({ records: m.records, isFinished: m.status === 'finished' })),
    playerAttendance,
    totalMatchDuration
  );

  // 1. CABECERA ROJA OFICIAL MAREO
  doc.setFillColor(...RED);
  doc.rect(0, 0, 210, 28, 'F');

  // Franja dorada de detalle
  doc.setFillColor(...GOLD);
  doc.rect(0, 27, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ESCUELA DE FÚTBOL MAREO', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Informe de asistencia y registro de minutos · Categoría ${team.name}`,
    14,
    21
  );

  // 2. DATOS DEL JUGADOR
  doc.setTextColor(...DARK_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(player.fullName, 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const subDetails = [
    player.dorsal ? `Dorsal ${player.dorsal}` : null,
    team.settings.showPositions && player.position ? `Puesto: ${player.position}` : null,
    `Temporada ${APP_CONFIG.SEASON}`,
  ]
    .filter(Boolean)
    .join('   ·   ');
  doc.text(subDetails, 14, 44);

  // 3. TABLA 1: REGISTRO DE MINUTOS POR PARTIDO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    `1. Registro de minutos por partido (duración reglamentaria: ${totalMatchDuration} min)`,
    14,
    53
  );

  const matchRows = matches.map((m) => {
    const rec = m.records[player.id];
    const isPlayed = rec && rec.status === 'J';
    const isStarter = isPlayed && rec.isStarter;
    const mins = isPlayed ? `${rec.minutes} min` : rec ? '0 min' : '—';
    const sourceTag = isPlayed
      ? rec.source === 'manual'
        ? ' (manual)'
        : rec.source === 'estimated'
        ? ' (estimado)'
        : ' (directo)'
      : '';

    const compLabel =
      m.matchType === 'tournament'
        ? 'Torneo'
        : m.matchType === 'friendly'
        ? 'Amistoso'
        : `J${m.round}`;

    const matchLabel =
      (m.matchType === 'tournament' && m.tournamentName ? `[${m.tournamentName}] ` : '') +
      (m.isHome ? `Mareo vs ${m.rival}` : `${m.rival} vs Mareo`);
    const formattedDate = m.date.split('-').reverse().join('/');

    return [
      compLabel,
      formattedDate,
      matchLabel,
      rec ? (isPlayed ? 'Sí' : 'No') : '—',
      isPlayed ? (isStarter ? 'Sí' : 'No') : '—',
      mins + sourceTag,
    ];
  });

  autoTable(doc, {
    startY: 56,
    head: [['Comp. / Jorn.', 'Fecha', 'Partido / Rival', 'Asistió', 'Titular', 'Minutos (Origen)']],
    body: matchRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, font: 'helvetica' },
    headStyles: { fillColor: RED, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 252] },
  });

  const docWithAutoTable = doc as unknown as { lastAutoTable: { finalY: number } };
  let currentY = docWithAutoTable.lastAutoTable.finalY + 6;

  // Totales de partidos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const kpiText = `Totales: ${kpis.matchesAttended} de ${kpis.matchesTotal} partidos jugados · ${kpis.matchesAsStarter} titular · ${kpis.totalMinutes} min acumulados · media ${kpis.averageMinutesPerMatch.toFixed(1)} min/partido · ${(kpis.percentMatchTime * 100).toFixed(1)}% del tiempo total`;
  doc.text(kpiText, 14, currentY, { maxWidth: 182 });

  currentY += 10;

  // 4. TABLA 2: ASISTENCIA A ENTRENAMIENTOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Control de asistencia a entrenamientos', 14, currentY);

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const relevantSessions = sessions.filter((s) =>
    playerAttendance.some((a) => a.sessionId === s.id)
  );

  const attendanceRows = relevantSessions.map((s, idx) => {
    const att = playerAttendance.find((a) => a.sessionId === s.id);
    const dateObj = new Date(`${s.date}T12:00:00`);
    const dayName = daysOfWeek[dateObj.getDay()] || '';
    const formattedDate = s.date.split('-').reverse().join('/');

    const missed = att?.status === 'S' ? 'No' : 'Sí';
    const excused = att?.status === 'S' ? '—' : att?.status === 'A' ? 'Sí' : 'No';
    const stateLabel =
      att?.status === 'S'
        ? 'Asistió'
        : att?.status === 'A'
        ? 'Falta avisada'
        : 'Falta sin avisar';

    return [
      String(idx + 1).padStart(2, '0'),
      formattedDate,
      dayName,
      missed,
      excused,
      stateLabel,
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Nº', 'Fecha', 'Día', 'Faltó', 'Avisó', 'Estado']],
    body: attendanceRows.length > 0 ? attendanceRows : [['—', '—', '—', '—', '—', 'Sin registros']],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: RED, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 252] },
  });

  currentY = docWithAutoTable.lastAutoTable.finalY + 6;

  // Totales de asistencia
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const attSummary = `Asistió a ${kpis.attendanceCount.attended} de ${kpis.attendanceCount.totalSessions} entrenamientos (${(kpis.attendancePercent * 100).toFixed(0)}%) · ${kpis.attendanceCount.excused} faltas avisadas · ${kpis.attendanceCount.unexcused} faltas sin avisar`;
  doc.text(attSummary, 14, currentY);

  currentY += 10;

  // 5. ANOTACIONES TÉCNICAS (SI HAY)
  const playerNotes = notes.filter((n) => n.playerId === player.id);
  if (playerNotes.length > 0) {
    // Si queda poco espacio, pasar de página
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. Anotaciones de seguimiento técnico', 14, currentY);

    const notesRows = playerNotes.map((n) => [
      n.date.split('-').reverse().join('/'),
      n.targetType === 'match' ? 'Partido' : 'Entrenamiento',
      n.content,
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha', 'Tipo', 'Anotación']],
      body: notesRows,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.2, font: 'helvetica' },
      headStyles: { fillColor: RED, textColor: 255, fontStyle: 'bold' },
    });
  }

  // 6. PIE DE PÁGINA EN TODAS LAS HOJAS
  const totalPages = doc.getNumberOfPages();
  const todayStr = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 115, 130);
    const footerText = `Escuela de Fútbol Mareo — ${team.name} · Documento interno de dirección técnica · Generado el ${todayStr} · Página ${i} de ${totalPages}`;
    doc.text(footerText, 14, 290);
  }

  return doc;
}
