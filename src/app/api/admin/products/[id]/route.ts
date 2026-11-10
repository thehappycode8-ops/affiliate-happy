import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminProfile } from '@/lib/supabase-server';
import { uploadProductImage } from '@/lib/product-image';

export const dynamic = 'force-dynamic';

/** แก้ชื่อ / ชื่อบนแพ็กเกจ / ลำดับ / เปิด-ปิด / เปลี่ยนรูป */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const { id } = await ctx.params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};

  const { data: current } = await db
    .from('products')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: 'ไม่พบสินค้านี้' }, { status: 404 });

  if (form.has('name')) {
    const name = String(form.get('name')).trim();
    if (name.length < 2) return NextResponse.json({ error: 'กรุณากรอกชื่อสินค้า' }, { status: 400 });
    if (name.length > 120) return NextResponse.json({ error: 'ชื่อสินค้ายาวเกินไป' }, { status: 400 });
    patch.name = name;
  }
  if (form.has('sub')) patch.sub = String(form.get('sub')).trim() || null;
  if (form.has('sort_order')) {
    const n = Number(form.get('sort_order'));
    if (Number.isFinite(n)) patch.sort_order = n;
  }
  if (form.has('is_active')) patch.is_active = String(form.get('is_active')) === 'true';

  const file = form.get('image');
  if (file instanceof File && file.size > 0) {
    const up = await uploadProductImage(file);
    if (up.error) return NextResponse.json({ error: up.error }, { status: 400 });
    patch.image_url = up.url ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { status: 400 });
  }

  const { error } = await db.from('products').update(patch).eq('id', id);
  if (error) {
    console.error('[products] update failed', error);
    const msg = error.code === '23505' ? 'มีสินค้าชื่อนี้อยู่แล้ว' : 'อัปเดตไม่สำเร็จ';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // เปลี่ยนชื่อสินค้า -> อัปเดตชื่อในคลิปที่เคยเลือกไว้ด้วย ข้อมูลเก่าจะได้ไม่ค้างชื่อเดิม
  if (patch.name && patch.name !== current.name) {
    const { error: renameError } = await db.rpc('rename_product_in_clips', {
      old_name: current.name,
      new_name: patch.name,
    });
    if (renameError) console.error('[products] rename in clips failed', renameError);
  }

  return NextResponse.json({ ok: true });
}

/** ลบสินค้าออกจากรายการ (คลิปเก่าที่เคยเลือกไว้ยังเก็บชื่อเดิมไว้) */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from('products').delete().eq('id', id);

  if (error) {
    console.error('[products] delete failed', error);
    return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
