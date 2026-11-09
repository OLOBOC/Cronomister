import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { UserProfile } from '@/types';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const users: UserProfile[] = (data?.users || []).map((u) => ({
      id: u.id,
      email: u.email || '',
      name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuario',
      role: (u.user_metadata?.role as 'admin' | 'delegate') || 'delegate',
      status: (u.user_metadata?.status as 'active' | 'invited' | 'disabled') || 'active',
      teamIds: u.user_metadata?.teamIds || [],
      permissionsByTeam: u.user_metadata?.permissionsByTeam || {},
      createdAt: u.created_at,
    }));

    return NextResponse.json({ success: true, users });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Error al listar usuarios' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId obligatorio' }, { status: 400 });
    }

    const { data: userData, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchErr || !userData.user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const currentMeta = userData.user.user_metadata || {};
    const updatedMeta = { ...currentMeta, ...updates };

    const updatePayload: { user_metadata: Record<string, unknown>; password?: string } = {
      user_metadata: updatedMeta,
    };

    if (updates.password) {
      updatePayload.password = updates.password;
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}
