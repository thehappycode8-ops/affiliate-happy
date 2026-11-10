import { redirect } from 'next/navigation';
import { getAdminProfile } from '@/lib/supabase-server';
import AdminDashboard from '@/components/AdminDashboard';
import HelpButton from '@/components/HelpButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'หลังบ้าน Affiliate — Happy' };

export default async function AdminPage() {
  const admin = await getAdminProfile();
  if (!admin) redirect('/admin/login');

  return (
    <>
      <AdminDashboard
        adminEmail={admin.email}
        adminName={admin.full_name || admin.email}
        adminRole={admin.role}
      />
      <HelpButton
        file="/docs/manual-admin.pdf"
        label="คู่มือแอดมิน"
        storageKey="hpy_help_hidden_admin"
      />
    </>
  );
}
