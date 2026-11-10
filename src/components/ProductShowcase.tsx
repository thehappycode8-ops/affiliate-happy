import { listProducts } from '@/lib/products-server';

/** แถวสินค้าจัดวางแบบพัด ใช้ตกแต่งหัวเว็บ — ดึงจากฐานข้อมูล */
export default async function ProductShowcase() {
  const items = (await listProducts(true)).filter((p) => p.image_url).slice(0, 8);
  if (items.length === 0) return null;

  return (
    <div className="showcase" aria-hidden="true">
      <span className="showcase-glow" />
      <div className="showcase-row">
        {items.map((p, i) => (
          <span key={p.id} className="ps-item" style={{ ['--i' as string]: i }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url as string} alt="" />
          </span>
        ))}
      </div>
      <span className="showcase-floor" />
    </div>
  );
}
