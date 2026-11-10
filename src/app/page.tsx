import PortalTabs from '@/components/PortalTabs';
import Logo from '@/components/Logo';
import ProductShowcase from '@/components/ProductShowcase';
import CampaignPopup from '@/components/CampaignPopup';
import HelpButton from '@/components/HelpButton';
import ContactCard from '@/components/ContactCard';
import { listProducts } from '@/lib/products-server';
import { getRewardSettings } from '@/lib/reward-server';

/** อ่านสินค้า/แคมเปญจากฐานข้อมูลสดทุกครั้ง — ไม่ให้ Next สร้างเป็นหน้า static ตอน build
 *  (ไม่งั้นแก้รูปแคมเปญ/ป็อปอัพ/สินค้าจากหลังบ้านแล้วหน้าแรกจะไม่เปลี่ยนจนกว่าจะ deploy ใหม่) */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const [products, reward] = await Promise.all([listProducts(true), getRewardSettings()]);
  const showPopup = reward.popup_enabled && !!reward.image_url;
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Happy';
  const tagline =
    process.env.NEXT_PUBLIC_CAMPAIGN_SUBTITLE ||
    `ระบบส่ง Gencode สำหรับพันธมิตร ${brand}`;

  return (
    <main className="page">
      {showPopup && (
        <CampaignPopup imageUrl={reward.image_url as string} title={reward.prize_title} />
      )}
      <HelpButton file="/docs/manual-user.pdf" label="คู่มือการใช้งาน" />

      <div className="shell">
        <header className="hero">
          <div className="hero-text">
            <Logo className="brand-logo" />
            <h1>ระบบส่ง Gencode</h1>
            <p className="lead">{tagline}</p>
            {products.length > 0 && (
              <span className="hero-pill">{products.length} สินค้าในแคมเปญนี้</span>
            )}
          </div>

          <ProductShowcase />
        </header>

        <PortalTabs />

        <ContactCard
          title={reward.contact_title}
          lineUrl={reward.contact_line_url}
          lineId={reward.contact_line_id}
        />

        <footer className="footer">
          {brand} · ระบบรับผลงานนายหน้า · <a href="/admin">สำหรับทีมงาน</a>
        </footer>
      </div>
    </main>
  );
}
