'use client';

import { useState } from 'react';
import { CODE_DURATIONS, CONTENT_TYPES, MAX_CLIPS, MAX_CODE_DAYS } from '@/lib/types';
import ProductPicker from './ProductPicker';
import CopyButton from './CopyButton';
import { addDaysISO, formatDate } from '@/lib/utils';

interface ClipRow {
  key: number;
  clip_url: string;
  gen_code: string;
  /** อายุโค้ดเป็นจำนวนวัน นับจากวันที่ส่ง (0 = ยังไม่เลือก) */
  code_valid_days: number;
  /** true เมื่อผู้ใช้เลือก "ระยะเวลาแบบกำหนดเอง" */
  custom_days: boolean;
  products: string[];
  content_type: string;
}

const emptyClip = (key: number): ClipRow => ({
  key,
  clip_url: '',
  gen_code: '',
  code_valid_days: 0,
  custom_days: false,
  products: [],
  content_type: '',
});

export default function ClipSubmitForm({ onGoStatus }: { onGoStatus: (q: string) => void }) {
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [clips, setClips] = useState<ClipRow[]>([emptyClip(1)]);
  const [nextKey, setNextKey] = useState(2);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ ref_code: string; clip_count: number } | null>(null);

  function update(key: number, patch: Partial<ClipRow>) {
    setClips((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function addClip() {
    if (clips.length >= MAX_CLIPS) return;
    setClips((prev) => [...prev, emptyClip(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeClip(key: number) {
    setClips((prev) => prev.filter((c) => c.key !== key));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const noDays = clips.findIndex(
      (c) => !c.code_valid_days || c.code_valid_days < 1 || c.code_valid_days > MAX_CODE_DAYS
    );
    if (noDays !== -1) {
      setError(`คลิปที่ ${noDays + 1}: กรุณาเลือกอายุของโค้ด`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const noProduct = clips.findIndex((c) => c.products.length === 0);
    if (noProduct !== -1) {
      setError(`คลิปที่ ${noProduct + 1}: กรุณาเลือกสินค้าอย่างน้อย 1 รายการ`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          first_name: firstName,
          last_name: lastName,
          tiktok_username: tiktok,
          tiktok_profile_url: profileUrl,
          clips: clips.map((c) => ({
            clip_url: c.clip_url,
            gen_code: c.gen_code,
            code_valid_days: c.code_valid_days,
            products: c.products,
            content_type: c.content_type,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ส่งข้อมูลไม่สำเร็จ');
        return;
      }
      setDone({ ref_code: json.ref_code, clip_count: json.clip_count });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card">
        <div className="alert alert-ok">
          <strong>ส่ง {done.clip_count} คลิปเรียบร้อยแล้ว 🎉</strong>
          <br />
          ทีมงานจะตรวจสอบและอัปเดตสถานะให้ เช็กได้จากแท็บ &ldquo;เช็กสถานะ&rdquo;
        </div>

        <div className="code-box">
          <div className="label">รหัสอ้างอิงของคุณ</div>
          <div className="value">{done.ref_code}</div>
          <div className="link-row">
            <span>เก็บรหัสนี้ไว้เช็กสถานะ (หรือใช้เบอร์โทรที่กรอกไว้ก็ได้)</span>
            <CopyButton value={done.ref_code} />
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => onGoStatus(done.ref_code)}>
            ไปหน้าเช็กสถานะ
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setDone(null);
            setClips([emptyClip(1)]);
            setNextKey(2);
          }}
        >
          ส่งคลิปชุดใหม่
        </button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="section-head">
        <h3>ข้อมูลของคุณ</h3>
      </div>
      <hr className="section-divider" />

      <div className="field">
        <label htmlFor="phone">
          เบอร์โทร <span className="req">*</span>
        </label>
        <input
          id="phone"
          type="tel"
          required
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="เบอร์ที่ใช้ติดต่อคุณได้"
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="first_name">
            ชื่อ <span className="req">*</span>
          </label>
          <input
            id="first_name"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="last_name">
            นามสกุล <span className="req">*</span>
          </label>
          <input
            id="last_name"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="tiktok">
          TikTok username <span className="req">*</span>{' '}
          <span className="hint">ชื่อผู้ใช้ขึ้นต้นด้วย @</span>
        </label>
        <input
          id="tiktok"
          type="text"
          required
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
          placeholder="เช่น @happy.official"
        />
      </div>

      <div className="field">
        <label htmlFor="tiktok_profile_url">
          ลิงก์หน้าโปรไฟล์ TikTok <span className="req">*</span>{' '}
          <span className="hint">เปิดโปรไฟล์ของคุณ กด &ldquo;แชร์&rdquo; แล้วคัดลอกลิงก์มาวาง</span>
        </label>
        <input
          id="tiktok_profile_url"
          type="url"
          required
          inputMode="url"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          placeholder="เช่น https://www.tiktok.com/@happy.official"
        />
        <p className="note">ต้องเป็นลิงก์ของ TikTok (มี tiktok.com) ใช้ยืนยันว่าเป็นช่องของคุณจริง</p>
      </div>

      <div className="section-head">
        <h3>คลิปที่ส่ง</h3>
        <span className="count">
          {clips.length}/{MAX_CLIPS}
        </span>
      </div>
      <hr className="section-divider" />

      {clips.map((c, i) => (
        <div className="clip-card" key={c.key}>
          <div className="clip-card-head">
            <span className="n">คลิปที่ {i + 1}</span>
            {clips.length > 1 && (
              <button type="button" className="remove-btn" onClick={() => removeClip(c.key)}>
                🗑 ลบ
              </button>
            )}
          </div>

          <div className="field">
            <label htmlFor={`url-${c.key}`}>
              ลิงก์คลิป <span className="req">*</span>
            </label>
            <input
              id={`url-${c.key}`}
              type="url"
              required
              value={c.clip_url}
              onChange={(e) => update(c.key, { clip_url: e.target.value })}
              placeholder="เช่น https://www.tiktok.com/@ชื่อช่อง/video/7412880051"
            />
          </div>

          <div className="field">
            <label htmlFor={`code-${c.key}`}>
              Gen Code <span className="req">*</span>{' '}
              <span className="hint">คัดลอกรหัสที่คุณ Gen ไว้มาวาง ตัวพิมพ์เล็ก-ใหญ่ต้องตรงเป๊ะ</span>
            </label>
            <input
              id={`code-${c.key}`}
              type="text"
              required
              value={c.gen_code}
              onChange={(e) => update(c.key, { gen_code: e.target.value })}
              placeholder="เช่น #X+pM3bk4YnOv4sB0ck"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="mono-input"
            />
          </div>

          <div className="field">
            <label>
              อายุของโค้ด <span className="req">*</span>{' '}
              <span className="hint">ตามที่ตั้งไว้ตอน Gen โค้ด</span>
            </label>

            <div className="day-picker" role="group" aria-label="อายุของโค้ด">
              {CODE_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`day-chip${!c.custom_days && c.code_valid_days === d ? ' is-on' : ''}`}
                  onClick={() => update(c.key, { code_valid_days: d, custom_days: false })}
                >
                  {d} วัน
                </button>
              ))}
              <button
                type="button"
                className={`day-chip${c.custom_days ? ' is-on' : ''}`}
                onClick={() => update(c.key, { custom_days: true, code_valid_days: 0 })}
              >
                กำหนดเอง
              </button>
            </div>

            {c.custom_days && (
              <input
                id={`days-${c.key}`}
                type="number"
                min={1}
                max={MAX_CODE_DAYS}
                inputMode="numeric"
                className="day-custom"
                value={c.code_valid_days || ''}
                onChange={(e) =>
                  update(c.key, { code_valid_days: Math.floor(Number(e.target.value) || 0) })
                }
                placeholder="ใส่จำนวนวัน เช่น 90"
              />
            )}

            {c.code_valid_days > 0 ? (
              <p className="note note-ok">
                โค้ดนี้ใช้ได้ <b>{c.code_valid_days} วัน</b> นับจากวันนี้ — ถึง{' '}
                {formatDate(addDaysISO(c.code_valid_days))}
              </p>
            ) : (
              <p className="note">นับจากวันที่ส่งเข้ามา</p>
            )}
          </div>

          <div className="field">
            <label>
              สินค้าในคลิป <span className="req">*</span>{' '}
              <span className="hint">
                เลือกอย่างน้อย 1 รายการ
                {c.products.length > 0 ? ` (เลือกแล้ว ${c.products.length})` : ''}
              </span>
            </label>
            <ProductPicker
              idPrefix={`clip${c.key}`}
              value={c.products}
              onChange={(next) => update(c.key, { products: next })}
            />
            {c.products.length === 0 && (
              <p className="note note-warn">กรุณาเลือกสินค้าอย่างน้อย 1 รายการ</p>
            )}
          </div>

          <div className="field">
            <label htmlFor={`ctype-${c.key}`}>ประเภทคอนเทนต์</label>
            <select
              id={`ctype-${c.key}`}
              value={c.content_type}
              onChange={(e) => update(c.key, { content_type: e.target.value })}
            >
              <option value="">ไม่ระบุ</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="add-clip"
        onClick={addClip}
        disabled={clips.length >= MAX_CLIPS}
      >
        ＋ เพิ่มคลิป
      </button>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? <span className="spin" /> : null}
        {busy ? 'กำลังส่ง...' : `ส่ง ${clips.length} คลิป`}
      </button>
    </form>
  );
}
