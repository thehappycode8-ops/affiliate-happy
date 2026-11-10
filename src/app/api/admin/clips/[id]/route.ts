import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminProfile } from '@/lib/supabase-server';
import type { ClipStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED: ClipStatus[] = ['pending', 'approved', 'rejected'];

/** สถานะปัจจุบันของคลิปในฐานข้อมูล */
async function currentStatus(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from('clips').select('status').eq('id', id).maybeSingle();
  return data?.status ?? null;
}

/** รายละเอียดคลิป + ไทม์ไลน์ */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const { data, error } = await db.from('v_clips_full').select('*').eq('id', id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'ไม่พบคลิปนี้' }, { status: 404 });

  const { data: events } = await db
    .from('clip_events')
    .select('*')
    .eq('clip_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ok: true, data, events: events || [] });
}

/** อนุมัติ / ไม่อนุมัติ / แก้ไขข้อมูลคลิป */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const status = String(body.status) as ClipStatus;
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }
    if (status === 'rejected' && !String(body.reject_reason ?? '').trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ (ผู้ส่งจะเห็นข้อความนี้)' },
        { status: 400 }
      );
    }
    patch.status = status;
    patch.reviewed_by = admin.id;
    patch.reviewed_at = new Date().toISOString();
  }

  if (body.gen_code !== undefined) {
    patch.gen_code = String(body.gen_code).trim() || null;
  }

  // ติ๊ก "ยิงแอดแล้ว" — ได้เฉพาะคลิปที่อนุมัติแล้ว
  let adEvent: string | null = null;
  if (body.ad_boosted !== undefined) {
    const on = body.ad_boosted === true || body.ad_boosted === 'true';
    if (on) {
      const statusAfter =
        patch.status !== undefined ? String(patch.status) : await currentStatus(id);
      if (statusAfter !== 'approved') {
        return NextResponse.json(
          { error: 'ติ๊ก "ยิงแอดแล้ว" ได้เฉพาะคลิปที่อนุมัติแล้ว' },
          { status: 400 }
        );
      }
    }
    patch.ad_boosted = on;
    patch.ad_boosted_at = on ? new Date().toISOString() : null;
    patch.ad_boosted_by = on ? admin.email : null;
    adEvent = on ? `ติ๊กว่ายิงแอดแล้ว` : 'ยกเลิกการติ๊กว่ายิงแอดแล้ว';
  }

  // ถ้าถอนอนุมัติ ให้ล้างสถานะยิงแอดด้วย ไม่ให้ค้างเป็นข้อมูลที่ขัดกัน
  if (patch.status !== undefined && patch.status !== 'approved' && body.ad_boosted === undefined) {
    patch.ad_boosted = false;
    patch.ad_boosted_at = null;
    patch.ad_boosted_by = null;
  }

  if (body.code_expires_at !== undefined) {
    const v = String(body.code_expires_at).trim();
    if (v && Number.isNaN(Date.parse(v))) {
      return NextResponse.json({ error: 'วันหมดอายุของโค้ดไม่ถูกต้อง' }, { status: 400 });
    }
    patch.code_expires_at = v || null;
  }
  if (body.products !== undefined) {
    patch.products = Array.isArray(body.products)
      ? body.products.map((x) => String(x).trim()).filter(Boolean).slice(0, 10)
      : [];
  }
  if (body.content_type !== undefined) patch.content_type = String(body.content_type).trim() || null;
  if (body.feedback !== undefined) patch.feedback = String(body.feedback).trim() || null;
  if (body.admin_note !== undefined) patch.admin_note = String(body.admin_note).trim() || null;
  if (body.reject_reason !== undefined) {
    patch.reject_reason = String(body.reject_reason).trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { error } = await db.from('clips').update(patch).eq('id', id);
  if (error) {
    console.error('[admin/clips/:id] update failed', error);
    const msg =
      error.code === '23505' ? 'Gen Code นี้ถูกใช้ไปแล้ว' : 'อัปเดตไม่สำเร็จ';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // trigger บันทึกเหตุการณ์เป็น 'system' — เขียนทับด้วยอีเมลแอดมินที่กดจริง
  if (patch.status !== undefined) {
    const { data: latest } = await db
      .from('clip_events')
      .select('id')
      .eq('clip_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) await db.from('clip_events').update({ actor: admin.email }).eq('id', latest.id);
  }

  if (adEvent) {
    await db.from('clip_events').insert({ clip_id: id, message: adEvent, actor: admin.email });
  }

  if (body.event_message) {
    await db.from('clip_events').insert({
      clip_id: id,
      message: String(body.event_message).trim(),
      actor: admin.email,
    });
  }

  const { data: fresh } = await db.from('v_clips_full').select('*').eq('id', id).maybeSingle();
  return NextResponse.json({ ok: true, data: fresh });
}

/** ลบคลิปนี้ — เฉพาะเจ้าของระบบ (owner)
 *  ถ้าเป็นคลิปสุดท้ายของผู้ส่งคนนั้น จะลบแถวผู้ส่งทิ้งด้วย */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
  if (admin.role !== 'owner') {
    return NextResponse.json({ error: 'เฉพาะเจ้าของระบบเท่านั้นที่ลบข้อมูลได้' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const { data: clip } = await db
    .from('clips')
    .select('submission_id')
    .eq('id', id)
    .maybeSingle();
  if (!clip) return NextResponse.json({ error: 'ไม่พบคลิปนี้' }, { status: 404 });

  const { error } = await db.from('clips').delete().eq('id', id);
  if (error) {
    console.error('[admin/clips] delete failed', error);
    return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 400 });
  }

  const { count } = await db
    .from('clips')
    .select('id', { count: 'exact', head: true })
    .eq('submission_id', clip.submission_id);

  let removedSubmission = false;
  if (!count) {
    await db.from('submissions').delete().eq('id', clip.submission_id);
    removedSubmission = true;
  }

  return NextResponse.json({ ok: true, removed_submission: removedSubmission });
}
