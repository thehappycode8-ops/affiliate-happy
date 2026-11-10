import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminProfile } from '@/lib/supabase-server';
import type { ClipStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** ลบหลายคลิปพร้อมกัน — เฉพาะเจ้าของระบบ (owner)
 *  ถ้าลบจนผู้ส่งคนนั้นไม่เหลือคลิปเลย จะลบแถวผู้ส่งทิ้งด้วย ไม่ให้มีข้อมูลค้าง */
export async function DELETE(req: NextRequest) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
  if (admin.role !== 'owner') {
    return NextResponse.json({ error: 'เฉพาะเจ้าของระบบเท่านั้นที่ลบข้อมูลได้' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(String).slice(0, 200) : [];
  if (ids.length === 0) return NextResponse.json({ error: 'ยังไม่ได้เลือกคลิป' }, { status: 400 });

  const db = supabaseAdmin();

  // จำไว้ก่อนว่าคลิปพวกนี้เป็นของผู้ส่งคนไหนบ้าง
  const { data: before } = await db.from('clips').select('submission_id').in('id', ids);
  const subIds = Array.from(new Set((before || []).map((r) => r.submission_id)));

  const { error } = await db.from('clips').delete().in('id', ids);
  if (error) {
    console.error('[admin/bulk] delete failed', error);
    return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 400 });
  }

  // ผู้ส่งคนไหนไม่เหลือคลิปแล้ว ลบแถวผู้ส่งทิ้งด้วย
  let removedSubs = 0;
  for (const sid of subIds) {
    const { count } = await db
      .from('clips')
      .select('id', { count: 'exact', head: true })
      .eq('submission_id', sid);
    if (!count) {
      await db.from('submissions').delete().eq('id', sid);
      removedSubs++;
    }
  }

  return NextResponse.json({ ok: true, deleted: ids.length, removed_submissions: removedSubs });
}

/** อนุมัติ / ไม่อนุมัติ หลายคลิปพร้อมกัน */
export async function POST(req: NextRequest) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(String).slice(0, 200) : [];
  const status = String(body.status ?? '') as ClipStatus;
  const rejectReason = String(body.reject_reason ?? '').trim();

  if (ids.length === 0) return NextResponse.json({ error: 'ยังไม่ได้เลือกคลิป' }, { status: 400 });
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
  }
  if (status === 'rejected' && !rejectReason) {
    return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from('clips')
    .update({
      status,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      ...(status === 'rejected' ? { reject_reason: rejectReason } : {}),
      // ถอนอนุมัติแล้ว สถานะ "ยิงแอดแล้ว" ต้องไม่ค้าง
      ...(status !== 'approved'
        ? { ad_boosted: false, ad_boosted_at: null, ad_boosted_by: null }
        : {}),
    })
    .in('id', ids);

  if (error) {
    console.error('[admin/bulk] update failed', error);
    return NextResponse.json({ error: 'อัปเดตไม่สำเร็จ' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updated: ids.length });
}

/** ติ๊ก / ยกเลิกติ๊ก "ยิงแอดแล้ว" หลายคลิปพร้อมกัน
 *  ติ๊กได้เฉพาะคลิปที่อนุมัติแล้ว — คลิปอื่นในชุดที่เลือกจะถูกข้ามไป */
export async function PATCH(req: NextRequest) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(String).slice(0, 200) : [];
  if (ids.length === 0) return NextResponse.json({ error: 'ยังไม่ได้เลือกคลิป' }, { status: 400 });
  if (typeof body.ad_boosted !== 'boolean') {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const on = body.ad_boosted;
  const db = supabaseAdmin();

  const { data: rows, error: readErr } = await db
    .from('clips')
    .select('id, status')
    .in('id', ids);
  if (readErr) {
    console.error('[admin/bulk] ad read failed', readErr);
    return NextResponse.json({ error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }

  const eligible = (rows || []).filter((r) => r.status === 'approved').map((r) => r.id);
  const skipped = ids.length - eligible.length;

  if (eligible.length === 0) {
    return NextResponse.json(
      { error: 'คลิปที่เลือกยังไม่ได้อนุมัติ — ติ๊ก "ยิงแอดแล้ว" ไม่ได้' },
      { status: 400 }
    );
  }

  const { error } = await db
    .from('clips')
    .update({
      ad_boosted: on,
      ad_boosted_at: on ? new Date().toISOString() : null,
      ad_boosted_by: on ? admin.email : null,
    })
    .in('id', eligible);

  if (error) {
    console.error('[admin/bulk] ad update failed', error);
    return NextResponse.json({ error: 'อัปเดตไม่สำเร็จ' }, { status: 400 });
  }

  await db.from('clip_events').insert(
    eligible.map((id) => ({
      clip_id: id,
      message: on ? 'ติ๊กว่ายิงแอดแล้ว' : 'ยกเลิกการติ๊กว่ายิงแอดแล้ว',
      actor: admin.email,
    }))
  );

  return NextResponse.json({ ok: true, updated: eligible.length, skipped });
}
