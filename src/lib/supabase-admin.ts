import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client ที่ใช้ service_role key — ใช้ได้เฉพาะฝั่งเซิร์ฟเวอร์เท่านั้น
 * (API route / server component) ห้าม import เข้าไฟล์ที่มี 'use client'
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน environment variables'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
