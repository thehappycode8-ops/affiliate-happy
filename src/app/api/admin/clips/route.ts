import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminProfile } from '@/lib/supabase-server';
import { dayEndUTC, dayStartUTC } from '@/lib/utils';
import { DATE_FIELDS, type DateField } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const expiry = searchParams.get('expiry') || '';   // 'soon' | 'expired'
  const product = searchParams.get('product') || '';
  const ad = searchParams.get('ad') || '';           // 'yes' | 'no'
  const q = (searchParams.get('q') || '').trim();

  // ตัวกรองวันที่ — เลือกได้ว่าจะกรองด้วย "วันที่ส่ง" หรือ "วันที่อนุมัติ / ตรวจ"
  const rawField = searchParams.get('date_field') || 'created_at';
  const dateField: DateField = rawField in DATE_FIELDS ? (rawField as DateField) : 'created_at';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const perPage = Math.min(100, Math.max(10, Number(searchParams.get('per_page') || 25)));
  const from = (page - 1) * perPage;

  const db = supabaseAdmin();
  let query = db
    .from('v_clips_full')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('seq', { ascending: true })
    .range(from, from + perPage - 1);

  if (status) query = query.eq('status', status);
  if (expiry === 'soon') query = query.gte('days_to_expire', 0).lte('days_to_expire', 7);
  if (expiry === 'expired') query = query.lt('days_to_expire', 0);
  if (product) query = query.contains('products', [product]);

  // ยิงแอดแล้ว / ยังไม่ยิง — นับเฉพาะคลิปที่อนุมัติแล้ว ให้ตรงกับการ์ดสรุป
  if (ad === 'yes') query = query.eq('status', 'approved').eq('ad_boosted', true);
  if (ad === 'no') query = query.eq('status', 'approved').eq('ad_boosted', false);

  const gte = dayStartUTC(dateFrom);
  const lte = dayEndUTC(dateTo);
  if (gte) query = query.gte(dateField, gte);
  if (lte) query = query.lte(dateField, lte);

  if (q) {
    const digits = q.replace(/[^0-9]/g, '');
    const parts = [
      `first_name.ilike.%${q}%`,
      `last_name.ilike.%${q}%`,
      `tiktok_username.ilike.%${q}%`,
      `ref_code.ilike.%${q}%`,
      `gen_code.ilike.%${q}%`,
      `clip_url.ilike.%${q}%`,
    ];
    if (digits.length >= 3) parts.push(`phone_normalized.ilike.%${digits}%`);
    query = query.or(parts.join(','));
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('[admin/clips] list failed', error);
    return NextResponse.json({ error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }

  const { data: stats } = await db.from('v_clip_stats').select('*').maybeSingle();

  return NextResponse.json({
    ok: true,
    data,
    stats,
    page,
    per_page: perPage,
    total: count ?? 0,
  });
}
