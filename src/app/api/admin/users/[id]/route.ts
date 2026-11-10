import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOwnerProfile } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ROLES = ['owner', 'admin'];

/** แก้ชื่อ / สิทธิ์ / เปิด-ปิดการใช้งาน / ตั้งรหัสผ่านใหม่ */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerProfile();
  if (!owner) {
    return NextResponse.json({ error: 'เฉพาะเจ้าของระบบเท่านั้นที่จัดการผู้ใช้ได้' }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};

  if (body.full_name !== undefined) patch.full_name = String(body.full_name).trim() || null;

  if (body.role !== undefined) {
    const role = String(body.role);
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: 'สิทธิ์ไม่ถูกต้อง' }, { status: 400 });
    }
    if (id === owner.id && role !== 'owner') {
      return NextResponse.json({ error: 'ลดสิทธิ์ตัวเองไม่ได้' }, { status: 400 });
    }
    patch.role = role;
  }

  if (body.is_active !== undefined) {
    const active = Boolean(body.is_active);
    if (id === owner.id && !active) {
      return NextResponse.json({ error: 'ปิดการใช้งานบัญชีตัวเองไม่ได้' }, { status: 400 });
    }
    patch.is_active = active;
  }

  // กันไม่ให้เหลือเจ้าของระบบที่ใช้งานได้ 0 คน
  if (patch.role === 'admin' || patch.is_active === false) {
    const { count } = await db
      .from('admin_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('is_active', true)
      .neq('id', id);
    if (!count) {
      return NextResponse.json(
        { error: 'ต้องเหลือเจ้าของระบบที่ใช้งานได้อย่างน้อย 1 คน' },
        { status: 400 }
      );
    }
  }

  if (body.password !== undefined) {
    const password = String(body.password);
    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
    }
    const { error } = await db.auth.admin.updateUserById(id, { password });
    if (error) {
      console.error('[admin/users/:id] password failed', error);
      return NextResponse.json({ error: 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ' }, { status: 400 });
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await db.from('admin_users').update(patch).eq('id', id);
    if (error) {
      console.error('[admin/users/:id] update failed', error);
      return NextResponse.json({ error: 'อัปเดตไม่สำเร็จ' }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

/** ลบผู้ใช้ออกทั้งจาก admin_users และระบบ Auth */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerProfile();
  if (!owner) {
    return NextResponse.json({ error: 'เฉพาะเจ้าของระบบเท่านั้นที่จัดการผู้ใช้ได้' }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (id === owner.id) {
    return NextResponse.json({ error: 'ลบบัญชีตัวเองไม่ได้' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { count } = await db
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'owner')
    .eq('is_active', true)
    .neq('id', id);
  if (!count) {
    return NextResponse.json(
      { error: 'ต้องเหลือเจ้าของระบบที่ใช้งานได้อย่างน้อย 1 คน' },
      { status: 400 }
    );
  }

  await db.from('admin_users').delete().eq('id', id);

  const { error } = await db.auth.admin.deleteUser(id);
  if (error) {
    console.error('[admin/users/:id] delete failed', error);
    return NextResponse.json(
      { error: 'ลบสิทธิ์ออกจากระบบแล้ว แต่ลบบัญชีใน Supabase Auth ไม่สำเร็จ' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
