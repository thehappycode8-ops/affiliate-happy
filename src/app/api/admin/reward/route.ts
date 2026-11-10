import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminProfile } from '@/lib/supabase-server';
import { getRewardSettings } from '@/lib/reward-server';
import { uploadRewardImage } from '@/lib/product-image';

export const dynamic = 'force-dynamic';

/** อ่านค่ารางวัลปัจจุบัน (หลังบ้าน) */
export async function GET() {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const data = await getRewardSettings();
  return NextResponse.json({ ok: true, data });
}

/** บันทึกค่ารางวัล — ส่งมาเป็น multipart/form-data (แนบโปสเตอร์ได้) */
export async function PATCH(req: NextRequest) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  // เว้นว่าง / 0 = ไม่กำหนดจำนวนคลิป
  const targetRaw = String(form.get('target_clips') ?? '').trim();
  let target: number | null = null;
  if (targetRaw !== '' && targetRaw !== '0' && targetRaw !== 'null') {
    const n = Number(targetRaw);
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      return NextResponse.json({ error: 'จำนวนคลิปต้องเป็นตัวเลข 1–999 หรือเลือก "ไม่กำหนด"' }, { status: 400 });
    }
    target = n;
  }

  const title = String(form.get('prize_title') ?? '').trim();
  if (title.length < 2) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อรางวัล' }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'ชื่อรางวัลยาวเกินไป' }, { status: 400 });
  }

  const headline = String(form.get('headline') ?? '').trim() || 'คุณคือผู้พิชิตรางวัล';

  const current = await getRewardSettings();

  // รูป: แนบไฟล์ใหม่ = เปลี่ยนรูป, ส่ง remove_image = เอารูปออก, ไม่ส่งอะไร = คงรูปเดิม
  let imageUrl: string | null = current.image_url;
  const file = form.get('image');
  if (file instanceof File && file.size > 0) {
    const up = await uploadRewardImage(file);
    if (up.error) return NextResponse.json({ error: up.error }, { status: 400 });
    imageUrl = up.url ?? null;
  } else if (String(form.get('remove_image')) === 'true') {
    imageUrl = null;
  }

  const row = {
    id: 1,
    enabled: String(form.get('enabled')) !== 'false',
    target_clips: target,
    prize_title: title,
    prize_detail: String(form.get('prize_detail') ?? '').trim() || null,
    headline: headline.slice(0, 120),
    contact_note: String(form.get('contact_note') ?? '').trim() || null,
    image_url: imageUrl,
    popup_enabled: String(form.get('popup_enabled')) !== 'false',
    contact_title: String(form.get('contact_title') ?? '').trim().slice(0, 80) || null,
    contact_line_url: String(form.get('contact_line_url') ?? '').trim().slice(0, 300) || null,
    contact_line_id: String(form.get('contact_line_id') ?? '').trim().slice(0, 80) || null,
  };
  if (row.contact_line_url && !/^https?:\/\//i.test(row.contact_line_url)) {
    return NextResponse.json({ error: 'ลิงก์ Line ต้องขึ้นต้นด้วย https://' }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from('reward_settings').upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('[reward] save failed', error);
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, image_url: row.image_url });
}
