import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminProfile } from '@/lib/supabase-server';
import { listProducts } from '@/lib/products-server';
import { uploadProductImage } from '@/lib/product-image';

export const dynamic = 'force-dynamic';

/** รายการสินค้าทั้งหมด (รวมที่ปิดใช้งาน) */
export async function GET() {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const data = await listProducts(false);
  return NextResponse.json({ ok: true, data });
}

/** เพิ่มสินค้าใหม่ — ส่งมาเป็น multipart/form-data (มีไฟล์รูปได้) */
export async function POST(req: NextRequest) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const name = String(form.get('name') ?? '').trim();
  const sub = String(form.get('sub') ?? '').trim();
  const sortOrder = Number(form.get('sort_order') ?? 100);
  const file = form.get('image');

  if (name.length < 2) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อสินค้า' }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: 'ชื่อสินค้ายาวเกินไป' }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const up = await uploadProductImage(file);
    if (up.error) return NextResponse.json({ error: up.error }, { status: 400 });
    imageUrl = up.url ?? null;
  }

  const { data, error } = await supabaseAdmin()
    .from('products')
    .insert({
      name,
      sub: sub || null,
      image_url: imageUrl,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 100,
    })
    .select('id, name')
    .single();

  if (error) {
    console.error('[products] insert failed', error);
    const msg = error.code === '23505' ? 'มีสินค้าชื่อนี้อยู่แล้ว' : 'บันทึกสินค้าไม่สำเร็จ';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
