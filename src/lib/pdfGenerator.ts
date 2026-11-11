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

// ─── Colores corporativos Mareo ───────────────────────────────────────────────
const RED: [number, number, number] = [192, 28, 28];
const RED_DARK: [number, number, number] = [150, 18, 18];
const GOLD: [number, number, number] = [242, 183, 5];
const INK: [number, number, number] = [27, 34, 51];
const MUTED: [number, number, number] = [110, 115, 130];
const BG_ALT: [number, number, number] = [248, 249, 252];
const BG_RED_LIGHT: [number, number, number] = [255, 245, 245];
const BG_GREEN_LIGHT: [number, number, number] = [240, 253, 244];
const BG_AMBER_LIGHT: [number, number, number] = [255, 251, 235];
const BG_BLUE_LIGHT: [number, number, number] = [239, 246, 255];
const WHITE: [number, number, number] = [255, 255, 255];

// ─── Helper: rectángulo con borde izquierdo de acento ────────────────────────
function accentBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  accentColor: [number, number, number],
  bgColor: [number, number, number]
) {
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFillColor(...accentColor);
  doc.rect(x, y, 2.5, h, 'F');
}

// ─── Helper: añadir cabecera en nueva página ──────────────────────────────────
function addPageHeader(doc: jsPDF, playerName: string, teamName: string) {
  doc.setFillColor(...RED);
  doc.rect(0, 0, 210, 14, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 13.5, 210, 0.8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ESCUELA DE FÚTBOL MAREO', 14, 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${playerName} · ${teamName} · Continuación`, 14, 11);
}

export function generatePlayerPdf({
  player,
  team,
  matches,
  sessions,
  attendance,
  notes,
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const docAT = doc as unknown as { lastAutoTable: { finalY: number } };
  const PAGE_W = 210;
  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const totalMatchDuration = team.settings.halfDurationMinutes * 2;
  const playerAttendance = attendance.filter(
    (a) => a.playerId === player.id || (player.linkedPlayerId && a.playerId === player.linkedPlayerId)
  );
  const kpis = calculatePlayerKPIs(
    player.id,
    matches.map((m) => ({
      id: m.id,
      date: m.date,
      records: m.records,
      isFinished: m.status === 'finished',
    })),
    playerAttendance,
    totalMatchDuration
  );

  const todayStr = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CABECERA PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...RED);
  doc.rect(0, 0, PAGE_W, 32, 'F');

  // Franja dorada inferior
  doc.setFillColor(...GOLD);
  doc.rect(0, 31.2, PAGE_W, 1.5, 'F');

  // Bloque lateral con dorsal
  if (player.dorsal !== null && player.dorsal !== undefined) {
    doc.setFillColor(...RED_DARK);
    doc.rect(PAGE_W - 32, 0, 32, 32, 'F');
    doc.setTextColor(...GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    const dorsalStr = String(player.dorsal);
    const dorsalX = PAGE_W - 16 - (dorsalStr.length > 1 ? 7 : 4);
    doc.text(dorsalStr, dorsalX, 17);
    doc.setFontSize(7);
    doc.setTextColor(255, 220, 100);
    doc.text('DORSAL', PAGE_W - 29, 25);
  }

  // Título institución
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ESCUELA DE FÚTBOL MAREO', MARGIN, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 220, 180);
  doc.text(
    `Informe de seguimiento técnico · Categoría ${team.name} · Temporada ${APP_CONFIG.SEASON}`,
    MARGIN,
    18
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. BLOQUE DATOS DEL JUGADOR
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(player.fullName, MARGIN, 44);

  const metaItems: string[] = [];
  if (team.settings.showPositions && player.position) metaItems.push(`Puesto: ${player.position}`);
  if (player.note) metaItems.push(player.note);
  if (player.linkedPlayerId) metaItems.push('Doble equipo (Pre C · Debutantes A)');
  metaItems.push(`Equipo: ${team.name}`);
  metaItems.push(`Generado: ${todayStr}`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(metaItems.join('   ·   '), MARGIN, 50);

  // Línea separadora fina bajo datos jugador
  doc.setDrawColor(220, 222, 228);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 54, PAGE_W - MARGIN, 54);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. KPI CARDS (4 tarjetas en fila)
  // ═══════════════════════════════════════════════════════════════════════════
  const cardY = 58;
  const cardH = 20;
  const cardGap = 3;
  const cardW = (CONTENT_W - cardGap * 3) / 4;

  const kpiCards = [
    {
      label: 'Partidos jugados',
      value: `${kpis.matchesAttended}/${kpis.matchesTotal}`,
      sub: `${kpis.matchesAsStarter} titular`,
      accent: RED,
      bg: BG_RED_LIGHT,
    },
    {
      label: 'Minutos totales',
      value: `${kpis.totalMinutes}`,
      sub: `media ${kpis.averageMinutesPerMatch.toFixed(0)} min/partido`,
      accent: [30, 100, 220] as [number, number, number],
      bg: BG_BLUE_LIGHT,
    },
    {
      label: '% tiempo jugado',
      value: `${(kpis.percentMatchTime * 100).toFixed(0)}%`,
      sub: `del tiempo total`,
      accent: [22, 163, 74] as [number, number, number],
      bg: BG_GREEN_LIGHT,
    },
    {
      label: 'Asistencia entrenos',
      value: `${(kpis.attendancePercent * 100).toFixed(0)}%`,
      sub: `${kpis.attendanceCount.attended}/${kpis.attendanceCount.totalSessions} sesiones`,
      accent: [180, 130, 0] as [number, number, number],
      bg: BG_AMBER_LIGHT,
    },
  ];

  kpiCards.forEach((card, i) => {
    const cx = MARGIN + i * (cardW + cardGap);
    accentBox(doc, cx, cardY, cardW, cardH, card.accent, card.bg);

    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(card.value, cx + 5, cardY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(card.label, cx + 5, cardY + 15.5);
    doc.text(card.sub, cx + 5, cardY + 19);
  });

  let currentY = cardY + cardH + 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TABLA 1: REGISTRO DE MINUTOS POR PARTIDO
  // ═══════════════════════════════════════════════════════════════════════════
  // Encabezado de sección
  doc.setFillColor(...RED);
  doc.rect(MARGIN, currentY, CONTENT_W, 6.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    `1. REGISTRO DE MINUTOS POR PARTIDO  (duración: ${totalMatchDuration} min)`,
    MARGIN + 3,
    currentY + 4.5
  );

  const matchRows = matches.map((m) => {
    const rec = m.records[player.id];
    const isPlayed = rec && rec.status === 'J';
    const isStarter = isPlayed && rec.isStarter;
    const mins = isPlayed ? `${rec.minutes}` : rec ? '0' : '—';
    const sourceTag = isPlayed
      ? rec.source === 'manual'
        ? ' ✎'
        : rec.source === 'estimated'
        ? ' ~'
        : ''
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
    const convocadoLabel = !rec ? '—' : isPlayed ? 'Sí' : 'No';
    const titularLabel = !isPlayed ? '—' : isStarter ? 'Titular' : 'Suplente';
    const scoreLabel =
      m.status === 'finished' &&
      m.scoreMareo !== undefined &&
      m.scoreRival !== undefined
        ? `${m.scoreMareo}-${m.scoreRival}`
        : m.status === 'finished'
        ? 'Finalizado'
        : 'Pendiente';

    return [compLabel, formattedDate, matchLabel, scoreLabel, convocadoLabel, titularLabel, mins + sourceTag];
  });

  autoTable(doc, {
    startY: currentY + 7,
    head: [['Comp.', 'Fecha', 'Partido / Rival', 'Result.', 'Conv.', 'Rol', 'Min.']],
    body: matchRows.length > 0 ? matchRows : [['—', '—', 'Sin partidos registrados', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, font: 'helvetica', textColor: INK },
    headStyles: { fillColor: RED_DARK, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: BG_ALT },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addPageHeader(doc, player.fullName, team.name);
      }
    },
  });

  currentY = docAT.lastAutoTable.finalY + 4;

  // Resumen KPI partidos
  accentBox(doc, MARGIN, currentY, CONTENT_W, 10, RED, BG_RED_LIGHT);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Resumen:', MARGIN + 4, currentY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const kpiMatchText = `${kpis.matchesAttended} partidos jugados de ${kpis.matchesTotal} · ${kpis.matchesAsStarter} como titular · ${kpis.totalMinutes} min acumulados · media ${kpis.averageMinutesPerMatch.toFixed(1)} min/partido · ${(kpis.percentMatchTime * 100).toFixed(1)}% del tiempo total`;
  doc.text(kpiMatchText, MARGIN + 24, currentY + 6.5, { maxWidth: CONTENT_W - 28 });

  currentY += 14;

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. TABLA 2: CONTROL DE ASISTENCIA A ENTRENAMIENTOS
  // ═══════════════════════════════════════════════════════════════════════════
  // Verificar espacio — saltar página si queda poco
  if (currentY > 220) {
    doc.addPage();
    addPageHeader(doc, player.fullName, team.name);
    currentY = 20;
  }

  doc.setFillColor(...RED);
  doc.rect(MARGIN, currentY, CONTENT_W, 6.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. CONTROL DE ASISTENCIA A ENTRENAMIENTOS', MARGIN + 3, currentY + 4.5);

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const relevantSessions = sessions.filter((s) =>
    playerAttendance.some((a) => a.sessionId === s.id || a.sessionId === s.date)
  );

  const attendanceRows = relevantSessions.map((s, idx) => {
    const att = playerAttendance.find((a) => a.sessionId === s.id || a.sessionId === s.date);
    const dateObj = new Date(`${s.date}T12:00:00`);
    const dayName = daysOfWeek[dateObj.getDay()] || '';
    const formattedDate = s.date.split('-').reverse().join('/');

    const stateLabel =
      att?.status === 'S'
        ? 'Asistió'
        : att?.status === 'A'
        ? 'Falta avisada'
        : 'Falta sin avisar';

    const motivo = att?.status !== 'S' && att?.reason ? att.reason : '—';
    const sesionNota = s.generalNote ? s.generalNote.substring(0, 60) + (s.generalNote.length > 60 ? '…' : '') : '—';
    const jugadorNota = att?.note ? att.note.substring(0, 50) + (att.note.length > 50 ? '…' : '') : '—';

    return [
      String(idx + 1).padStart(2, '0'),
      formattedDate,
      dayName,
      stateLabel,
      motivo,
      jugadorNota,
    ];
  });

  autoTable(doc, {
    startY: currentY + 7,
    head: [['Nº', 'Fecha', 'Día', 'Estado', 'Motivo', 'Observación jugador']],
    body:
      attendanceRows.length > 0
        ? attendanceRows
        : [['—', '—', '—', 'Sin registros', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, font: 'helvetica', textColor: INK },
    headStyles: { fillColor: RED_DARK, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: BG_ALT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 'auto' },
    },
    didDrawCell: (data) => {
      // Verde suave para asistencia
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw);
        if (val === 'Asistió') {
          doc.setFillColor(...BG_GREEN_LIGHT);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(22, 101, 52);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(val, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1.5);
        } else if (val === 'Falta avisada') {
          doc.setFillColor(...BG_AMBER_LIGHT);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(146, 64, 14);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(val, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1.5);
        } else if (val === 'Falta sin avisar') {
          doc.setFillColor(...BG_RED_LIGHT);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(185, 28, 28);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(val, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1.5);
        }
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addPageHeader(doc, player.fullName, team.name);
      }
    },
  });

  currentY = docAT.lastAutoTable.finalY + 4;

  // Resumen KPI asistencia
  accentBox(doc, MARGIN, currentY, CONTENT_W, 10, [22, 163, 74], BG_GREEN_LIGHT);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Resumen:', MARGIN + 4, currentY + 6.5);
  doc.setFont('helvetica', 'normal');
  const attSummaryText = `${kpis.attendanceCount.attended} asistencias de ${kpis.attendanceCount.totalSessions} sesiones registradas (${(kpis.attendancePercent * 100).toFixed(0)}%) · ${kpis.attendanceCount.excused} faltas avisadas · ${kpis.attendanceCount.unexcused} faltas sin avisar`;
  doc.text(attSummaryText, MARGIN + 24, currentY + 6.5, { maxWidth: CONTENT_W - 28 });

  currentY += 14;

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ANOTACIONES TÉCNICAS DE SEGUIMIENTO
  // ═══════════════════════════════════════════════════════════════════════════
  const playerNotes = notes.filter((n) => n.playerId === player.id);

  if (playerNotes.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      addPageHeader(doc, player.fullName, team.name);
      currentY = 20;
    }

    doc.setFillColor(...RED);
    doc.rect(MARGIN, currentY, CONTENT_W, 6.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. OBSERVACIONES Y SEGUIMIENTO TÉCNICO', MARGIN + 3, currentY + 4.5);

    const notesRows = playerNotes.map((n, idx) => [
      String(idx + 1).padStart(2, '0'),
      n.date.split('-').reverse().join('/'),
      n.targetType === 'match' ? 'Partido' : 'Entrenamiento',
      n.content,
    ]);

    autoTable(doc, {
      startY: currentY + 7,
      head: [['Nº', 'Fecha', 'Contexto', 'Observación / Anotación técnica']],
      body: notesRows,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        font: 'helvetica',
        textColor: INK,
        overflow: 'linebreak',
      },
      headStyles: { fillColor: RED_DARK, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: BG_ALT },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 'auto', fontStyle: 'italic' },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addPageHeader(doc, player.fullName, team.name);
        }
      },
    });

    currentY = docAT.lastAutoTable.finalY + 4;
  } else {
    // Sin anotaciones — caja informativa
    if (currentY > 220) {
      doc.addPage();
      addPageHeader(doc, player.fullName, team.name);
      currentY = 20;
    }
    accentBox(doc, MARGIN, currentY, CONTENT_W, 11, MUTED, [245, 245, 248]);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text(
      '3. OBSERVACIONES Y SEGUIMIENTO TÉCNICO — Sin anotaciones registradas para este jugador.',
      MARGIN + 5,
      currentY + 7
    );
    currentY += 15;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PIE DE PÁGINA EN TODAS LAS HOJAS
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Franja inferior
    doc.setFillColor(...RED);
    doc.rect(0, 283, PAGE_W, 14, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 282.5, PAGE_W, 0.8, 'F');

    // Texto pie
    doc.setTextColor(255, 220, 180);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Escuela de Fútbol Mareo — Documento de uso interno de dirección técnica', MARGIN, 289);
    doc.text(`Generado: ${todayStr}   ·   ${team.name}   ·   Temporada ${APP_CONFIG.SEASON}`, MARGIN, 293.5);

    // Número de página a la derecha
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GOLD);
    doc.setFontSize(8);
    doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, 291, { align: 'right' });
  }

  return doc;
}
