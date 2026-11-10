import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** รีเฟรช session cookie ของแอดมินให้ไม่หมดอายุระหว่างใช้งาน */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // ถ้า refresh token ถูกหมุนไปแล้ว (เช่น เปิดหลายแท็บพร้อมกัน) จะโยน AuthApiError
  // ปล่อยผ่านไปเฉย ๆ แล้วให้หน้า /admin เป็นคนพาไปหน้าเข้าสู่ระบบเอง
  try {
    await supabase.auth.getUser();
  } catch {
    /* session หมดอายุ — ไม่ต้องทำอะไร */
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
