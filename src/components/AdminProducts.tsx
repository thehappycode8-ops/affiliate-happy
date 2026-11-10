'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clearProductCache, type Product } from '@/lib/products';

export default function AdminProducts() {
  const [rows, setRows] = useState<Product[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [preview, setPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/products');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ดึงรายการสินค้าไม่สำเร็จ');
        return;
      }
      setRows(json.data || []);
      setError('');
      clearProductCache();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setOkMsg(msg);
    setTimeout(() => setOkMsg(''), 3500);
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('name', name);
      fd.set('sub', sub);
      fd.set('sort_order', String((rows.length + 1) * 10));
      const f = fileRef.current?.files?.[0];
      if (f) fd.set('image', f);

      const res = await fetch('/api/admin/products', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'เพิ่มสินค้าไม่สำเร็จ');
        return;
      }
      setName('');
      setSub('');
      setPreview('');
      if (fileRef.current) fileRef.current.value = '';
      flash(`เพิ่ม "${json.data?.name ?? name}" แล้ว`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, fd: FormData, msg: string) {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'PATCH', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'อัปเดตไม่สำเร็จ');
        return;
      }
      flash(msg);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveRow(p: Product, nextName: string, nextSub: string) {
    const fd = new FormData();
    fd.set('name', nextName);
    fd.set('sub', nextSub);
    await patch(p.id, fd, `บันทึก "${nextName}" แล้ว`);
  }

  async function changeImage(p: Product, file: File) {
    const fd = new FormData();
    fd.set('image', file);
    await patch(p.id, fd, `เปลี่ยนรูป "${p.name}" แล้ว`);
  }

  async function move(p: Product, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === p.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    const a = new FormData();
    a.set('sort_order', String(swap.sort_order));
    const b = new FormData();
    b.set('sort_order', String(p.sort_order));
    setBusy(true);
    await fetch(`/api/admin/products/${p.id}`, { method: 'PATCH', body: a });
    await fetch(`/api/admin/products/${swap.id}`, { method: 'PATCH', body: b });
    await load();
  }

  async function remove(p: Product) {
    if (!window.confirm(`ลบ "${p.name}" ออกจากรายการสินค้า?\nคลิปเก่าที่เคยเลือกไว้ยังเก็บชื่อนี้อยู่`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ลบไม่สำเร็จ');
        return;
      }
      flash(`ลบ "${p.name}" แล้ว`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {okMsg && <div className="alert alert-ok">{okMsg}</div>}

      <form className="card" onSubmit={createProduct}>
        <div className="section-head">
          <h3>เพิ่มสินค้าใหม่</h3>
        </div>
        <hr className="section-divider" />

        <div className="prod-form">
          <label className="prod-drop" htmlFor="new-image">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" />
            ) : (
              <span className="ph">
                เลือกรูป
                <br />
                <small>PNG พื้นหลังใส · ไม่เกิน 3 MB</small>
              </span>
            )}
            <input
              id="new-image"
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : '');
              }}
            />
          </label>

          <div className="prod-fields">
            <div className="field">
              <label htmlFor="new-name">
                ชื่อสินค้า <span className="req">*</span>{' '}
                <span className="hint">ชื่อนี้จะขึ้นในฟอร์มและรายงาน</span>
              </label>
              <input
                id="new-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น เซรั่มส้ม Glow Up"
              />
            </div>
            <div className="field">
              <label htmlFor="new-sub">
                ชื่อบนแพ็กเกจ <span className="hint">(ไม่บังคับ)</span>
              </label>
              <input
                id="new-sub"
                type="text"
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                placeholder="เช่น Glow Up Vitamin Serum"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spin" /> : null}
              {busy ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
            </button>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="section-head">
          <h3>สินค้าทั้งหมด</h3>
          <span className="count">{rows.length} รายการ</span>
        </div>
        <hr className="section-divider" />

        <div className="prod-list">
          {rows.map((p, i) => (
            <ProductRow
              key={p.id}
              product={p}
              busy={busy}
              first={i === 0}
              last={i === rows.length - 1}
              onSave={saveRow}
              onImage={changeImage}
              onMove={move}
              onToggle={(prod) => {
                const fd = new FormData();
                fd.set('is_active', String(!prod.is_active));
                patch(prod.id, fd, prod.is_active ? `ซ่อน "${prod.name}" แล้ว` : `เปิด "${prod.name}" แล้ว`);
              }}
              onRemove={remove}
            />
          ))}
          {!busy && rows.length === 0 && <div className="empty">ยังไม่มีสินค้า</div>}
        </div>

        <p className="note" style={{ marginTop: 14 }}>
          <strong>ซ่อน</strong> = ไม่ขึ้นให้นายหน้าเลือกในฟอร์ม แต่คลิปเก่าที่เคยเลือกไว้ยังแสดงปกติ ·
          เปลี่ยนชื่อสินค้าแล้ว ระบบจะไล่แก้ชื่อในคลิปเก่าให้อัตโนมัติ
        </p>
      </div>
    </>
  );
}

function ProductRow({
  product,
  busy,
  first,
  last,
  onSave,
  onImage,
  onMove,
  onToggle,
  onRemove,
}: {
  product: Product;
  busy: boolean;
  first: boolean;
  last: boolean;
  onSave: (p: Product, name: string, sub: string) => void;
  onImage: (p: Product, f: File) => void;
  onMove: (p: Product, dir: -1 | 1) => void;
  onToggle: (p: Product) => void;
  onRemove: (p: Product) => void;
}) {
  const [name, setName] = useState(product.name);
  const [sub, setSub] = useState(product.sub ?? '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(product.name);
    setSub(product.sub ?? '');
  }, [product.name, product.sub]);

  const dirty = name !== product.name || sub !== (product.sub ?? '');

  return (
    <div className={`prod-row${product.is_active ? '' : ' off'}`}>
      <label className="prod-thumb" htmlFor={`img-${product.id}`} title="กดเพื่อเปลี่ยนรูป">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" />
        ) : (
          <span className="ph">ไม่มีรูป</span>
        )}
        <span className="edit">เปลี่ยนรูป</span>
        <input
          id={`img-${product.id}`}
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImage(product, f);
            if (ref.current) ref.current.value = '';
          }}
        />
      </label>

      <div className="prod-inputs">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="ชื่อสินค้า"
        />
        <input
          type="text"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          placeholder="ชื่อบนแพ็กเกจ (ไม่บังคับ)"
          aria-label="ชื่อบนแพ็กเกจ"
        />
      </div>

      <div className="prod-actions">
        <button
          className="btn btn-ghost btn-sm"
          disabled={busy || !dirty}
          onClick={() => onSave(product, name, sub)}
        >
          บันทึก
        </button>
        <button className="btn btn-ghost btn-sm" disabled={busy || first} onClick={() => onMove(product, -1)} title="เลื่อนขึ้น">
          ↑
        </button>
        <button className="btn btn-ghost btn-sm" disabled={busy || last} onClick={() => onMove(product, 1)} title="เลื่อนลง">
          ↓
        </button>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onToggle(product)}>
          {product.is_active ? 'ซ่อน' : 'เปิด'}
        </button>
        <button className="btn btn-bad btn-sm" disabled={busy} onClick={() => onRemove(product)}>
          ลบ
        </button>
      </div>
    </div>
  );
}
