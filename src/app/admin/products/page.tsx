import { redirect } from 'next/navigation';
import { getAdminProfile } from '@/lib/supabase-server';
import AdminProducts from '@/components/AdminProducts';
import Logo from '@/components/Logo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'จัดการสินค้า — Happy' };

export default async function ProductsPage() {
  const admin = await getAdminProfile();
  if (!admin) redirect('/admin/login');

  return (
    <>
      <div className="admin-bar">
        <div className="admin-brand">
          <Logo className="admin-logo" />
          <div>
            <div className="title">จัดการสินค้า</div>
            <div className="who">เข้าใช้งานโดย {admin.full_name || admin.email}</div>
          </div>
        </div>
        <div className="actions" style={{ margin: 0 }}>
          <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noreferrer">
            ดูหน้าส่งคลิป
          </a>
          <a className="btn btn-ghost btn-sm" href="/admin">
            ← กลับหน้าแอดมิน
          </a>
        </div>
      </div>

      <main className="page" style={{ paddingTop: 20 }}>
        <div className="shell" style={{ maxWidth: 880 }}>
          <AdminProducts />
        </div>
      </main>
    </>
  );
}
