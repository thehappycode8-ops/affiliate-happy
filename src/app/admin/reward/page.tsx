import { redirect } from 'next/navigation';
import { getAdminProfile } from '@/lib/supabase-server';
import AdminReward from '@/components/AdminReward';
import Logo from '@/components/Logo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'ตั้งค่ารางวัล — Happy' };

export default async function RewardPage() {
  const admin = await getAdminProfile();
  if (!admin) redirect('/admin/login');

  return (
    <>
      <div className="admin-bar">
        <div className="admin-brand">
          <Logo className="admin-logo" />
          <div>
            <div className="title">ตั้งค่ารางวัล</div>
            <div className="who">เงื่อนไขและรางวัลที่โชว์ในหน้าเช็กสถานะ</div>
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
          <AdminReward />
        </div>
      </main>
    </>
  );
}
