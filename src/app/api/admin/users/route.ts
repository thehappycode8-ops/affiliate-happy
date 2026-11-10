import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOwnerProfile } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ROLES = ['owner', 'admin'];

/** รายชื่อแอดมินทั้งหมด */
export async function GET() {
  const owner = await getOwnerProfile();
  if (!owner) {
    return NextResponse.json({ error: 'เฉพาะเจ้าของระบบเท่านั้นที่จัดการผู้ใช้ได้' }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('admin_users')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin/users] list failed', error);
    return NextResponse.json({ error: 'ดึงรายชื่อไม่สำเร็จ' }, { status: 500 });
  }

  // ดึงเวลาเข้าใช้งานล่าสุดจากระบบ Auth
  let lastSignIn: Record<string, string | null> = {};
  try {
    const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    lastSignIn = Object.fromEntries(
      (authList?.users || []).map((u) => [u.id, u.last_sign_in_at ?? null])
    );
  } catch {
    // ไม่สำคัญพอจะทำให้หน้าใช้ไม่ได้
  }

  return NextResponse.json({
    ok: true,
    me: owner.id,
    data: (data || []).map((u) => ({ ...u, last_sign_in_at: lastSignIn[u.id] ?? null })),
  });
}

/** สร้างแอดมินใหม่ (สร้าง user ใน Auth + เพิ่มแถวใน admin_users) */
export async function POST(req: NextRequest) {
  const owner = await getOwnerProfile();
  if (!owner) {
    return NextResponse.json({ error: 'เฉพาะเจ้าของระบบเท่านั้นที่จัดการผู้ใช้ได้' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const fullName = String(body.full_name ?? '').trim();
  const role = String(body.role ?? 'admin');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'อีเมลไม่ถูกต้อง' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: 'สิทธิ์ไม่ถูกต้อง' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || null },
  });

  if (authError || !created?.user) {
    console.error('[admin/users] createUser failed', authError);
    const msg = /already|registered|exists/i.test(authError?.message || '')
      ? 'อีเมลนี้ถูกใช้ไปแล้ว'
      : 'สร้างผู้ใช้ไม่สำเร็จ';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: rowError } = await db.from('admin_users').insert({
    id: created.user.id,
    email,
    full_name: fullName || null,
    role,
  });

  if (rowError) {
    // ย้อนกลับ ไม่ให้เหลือ user ค้างใน Auth ที่ใช้งานไม่ได้
    await db.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    console.error('[admin/users] insert row failed', rowError);
    return NextResponse.json({ error: 'บันทึกสิทธิ์ผู้ใช้ไม่สำเร็จ' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: created.user.id, email }, { status: 201 });
}
