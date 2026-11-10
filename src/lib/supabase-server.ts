import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase-admin';

/** Supabase client ที่อ่าน session ของแอดมินจาก cookie (ฝั่งเซิร์ฟเวอร์) */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // เรียกจาก Server Component — middleware จะรีเฟรช session ให้เอง
          }
        },
      },
    }
  );
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

/**
 * คืนค่าโปรไฟล์แอดมินถ้าผู้ใช้ล็อกอินอยู่ "และ" มีชื่ออยู่ในตาราง admin_users
 * ที่ is_active = true มิฉะนั้นคืน null
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const supabase = await createSupabaseServerClient();

  // session หมดอายุ / refresh token ถูกหมุนไปแล้ว จะโยน AuthApiError ออกมา
  // ให้ถือว่า "ยังไม่ได้ล็อกอิน" แล้วพาไปหน้าเข้าสู่ระบบ ไม่ต้องพ่น stack trace ลง log
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return null;
  }

  if (!user) return null;

  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
  };
}

/** คืนโปรไฟล์เฉพาะเมื่อผู้ใช้เป็น owner (สิทธิ์จัดการผู้ใช้) */
export async function getOwnerProfile(): Promise<AdminProfile | null> {
  const admin = await getAdminProfile();
  return admin && admin.role === 'owner' ? admin : null;
}
