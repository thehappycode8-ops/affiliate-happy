'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_REWARD, type RewardSettings } from '@/lib/reward';
import RewardCard from './RewardCard';

export default function AdminReward() {
  const [form, setForm] = useState<RewardSettings>(DEFAULT_REWARD);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [preview, setPreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reward');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ดึงค่ารางวัลไม่สำเร็จ');
        return;
      }
      setForm(json.data);
      setError('');
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof RewardSettings>(key: K, value: RewardSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function pickImage(file?: File | null) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
    set('image_url', null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOkMsg('');
    try {
      const fd = new FormData();
      fd.set('enabled', String(form.enabled));
      fd.set('target_clips', form.target_clips === null ? '' : String(form.target_clips));
      fd.set('prize_title', form.prize_title);
      fd.set('prize_detail', form.prize_detail || '');
      fd.set('headline', form.headline);
      fd.set('contact_note', form.contact_note || '');
      fd.set('popup_enabled', String(form.popup_enabled));
      fd.set('contact_title', form.contact_title || '');
      fd.set('contact_line_url', form.contact_line_url || '');
      fd.set('contact_line_id', form.contact_line_id || '');

      const file = fileRef.current?.files?.[0];
      if (file) fd.set('image', file);
      else if (!form.image_url) fd.set('remove_image', 'true');

      const res = await fetch('/api/admin/reward', { method: 'PATCH', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      if (fileRef.current) fileRef.current.value = '';
      setPreview('');
      set('image_url', json.image_url ?? null);
      setOkMsg('บันทึกแล้ว — หน้าเช็กสถานะจะใช้ค่านี้ทันที');
      setTimeout(() => setOkMsg(''), 3500);
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="empty">กำลังโหลด...</div>;

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {okMsg && <div className="alert alert-ok">{okMsg}</div>}

      <form className="card" onSubmit={save}>
        <div className="section-head">
          <h3>เงื่อนไขและรางวัล</h3>
        </div>
        <hr className="section-divider" />

        <div className="field">
          <label htmlFor="rw-enabled">แสดงรางวัลในหน้าเช็กสถานะ</label>
          <select
            id="rw-enabled"
            value={form.enabled ? 'on' : 'off'}
            onChange={(e) => set('enabled', e.target.value === 'on')}
          >
            <option value="on">เปิด — โชว์ความคืบหน้าและการ์ดรางวัล</option>
            <option value="off">ปิด — ไม่โชว์อะไรเลย</option>
          </select>
          <p className="note">ปิดไว้ได้ตอนแคมเปญยังไม่เริ่ม หรือแจกรางวัลครบแล้ว</p>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="rw-target-mode">เงื่อนไขจำนวนคลิป</label>
            <select
              id="rw-target-mode"
              value={form.target_clips === null ? 'none' : 'target'}
              onChange={(e) => set('target_clips', e.target.value === 'none' ? null : 40)}
            >
              <option value="target">กำหนดจำนวนคลิป — โชว์แถบความคืบหน้า และการ์ดยินดีด้วยเมื่อครบ</option>
              <option value="none">ไม่กำหนด — โชว์แค่ภาพแคมเปญ/รางวัล และป็อปอัพ</option>
            </select>
            {form.target_clips !== null && (
              <>
                <input
                  id="rw-target"
                  type="number"
                  min={1}
                  max={999}
                  value={form.target_clips}
                  onChange={(e) => set('target_clips', Math.max(1, Number(e.target.value) || 1))}
                  style={{ marginTop: 8 }}
                />
                <p className="note">นับเฉพาะ &quot;คลิปที่อนุมัติแล้ว&quot; รวมทุกครั้งที่ส่งของเบอร์เดียวกัน</p>
              </>
            )}
            {form.target_clips === null && (
              <p className="note">ป็อปอัพและการ์ดแคมเปญจะแสดงตามปกติ โดยไม่นับจำนวนคลิป</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="rw-headline">ข้อความนำ</label>
            <input
              id="rw-headline"
              type="text"
              value={form.headline}
              onChange={(e) => set('headline', e.target.value)}
              placeholder="คุณคือผู้พิชิตรางวัล"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="rw-title">
            ชื่อรางวัล <span className="req">*</span>
          </label>
          <input
            id="rw-title"
            type="text"
            value={form.prize_title}
            onChange={(e) => set('prize_title', e.target.value)}
            placeholder="เช่น ทริปท่องเที่ยวสุด Exclusive"
          />
        </div>

        <div className="field">
          <label htmlFor="rw-detail">รายละเอียดรางวัล</label>
          <input
            id="rw-detail"
            type="text"
            value={form.prize_detail || ''}
            onChange={(e) => set('prize_detail', e.target.value)}
            placeholder="ชมพระอาทิตย์ตกดิน · ฟังเพลง · บุฟเฟต์อาหารทะเล"
          />
        </div>

        <div className="field">
          <label htmlFor="rw-contact">ข้อความติดต่อกลับ</label>
          <input
            id="rw-contact"
            type="text"
            value={form.contact_note || ''}
            onChange={(e) => set('contact_note', e.target.value)}
            placeholder="ทีมงานจะติดต่อกลับทางเบอร์ที่ลงทะเบียนไว้ภายใน 7 วันทำการ"
          />
        </div>

        <div className="field">
          <label htmlFor="rw-image">
            ภาพแคมเปญ / โปสเตอร์รางวัล{' '}
            <span className="hint">PNG / JPG / WEBP ไม่เกิน 3 MB — โชว์บนการ์ดตอนทำครบ</span>
          </label>

          {(preview || form.image_url) && (
            <div className="reward-poster" style={{ maxWidth: 260, margin: '0 0 10px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview || (form.image_url as string)} alt="ตัวอย่างภาพแคมเปญ" />
            </div>
          )}

          <input
            id="rw-image"
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />

          {(preview || form.image_url) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8 }}
              onClick={removeImage}
            >
              เอาภาพออก
            </button>
          )}
          <p className="note">
            แนะนำภาพแนวตั้งของแคมเปญ (เช่น โปสเตอร์แคมเปญ) จะขึ้นเต็มความกว้างของการ์ด
          </p>
        </div>

        <div className="field">
          <label htmlFor="rw-popup">แสดงภาพแคมเปญเป็นป็อปอัพตอนเปิดหน้าเว็บ</label>
          <select
            id="rw-popup"
            value={form.popup_enabled ? 'on' : 'off'}
            onChange={(e) => set('popup_enabled', e.target.value === 'on')}
          >
            <option value="on">เปิด — เด้งภาพแคมเปญขึ้นมาก่อนกรอกฟอร์ม</option>
            <option value="off">ปิด — ไม่เด้งป็อปอัพ</option>
          </select>
          <p className="note">
            นายหน้ากดกากบาทปิดได้ และจะไม่เด้งซ้ำในการเข้าเว็บรอบนั้น · ถ้าไม่ได้ใส่ภาพแคมเปญไว้ ป็อปอัพจะไม่ขึ้น
          </p>
        </div>

        <div className="section-head" style={{ marginTop: 22 }}>
          <h3>ช่องทางติดต่อทีมงาน</h3>
        </div>
        <hr className="section-divider" />
        <p className="note" style={{ marginBottom: 12 }}>
          โชว์เป็นการ์ดใต้แท็บส่งคลิป/เช็กสถานะ ให้พันธมิตรกดเพิ่มเพื่อนได้ทันที · เว้นว่างทั้งลิงก์และ ID = ไม่โชว์การ์ด
        </p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="rw-ct-title">หัวข้อ</label>
            <input
              id="rw-ct-title"
              type="text"
              value={form.contact_title || ''}
              onChange={(e) => set('contact_title', e.target.value)}
              placeholder="Line สำหรับ Creators"
            />
          </div>
          <div className="field">
            <label htmlFor="rw-ct-id">Line ID</label>
            <input
              id="rw-ct-id"
              type="text"
              value={form.contact_line_id || ''}
              onChange={(e) => set('contact_line_id', e.target.value)}
              placeholder="@wellcreator"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="rw-ct-url">ลิงก์เพิ่มเพื่อน Line</label>
          <input
            id="rw-ct-url"
            type="url"
            value={form.contact_line_url || ''}
            onChange={(e) => set('contact_line_url', e.target.value)}
            placeholder="https://lin.ee/xxxxxxx"
          />
          <p className="note">เอาจาก Line Official Account Manager → หน้าแรก → ลิงก์เพิ่มเพื่อน (รูปแบบ https://lin.ee/...)</p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </form>

      <div className="card">
        <div className="section-head">
          <h3>ตัวอย่างที่นายหน้าจะเห็น</h3>
        </div>
        <hr className="section-divider" />

        <div className="reward-preview-wrap">
          {form.target_clips === null ? (
            <>
              <p className="reward-preview-label">การ์ดแคมเปญ (ไม่กำหนดจำนวนคลิป)</p>
              <RewardCard
                reward={{ ...form, achieved: false, remaining: 0, image_url: preview || form.image_url }}
                name="จริยา จรรยาวรลักษณ์"
                tiktok="@tye_jariya"
                approved={3}
              />
            </>
          ) : (
            <>
              <p className="reward-preview-label">เมื่อทำครบแล้ว</p>
              <RewardCard
                reward={{ ...form, achieved: true, remaining: 0, image_url: preview || form.image_url }}
                name="จริยา จรรยาวรลักษณ์"
                tiktok="@tye_jariya"
                approved={form.target_clips}
              />

              <p className="reward-preview-label" style={{ marginTop: 22 }}>
                เมื่อยังไม่ครบ
              </p>
              <RewardCard
                reward={{
                  ...form,
                  achieved: false,
                  remaining: Math.max(1, Math.ceil(form.target_clips / 3)),
                }}
                name="จริยา จรรยาวรลักษณ์"
                tiktok="@tye_jariya"
                approved={form.target_clips - Math.max(1, Math.ceil(form.target_clips / 3))}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
