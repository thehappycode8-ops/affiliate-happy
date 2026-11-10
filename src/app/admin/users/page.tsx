import { redirect } from 'next/navigation';
import { getAdminProfile } from '@/lib/supabase-server';
import AdminUsers from '@/components/AdminUsers';
import Logo from '@/components/Logo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'บัญชีแอดมิน — Happy' };

export default async function UsersPage() {
  const admin = await getAdminProfile();
  if (!admin) redirect('/admin/login');

  if (admin.role !== 'owner') {
    return (
      <main className="page">
        <div className="shell">
          <div className="card" style={{ marginTop: 40 }}>
            <h2>เข้าหน้านี้ไม่ได้</h2>
            <p className="sub">
              หน้าบัญชีแอดมินเปิดให้เฉพาะเจ้าของระบบ (owner) เท่านั้น
              หากต้องการสิทธิ์นี้ให้ติดต่อเจ้าของระบบ
            </p>
            <a className="btn btn-ghost btn-sm" href="/admin">
              ← กลับหน้าแอดมิน
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="admin-bar">
        <div className="admin-brand">
          <Logo className="admin-logo" />
          <div>
            <div className="title">บัญชีแอดมิน</div>
            <div className="who">เข้าใช้งานโดย {admin.full_name || admin.email}</div>
          </div>
        </div>
        <div className="actions" style={{ margin: 0 }}>
          <a className="btn btn-ghost btn-sm" href="/admin">
            ← กลับหน้าแอดมิน
          </a>
        </div>
      </div>

      <main className="page" style={{ paddingTop: 20 }}>
        <div className="shell" style={{ maxWidth: 880 }}>
          <AdminUsers meId={admin.id} />
        </div>
      </main>
    </>
  );
}
