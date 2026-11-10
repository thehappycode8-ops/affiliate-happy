'use client';

import { MAX_PRODUCTS, findProduct, useProducts } from '@/lib/products';

/** การ์ดเลือกสินค้าแบบมีรูป — เลือกได้มากกว่า 1 รายการ */
export default function ProductPicker({
  value,
  onChange,
  idPrefix,
  compact = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  idPrefix: string;
  compact?: boolean;
}) {
  const { products, loading } = useProducts();

  function toggle(name: string) {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name));
    } else if (value.length < MAX_PRODUCTS) {
      onChange([...value, name]);
    }
  }

  if (loading) return <p className="note">กำลังโหลดรายการสินค้า...</p>;
  if (products.length === 0) return <p className="note">ยังไม่มีรายการสินค้าในระบบ</p>;

  return (
    <div className={`product-grid${compact ? ' compact' : ''}`}>
      {products.map((p) => {
        const on = value.includes(p.name);
        const id = `${idPrefix}-${p.id}`;
        return (
          <label key={p.id} htmlFor={id} className={`product-card${on ? ' on' : ''}`}>
            <input id={id} type="checkbox" checked={on} onChange={() => toggle(p.name)} />
            <span className="thumb">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" loading="lazy" />
              ) : (
                <span className="thumb-fallback">รอรูป</span>
              )}
            </span>
            <span className="pname">{p.name}</span>
            {p.sub && <span className="psub">{p.sub}</span>}
            <span className="tick" aria-hidden="true">
              ✓
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** แสดงสินค้าที่เลือกไว้เป็นชิปเล็ก ๆ พร้อมรูป */
export function ProductChips({
  products,
  size = 'md',
}: {
  products: string[] | null | undefined;
  size?: 'md' | 'sm';
}) {
  const { products: catalog } = useProducts();

  if (!products || products.length === 0) return <span>-</span>;

  return (
    <span className={`product-chips${size === 'sm' ? ' sm' : ''}`}>
      {products.map((name) => {
        const p = findProduct(catalog, name);
        return (
          <span className="product-chip" key={name}>
            {p?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" loading="lazy" />
            ) : null}
            {name}
          </span>
        );
      })}
    </span>
  );
}
