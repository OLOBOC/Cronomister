import { NextResponse } from 'next/server';
import { getAuthenticatedAppUser } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedAppUser(req);
    if (!auth.user) return auth.error;
    return NextResponse.json({ success: true, user: auth.user });
  } catch (error: unknown) {
    console.error('[account] Error cargando el perfil:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cargar el perfil' }, { status: 500 });
  }
}
