import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, role = 'delegate', teamIds = [], permissionsByTeam = {}, password: customPassword } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email obligatorio' }, { status: 400 });
    }

    const assignedPassword = customPassword || 'mareo' + Math.floor(1000 + Math.random() * 9000);

    // Comprobar si ya existe en Supabase Auth
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Actualizar contraseña y metadatos
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: assignedPassword,
        user_metadata: {
          name: name || existing.user_metadata?.name || email,
          role,
          status: 'active',
          teamIds,
          permissionsByTeam,
        },
      });

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }
    } else {
      // Crear nuevo usuario en Supabase Auth
      const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: assignedPassword,
        email_confirm: true,
        user_metadata: {
          name: name || email,
          role,
          status: 'active',
          teamIds,
          permissionsByTeam,
        },
      });

      if (createErr || !createData.user) {
        return NextResponse.json(
          { success: false, error: createErr?.message || 'Error al crear usuario' },
          { status: 500 }
        );
      }
      userId = createData.user.id;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: name || email,
        role,
        status: 'active',
        teamIds,
        permissionsByTeam,
        password: assignedPassword,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
