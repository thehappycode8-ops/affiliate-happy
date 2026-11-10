import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminProfile } from '@/lib/supabase-server';
import { DATE_FIELDS, STATUS_LABEL, type ClipStatus, type DateField } from '@/lib/types';
import { dayEndUTC, dayStartUTC } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join(' | ') : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const admin = await getAdminProfile();
  if (!admin) return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const expiry = searchParams.get('expiry') || '';
  const product = searchParams.get('product') || '';
  const ad = searchParams.get('ad') || '';

  const rawField = searchParams.get('date_field') || 'created_at';
  const dateField: DateField = rawField in DATE_FIELDS ? (rawField as DateField) : 'created_at';
  const gte = dayStartUTC(searchParams.get('date_from') || '');
  const lte = dayEndUTC(searchParams.get('date_to') || '');

  const db = supabaseAdmin();
  let query = db
    .from('v_clips_full')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10000);

  if (status) query = query.eq('status', status);
  if (expiry === 'soon') query = query.gte('days_to_expire', 0).lte('days_to_expire', 7);
  if (expiry === 'expired') query = query.lt('days_to_expire', 0);
  if (product) query = query.contains('products', [product]);
  if (ad === 'yes') query = query.eq('status', 'approved').eq('ad_boosted', true);
  if (ad === 'no') query = query.eq('status', 'approved').eq('ad_boosted', false);
  if (gte) query = query.gte(dateField, gte);
  if (lte) query = query.lte(dateField, lte);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });

  const headers = [
    'รหัสอ้างอิง',
    'ชื่อ',
    'นามสกุล',
    'เบอร์โทร',
    'TikTok username',
    'ลิงก์หน้าโปรไฟล์',
    'คลิปที่',
    'ลิงก์คลิป',
    'Gen Code',
    'อายุโค้ด (วัน)',
    'วันหมดอายุของโค้ด',
    'เหลืออีก (วัน)',
    'สินค้า',
    'ประเภทคอนเทนต์',
    'สถานะ',
    'ความคิดเห็นถึงผู้ส่ง',
    'เหตุผลที่ไม่อนุมัติ',
    'หมายเหตุแอดมิน',
    'วันที่ส่ง',
    'วันที่อนุมัติ / ตรวจ',
    'ยิงแอดแล้ว',
    'วันที่ติ๊กยิงแอด',
    'ผู้ติ๊กยิงแอด',
  ];

  const lines = [headers.map(csvCell).join(',')];
  for (const r of data || []) {
    lines.push(
      [
        r.ref_code,
        r.first_name,
        r.last_name,
        r.phone,
        r.tiktok_username,
        r.tiktok_profile_url,
        r.seq,
        r.clip_url,
        r.gen_code,
        r.code_valid_days,
        r.code_expires_at,
        r.days_to_expire,
        r.products,
        r.content_type,
        STATUS_LABEL[r.status as ClipStatus] ?? r.status,
        r.feedback,
        r.reject_reason,
        r.admin_note,
        r.created_at,
        r.reviewed_at,
        r.ad_boosted ? 'ยิงแอดแล้ว' : 'ยังไม่ยิง',
        r.ad_boosted_at,
        r.ad_boosted_by,
      ]
        .map(csvCell)
        .join(',')
    );
  }

  // BOM เพื่อให้ Excel อ่านภาษาไทยได้ถูกต้อง
  const csv = '﻿' + lines.join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clips-hpy-${stamp}.csv"`,
    },
  });
}
