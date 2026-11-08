export interface ParsedCsvPlayer {
  dorsal: number | null;
  firstName: string;
  fullName: string;
  position?: string;
  error?: string;
}

export interface CsvParseResult {
  valid: ParsedCsvPlayer[];
  errors: string[];
}

/**
 * Parsea un archivo o texto CSV con formato:
 * Dorsal,Nombre,Apellidos,Puesto
 * o Dorsal,Nombre Completo,Puesto
 */
export function parsePlayersCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const valid: ParsedCsvPlayer[] = [];
  const errors: string[] = [];

  if (lines.length === 0) {
    return { valid, errors: ['El archivo CSV está vacío'] };
  }

  // Detectar si la primera fila es cabecera
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes('nombre') ||
    firstLine.includes('dorsal') ||
    firstLine.includes('apellidos') ||
    firstLine.includes('jugador');

  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Soportar delimitadores por coma o punto y coma
    const delimiter = line.includes(';') ? ';' : ',';
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 1 || (cols.length === 1 && cols[0] === '')) {
      continue;
    }

    let dorsal: number | null = null;
    let firstName = '';
    let fullName = '';
    let position = '';

    // Caso 1: Columna 1 es dorsal numérico
    if (/^\d+$/.test(cols[0])) {
      dorsal = parseInt(cols[0], 10);

      if (cols.length === 2) {
        // Dorsal, Nombre Completo
        fullName = cols[1];
        firstName = fullName.split(' ')[0] || fullName;
      } else if (cols.length === 3) {
        // Dorsal, Nombre, Puesto O Dorsal, Nombre, Apellidos
        if (['pt', 'portero', 'cierre', 'ala', 'pívot', 'pivot', 'defensa', 'delantero'].includes(cols[2].toLowerCase())) {
          fullName = cols[1];
          firstName = fullName.split(' ')[0] || fullName;
          position = cols[2];
        } else {
          firstName = cols[1];
          fullName = `${cols[1]} ${cols[2]}`.trim();
        }
      } else if (cols.length >= 4) {
        // Dorsal, Nombre, Apellidos, Puesto
        firstName = cols[1];
        fullName = `${cols[1]} ${cols[2]}`.trim();
        position = cols[3] || '';
      }
    } else {
      // Caso 2: Sin dorsal o primera columna es nombre
      if (cols.length === 1) {
        fullName = cols[0];
        firstName = fullName.split(' ')[0] || fullName;
      } else if (cols.length === 2) {
        // Nombre, Apellidos O Nombre, Puesto
        if (['pt', 'portero', 'cierre', 'ala', 'pívot', 'pivot', 'defensa', 'delantero'].includes(cols[1].toLowerCase())) {
          fullName = cols[0];
          firstName = fullName.split(' ')[0] || fullName;
          position = cols[1];
        } else {
          firstName = cols[0];
          fullName = `${cols[0]} ${cols[1]}`.trim();
        }
      } else if (cols.length >= 3) {
        firstName = cols[0];
        fullName = `${cols[0]} ${cols[1]}`.trim();
        position = cols[2] || '';
      }
    }

    if (!fullName) {
      errors.push(`Fila ${lineNum}: No se pudo determinar el nombre del jugador.`);
      continue;
    }

    valid.push({
      dorsal,
      firstName: firstName || fullName.split(' ')[0],
      fullName,
      position: position || undefined,
    });
  }

  return { valid, errors };
}
