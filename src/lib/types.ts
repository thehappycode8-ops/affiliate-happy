export type ClipStatus = 'pending' | 'approved' | 'rejected';

export const MAX_CLIPS = 20;

/** จำนวนสินค้าสูงสุดที่เลือกได้ต่อ 1 คลิป
 *  อยู่ในไฟล์นี้ (ไม่ใช่ products.ts ที่เป็น 'use client')
 *  เพราะ API route ฝั่งเซิร์ฟเวอร์ต้องอ่านค่าเป็นตัวเลขจริง */
export const MAX_PRODUCTS = 10;

/** ตัวเลือก "อายุโค้ด" ที่นายหน้าเลือกได้ (นับจากวันที่ส่งเข้ามา)
 *  ล้อตามตัวเลือกของ TikTok — 7 / 30 / 60 / 180 / 365 วัน */
export const CODE_DURATIONS = [7, 30, 60, 180, 365];

/** ถ้าเลือก "กำหนดเอง" ใส่ได้กี่วัน */
export const MIN_CODE_DAYS = 1;
export const MAX_CODE_DAYS = 3650;

/** ฟิลด์วันที่ที่ใช้กรองได้ในหน้าหลังบ้าน */
export const DATE_FIELDS = {
  created_at: 'วันที่ส่ง',
  reviewed_at: 'วันที่อนุมัติ / ตรวจ',
} as const;

export type DateField = keyof typeof DATE_FIELDS;

export const STATUS_LABEL: Record<ClipStatus, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
};

/** ตัวเลือก "ประเภทคอนเทนต์" — แก้ได้ตามแคมเปญ */
export const CONTENT_TYPES = [
  'คลิปรีวิว',
  'ไลฟ์',
  'ก่อน-หลัง',
  'สอนใช้ / How to',
  'Unbox',
  'อื่น ๆ',
];

export interface Submission {
  id: string;
  ref_code: string;
  phone: string;
  first_name: string;
  last_name: string;
  tiktok_username: string;
  tiktok_profile_url: string;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: string;
  submission_id: string;
  seq: number;
  clip_url: string;
  gen_code: string | null;
  code_expires_at: string | null;
  /** อายุโค้ดที่นายหน้าเลือกตอนส่ง (วัน) — นับจากวันที่ส่ง */
  code_valid_days: number | null;
  products: string[];
  content_type: string | null;
  status: ClipStatus;
  feedback: string | null;
  admin_note: string | null;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  /** ยิงแอดแล้วหรือยัง — ติ๊กได้เฉพาะคลิปที่อนุมัติแล้ว */
  ad_boosted: boolean;
  ad_boosted_at: string | null;
  ad_boosted_by: string | null;
  created_at: string;
  updated_at: string;
}

/** แถวจาก view v_clips_full — คลิป + ข้อมูลผู้ส่ง */
export interface ClipFull extends Clip {
  ref_code: string;
  phone: string;
  phone_normalized: string;
  first_name: string;
  last_name: string;
  full_name: string;
  tiktok_username: string;
  tiktok_profile_url: string | null;
  days_to_expire: number | null;
}

export interface ClipEvent {
  id: number;
  clip_id: string;
  status: ClipStatus | null;
  message: string | null;
  actor: string | null;
  created_at: string;
}

export interface ClipStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  today: number;
  expiring_soon: number;
  expired: number;
  /** อนุมัติแล้ว + ติ๊กว่ายิงแอดแล้ว */
  ad_boosted: number;
  /** อนุมัติแล้ว แต่ยังไม่ได้ยิงแอด */
  ad_waiting: number;
  submitters: number;
}
