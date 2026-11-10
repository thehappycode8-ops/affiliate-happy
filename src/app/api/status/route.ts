import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizePhone } from '@/lib/utils';
import { getRewardSettings } from '@/lib/reward-server';

export const dynamic = 'force-dynamic';

/**
 * เช็กสถานะด้วย "เบอร์โทร" หรือ "รหัสอ้างอิง"
 * คืนเฉพาะฟิลด์ที่ผู้ส่งควรเห็น (ไม่ส่ง admin_note ออกไป)
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const query = String(body.query ?? '').trim();
  if (query.length < 4) {
    return NextResponse.json(
      { error: 'กรุณากรอกเบอร์โทร หรือรหัสอ้างอิง (เช่น HPY-2609-A3F91)' },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const digits = normalizePhone(query);
  const isPhone = digits.length >= 9;

  const base = db
    .from('submissions')
    .select('id, ref_code, first_name, last_name, phone, tiktok_username, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: subs, error } = isPhone
    ? await base.eq('phone_normalized', digits)
    : await base.ilike('ref_code', query);

  if (error) {
    console.error('[status] query failed', error);
    return NextResponse.json({ error: 'ตรวจสอบสถานะไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json(
      { error: 'ไม่พบข้อมูล กรุณาตรวจสอบเบอร์โทรหรือรหัสอ้างอิงอีกครั้ง' },
      { status: 404 }
    );
  }

  const ids = subs.map((s) => s.id);
  const { data: clips } = await db
    .from('clips')
    .select(
      'id, submission_id, seq, clip_url, gen_code, code_expires_at, code_valid_days, products, content_type, status, feedback, reject_reason, created_at, reviewed_at'
    )
    .in('submission_id', ids)
    .order('seq', { ascending: true });

  const today = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  );
  today.setHours(0, 0, 0, 0);

  const results = subs.map((s) => ({
    id: s.id,
    ref_code: s.ref_code,
    full_name: `${s.first_name} ${s.last_name}`,
    tiktok_username: s.tiktok_username,
    phone_masked: s.phone ? s.phone.replace(/\d(?=\d{4})/g, 'x') : null,
    created_at: s.created_at,
    clips: (clips || [])
      .filter((c) => c.submission_id === s.id)
      .map((c) => ({
        ...c,
        days_to_expire: c.code_expires_at
          ? Math.round(
              (new Date(`${c.code_expires_at}T00:00:00+07:00`).getTime() - today.getTime()) /
                86400000
            )
          : null,
      })),
  }));

  // นับรวมทุกครั้งที่ส่งของคนคนนี้ เพื่อดูว่าครบเงื่อนไขรับรางวัลหรือยัง
  const all = clips || [];
  const summary = {
    total: all.length,
    approved: all.filter((c) => c.status === 'approved').length,
    pending: all.filter((c) => c.status === 'pending').length,
    rejected: all.filter((c) => c.status === 'rejected').length,
  };

  const reward = await getRewardSettings();
  const owner = subs[0];

  return NextResponse.json({
    ok: true,
    results,
    summary,
    owner: {
      full_name: `${owner.first_name} ${owner.last_name}`,
      tiktok_username: owner.tiktok_username,
    },
    reward: reward.enabled
      ? {
          ...reward,
          achieved: reward.target_clips !== null && summary.approved >= reward.target_clips,
          remaining:
            reward.target_clips === null ? 0 : Math.max(0, reward.target_clips - summary.approved),
        }
      : null,
  });
}
