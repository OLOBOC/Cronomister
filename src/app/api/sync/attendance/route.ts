import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { AttendanceRecord } from '@/types';

const BUCKET_NAME = 'cronomister-data';
const FILE_NAME = 'attendance.json';

// Helper para asegurar que el bucket existe
async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true });
  }
}

// GET /api/sync/attendance - Obtener todas las asistencias de la nube
export async function GET() {
  try {
    await ensureBucket();
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(FILE_NAME);

    if (error || !data) {
      // Si el archivo no existe aún, devuelve array vacío
      return NextResponse.json({ success: true, attendance: [], updatedAt: new Date().toISOString() });
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return NextResponse.json({
      success: true,
      attendance: parsed.attendance || [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Error al obtener asistencias de la nube' },
      { status: 500 }
    );
  }
}

// POST /api/sync/attendance - Guardar o sincronizar asistencias
export async function POST(req: Request) {
  try {
    await ensureBucket();
    const body = await req.json();
    const incomingRecords: AttendanceRecord[] = body.records || [];

    if (!Array.isArray(incomingRecords)) {
      return NextResponse.json({ success: false, error: 'records debe ser un array' }, { status: 400 });
    }

    // 1. Descargar registros existentes de la nube
    let currentAttendance: AttendanceRecord[] = [];
    const { data: existingData } = await supabaseAdmin.storage.from(BUCKET_NAME).download(FILE_NAME);

    if (existingData) {
      try {
        const text = await existingData.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.attendance)) {
          currentAttendance = parsed.attendance;
        }
      } catch {
        // En caso de parse error, empezamos con array vacío
        currentAttendance = [];
      }
    }

    // 2. Fusionar registros (clave: sessionId + playerId)
    // Mantener la versión más reciente según updatedAt
    const mergedMap = new Map<string, AttendanceRecord>();

    currentAttendance.forEach((rec) => {
      const key = `${rec.sessionId}_${rec.playerId}`;
      mergedMap.set(key, rec);
    });

    incomingRecords.forEach((rec) => {
      const key = `${rec.sessionId}_${rec.playerId}`;
      const existing = mergedMap.get(key);
      if (!existing) {
        mergedMap.set(key, rec);
      } else {
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const incomingTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : Date.now();
        if (incomingTime >= existingTime) {
          mergedMap.set(key, rec);
        }
      }
    });

    const mergedAttendance = Array.from(mergedMap.values());

    // 3. Subir de vuelta a Supabase Storage
    const payload = JSON.stringify({
      attendance: mergedAttendance,
      updatedAt: new Date().toISOString(),
    });

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, payload, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attendance: mergedAttendance,
      count: mergedAttendance.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Error al sincronizar asistencias' },
      { status: 500 }
    );
  }
}
