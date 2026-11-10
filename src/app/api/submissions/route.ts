import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { addDaysISO, isLikelyUrl, isValidThaiPhone, normalizeTikTok } from '@/lib/utils';
import { MAX_CLIPS, MAX_CODE_DAYS, MAX_PRODUCTS, MIN_CODE_DAYS } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ClipInput {
  clip_url?: string;
  gen_code?: string;
  code_valid_days?: number | string;
  products?: string[];
  content_type?: string;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const phone = String(body.phone ?? '').trim();
  const firstName = String(body.first_name ?? '').trim();
  const lastName = String(body.last_name ?? '').trim();
  const tiktok = normalizeTikTok(String(body.tiktok_username ?? ''));
  const profileUrl = String(body.tiktok_profile_url ?? '').trim();
  const rawClips = Array.isArray(body.clips) ? (body.clips as ClipInput[]) : [];

  if (!isValidThaiPhone(phone)) {
    return NextResponse.json({ error: 'เบอร์โทรไม่ถูกต้อง' }, { status: 400 });
  }
  if (!firstName) return NextResponse.json({ error: 'กรุณากรอกชื่อ' }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: 'กรุณากรอกนามสกุล' }, { status: 400 });
  if (tiktok.length < 3) {
    return NextResponse.json({ error: 'กรุณากรอก TikTok username' }, { status: 400 });
  }
  if (!profileUrl) {
    return NextResponse.json({ error: 'กรุณาวางลิงก์หน้าโปรไฟล์ TikTok' }, { status: 400 });
  }
  if (!isLikelyUrl(profileUrl)) {
    return NextResponse.json(
      { error: 'ลิงก์หน้าโปรไฟล์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)' },
      { status: 400 }
    );
  }
  if (!/tiktok\.com/i.test(profileUrl)) {
    return NextResponse.json(
      { error: 'ลิงก์หน้าโปรไฟล์ต้องเป็นลิงก์ของ TikTok (มี tiktok.com)' },
      { status: 400 }
    );
  }

  const clips = rawClips
    .map((c, i) => ({
      seq: i + 1,
      clip_url: String(c.clip_url ?? '').trim(),
      gen_code: String(c.gen_code ?? '').trim(),
      code_valid_days: Number(c.code_valid_days),
      products: Array.isArray(c.products)
        ? c.products.map((x) => String(x).trim()).filter(Boolean).slice(0, MAX_PRODUCTS)
        : [],
      content_type: String(c.content_type ?? '').trim(),
    }))
    .filter((c) => c.clip_url || c.gen_code);

  if (clips.length === 0) {
    return NextResponse.json({ error: 'กรุณากรอกอย่างน้อย 1 คลิป' }, { status: 400 });
  }
  if (clips.length > MAX_CLIPS) {
    return NextResponse.json({ error: `ส่งได้สูงสุด ${MAX_CLIPS} คลิปต่อครั้ง` }, { status: 400 });
  }

  for (const c of clips) {
    if (!isLikelyUrl(c.clip_url)) {
      return NextResponse.json(
        { error: `คลิปที่ ${c.seq}: ลิงก์คลิปไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)` },
        { status: 400 }
      );
    }
    if (!c.gen_code) {
      return NextResponse.json(
        { error: `คลิปที่ ${c.seq}: กรุณากรอก Gen Code` },
        { status: 400 }
      );
    }
    if (c.products.length === 0) {
      return NextResponse.json(
        { error: `คลิปที่ ${c.seq}: กรุณาเลือกสินค้าอย่างน้อย 1 รายการ` },
        { status: 400 }
      );
    }
    if (!c.code_valid_days) {
      return NextResponse.json(
        { error: `คลิปที่ ${c.seq}: กรุณาเลือกอายุของโค้ด` },
        { status: 400 }
      );
    }
    if (
      !Number.isInteger(c.code_valid_days) ||
      c.code_valid_days < MIN_CODE_DAYS ||
      c.code_valid_days > MAX_CODE_DAYS
    ) {
      return NextResponse.json(
        { error: `คลิปที่ ${c.seq}: อายุของโค้ดต้องเป็นจำนวนวัน ${MIN_CODE_DAYS}–${MAX_CODE_DAYS}` },
        { status: 400 }
      );
    }
  }

  // กัน Gen Code ซ้ำภายในฟอร์มเดียวกัน
  const codes = clips.map((c) => c.gen_code.toLowerCase());
  const dupIndex = codes.findIndex((c, i) => codes.indexOf(c) !== i);
  if (dupIndex !== -1) {
    return NextResponse.json(
      { error: `มี Gen Code ซ้ำกันในฟอร์ม: ${clips[dupIndex].gen_code}` },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // กัน Gen Code ที่เคยส่งเข้ามาแล้ว
  const { data: existing } = await db
    .from('clips')
    .select('gen_code')
    .in('gen_code', clips.map((c) => c.gen_code));

  if (existing && existing.length > 0) {
    return NextResponse.json(
      {
        error: `Gen Code นี้เคยส่งเข้ามาแล้ว: ${existing.map((e) => e.gen_code).join(', ')}`,
      },
      { status: 409 }
    );
  }

  const { data: submission, error: subError } = await db
    .from('submissions')
    .insert({
      phone,
      first_name: firstName,
      last_name: lastName,
      tiktok_username: tiktok,
      tiktok_profile_url: profileUrl,
    })
    .select('id, ref_code')
    .single();

  if (subError || !submission) {
    console.error('[submissions] insert failed', subError);
    return NextResponse.json({ error: 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  const { error: clipError } = await db.from('clips').insert(
    clips.map((c) => ({
      submission_id: submission.id,
      seq: c.seq,
      clip_url: c.clip_url,
      gen_code: c.gen_code,
      // วันหมดอายุคำนวณจากฝั่งเซิร์ฟเวอร์ = วันที่ส่ง + อายุโค้ดที่เลือก (เวลาไทย)
      code_valid_days: c.code_valid_days,
      code_expires_at: addDaysISO(c.code_valid_days),
      products: c.products,
      content_type: c.content_type || null,
    }))
  );

  if (clipError) {
    // ย้อนกลับ ไม่ให้เหลือแถวผู้ส่งที่ไม่มีคลิป
    await db.from('submissions').delete().eq('id', submission.id);
    console.error('[submissions] clips insert failed', clipError);
    const msg =
      clipError.code === '23505'
        ? 'มี Gen Code ซ้ำกับที่เคยส่งเข้ามาแล้ว'
        : 'บันทึกคลิปไม่สำเร็จ กรุณาลองใหม่';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, ref_code: submission.ref_code, clip_count: clips.length },
    { status: 201 }
  );
}
