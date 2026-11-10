'use client';

import { useEffect, useState } from 'react';
import { CONTENT_TYPES, type ClipEvent, type ClipFull, type ClipStatus } from '@/lib/types';
import ProductPicker from './ProductPicker';
import { expiryNote, formatDate, formatDateTime, formatPhone } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import CopyButton, { CopyField } from './CopyButton';

export default function ClipDrawer({
  clip,
  adminEmail,
  adminRole,
  onClose,
  onSaved,
  onDeleted,
}: {
  clip: ClipFull;
  adminEmail: string;
  adminRole: string;
  onClose: () => void;
  onSaved: (c: ClipFull) => void;
  onDeleted: () => void;
}) {
  const [genCode, setGenCode] = useState(clip.gen_code || '');
  const [expires, setExpires] = useState(clip.code_expires_at || '');
  const [products, setProducts] = useState<string[]>(clip.products ?? []);
  const [contentType, setContentType] = useState(clip.content_type || '');
  const [feedback, setFeedback] = useState(clip.feedback || '');
  const [adminNote, setAdminNote] = useState(clip.admin_note || '');
  const [rejectReason, setRejectReason] = useState(clip.reject_reason || '');
  const [events, setEvents] = useState<ClipEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    setGenCode(clip.gen_code || '');
    setExpires(clip.code_expires_at || '');
    setProducts(clip.products ?? []);
    setContentType(clip.content_type || '');
    setFeedback(clip.feedback || '');
    setAdminNote(clip.admin_note || '');
    setRejectReason(clip.reject_reason || '');
    fetch(`/api/admin/clips/${clip.id}`)
      .then((r) => r.json())
      .then((j) => setEvents(j.events || []))
      .catch(() => undefined);
  }, [
    clip.id,
    clip.gen_code,
    clip.code_expires_at,
    clip.products,
    clip.content_type,
    clip.feedback,
    clip.admin_note,
    clip.reject_reason,
  ]);

  async function patch(body: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    setError('');
    setOkMsg('');
    try {
      const res = await fetch(`/api/admin/clips/${clip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'อัปเดตไม่สำเร็จ');
        return;
      }
      setOkMsg(successMsg);
      onSaved(json.data as ClipFull);
      const ev = await fetch(`/api/admin/clips/${clip.id}`).then((r) => r.json());
      setEvents(ev.events || []);
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (s: ClipStatus, msg: string) =>
    patch({ status: s, ...(s === 'rejected' ? { reject_reason: rejectReason } : {}) }, msg);

  const exp = expiryNote(clip.days_to_expire);

  async function remove() {
    const ok = window.confirm(
      `ลบคลิปนี้ออกจากระบบถาวร?\n\n` +
        `${clip.full_name} · ${clip.gen_code || 'ไม่มี Gen Code'}\n\n` +
        'ลบแล้วกู้คืนไม่ได้ · ถ้าเป็นคลิปสุดท้ายของคนนี้ ชื่อผู้ส่งจะถูกลบไปด้วย'
    );
    if (!ok) return;

    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/clips/${clip.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ลบไม่สำเร็จ');
        return;
      }
      onDeleted();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div className="mono" style={{ color: 'var(--ink-mute)' }}>
              {clip.ref_code} · คลิปที่ {clip.seq}
            </div>
            <h3>{clip.full_name}</h3>
            <div style={{ marginTop: 8 }}>
              <StatusBadge status={clip.status} />
            </div>
          </div>
          <button className="x-btn" onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {okMsg && <div className="alert alert-ok">{okMsg}</div>}
        {exp && exp.tone !== 'ok' && (
          <div className={`alert alert-${exp.tone === 'bad' ? 'error' : 'warn'}`}>
            โค้ดนี้ {exp.text} (หมดอายุ {formatDate(clip.code_expires_at)})
          </div>
        )}

        <dl className="kv">
          <dt>TikTok</dt>
          <dd>{clip.tiktok_username}</dd>
          <dt>โปรไฟล์</dt>
          <dd>
            {clip.tiktok_profile_url ? (
              <CopyField value={clip.tiktok_profile_url} href={clip.tiktok_profile_url} mono />
            ) : (
              '-'
            )}
          </dd>
          <dt>เบอร์โทร</dt>
          <dd>
            {formatPhone(clip.phone)} <CopyButton value={clip.phone} />
          </dd>
          <dt>ลิงก์คลิป</dt>
          <dd>
            <CopyField value={clip.clip_url} href={clip.clip_url} mono />
          </dd>
          <dt>Gen Code</dt>
          <dd>{clip.gen_code ? <CopyField value={clip.gen_code} mono /> : '-'}</dd>
          <dt>อายุโค้ด</dt>
          <dd>
            {clip.code_valid_days
              ? `${clip.code_valid_days} วัน (นับจากวันที่ส่ง)`
              : 'ไม่ได้ระบุ'}
          </dd>
          <dt>วันที่ส่ง</dt>
          <dd>{formatDateTime(clip.created_at)}</dd>
          <dt>{clip.status === 'approved' ? 'วันที่อนุมัติ' : 'วันที่ตรวจล่าสุด'}</dt>
          <dd>{clip.reviewed_at ? formatDateTime(clip.reviewed_at) : 'ยังไม่ได้ตรวจ'}</dd>
          <dt>ยิงแอด</dt>
          <dd>
            {clip.status !== 'approved' ? (
              <span className="hint">ติ๊กได้เฉพาะคลิปที่อนุมัติแล้ว</span>
            ) : clip.ad_boosted ? (
              <>
                <span className="pill pill-ok">ยิงแอดแล้ว</span>{' '}
                <span className="hint">
                  {formatDateTime(clip.ad_boosted_at)}
                  {clip.ad_boosted_by ? ` · ${clip.ad_boosted_by}` : ''}
                </span>
              </>
            ) : (
              <span className="pill pill-warn">ยังไม่ยิงแอด</span>
            )}
          </dd>
        </dl>

        <div className="actions">
          <button className="btn btn-ok btn-sm" disabled={busy} onClick={() => setStatus('approved', 'อนุมัติคลิปแล้ว')}>
            ✓ อนุมัติ
          </button>
          <button
            className="btn btn-bad btn-sm"
            disabled={busy}
            onClick={() => {
              if (!rejectReason.trim()) {
                setError('กรุณาระบุเหตุผลที่ไม่อนุมัติก่อน (ผู้ส่งจะเห็นข้อความนี้)');
                return;
              }
              setStatus('rejected', 'บันทึกว่าไม่อนุมัติแล้ว');
            }}
          >
            ✕ ไม่อนุมัติ
          </button>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus('pending', 'ย้อนกลับเป็นรอตรวจสอบ')}>
            ย้อนกลับเป็นรอตรวจสอบ
          </button>
          {clip.status === 'approved' && (
            <button
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() =>
                patch(
                  { ad_boosted: !clip.ad_boosted },
                  clip.ad_boosted ? 'ยกเลิกการติ๊กยิงแอดแล้ว' : 'บันทึกว่ายิงแอดแล้ว'
                )
              }
            >
              {clip.ad_boosted ? '↩ ยกเลิกยิงแอด' : '📣 ยิงแอดแล้ว'}
            </button>
          )}
          {adminRole === 'owner' && (
            <button
              className="btn btn-ghost btn-sm btn-danger-ghost"
              disabled={busy}
              onClick={remove}
              title="ลบคลิปนี้ออกจากระบบถาวร"
            >
              🗑 ลบคลิปนี้
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="reject">
            เหตุผลที่ไม่อนุมัติ <span className="hint">(ผู้ส่งเห็นข้อความนี้)</span>
          </label>
          <textarea
            id="reject"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="เช่น ลิงก์เปิดไม่ได้ / ไม่ได้ติด Gen Code ในคลิป"
          />
        </div>

        <div className="field">
          <label htmlFor="feedback">
            ความคิดเห็นถึงผู้ส่ง <span className="hint">(ผู้ส่งเห็นข้อความนี้ทุกสถานะ)</span>
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="เช่น คลิปดีมาก ครั้งหน้าลองเพิ่มช็อตก่อน-หลังตอนต้นคลิปนะคะ"
          />
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 8 }}
            disabled={busy}
            onClick={() => patch({ feedback }, 'บันทึกความคิดเห็นแล้ว')}
          >
            บันทึกความคิดเห็น
          </button>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />

        <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--brand-900)' }}>
          แก้ไขข้อมูลคลิป
        </h4>

        <div className="field">
          <label htmlFor="gc">Gen Code</label>
          <input
            id="gc"
            type="text"
            className="mono-input"
            value={genCode}
            onChange={(e) => setGenCode(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div className="field">
          <label htmlFor="exp">วันหมดอายุของโค้ด</label>
          <input id="exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>

        <div className="field">
          <label>
            สินค้าในคลิป{' '}
            <span className="hint">
              เลือกได้มากกว่า 1{products.length > 0 ? ` (เลือกแล้ว ${products.length})` : ''}
            </span>
          </label>
          <ProductPicker
            idPrefix={`drawer-${clip.id}`}
            value={products}
            onChange={setProducts}
            compact
          />
        </div>

        <div className="field">
          <label htmlFor="ctype">ประเภทคอนเทนต์</label>
          <select id="ctype" value={contentType} onChange={(e) => setContentType(e.target.value)}>
            <option value="">ไม่ระบุ</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            {contentType && !CONTENT_TYPES.includes(contentType) && (
              <option value={contentType}>{contentType}</option>
            )}
          </select>
        </div>

        <div className="field">
          <label htmlFor="anote">
            หมายเหตุภายใน <span className="hint">(เฉพาะทีมงานเห็น)</span>
          </label>
          <textarea id="anote" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        </div>

        <button
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() =>
            patch(
              {
                gen_code: genCode,
                code_expires_at: expires,
                products,
                content_type: contentType,
                feedback,
                admin_note: adminNote,
                reject_reason: rejectReason,
              },
              'บันทึกข้อมูลแล้ว'
            )
          }
        >
          บันทึกการแก้ไข
        </button>

        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />

        <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--brand-900)' }}>
          ประวัติการดำเนินการ
        </h4>
        <ul className="timeline">
          {events.map((e) => (
            <li key={e.id} className={e.status === 'rejected' ? 'bad' : ''}>
              <div className="t-title">{e.message}</div>
              <div className="t-meta">
                {formatDateTime(e.created_at)} · {e.actor || 'system'}
              </div>
            </li>
          ))}
          {events.length === 0 && <li className="t-meta">ยังไม่มีประวัติ</li>}
        </ul>

        <p className="footer" style={{ textAlign: 'left' }}>
          ดำเนินการโดย {adminEmail}
        </p>
      </aside>
    </div>
  );
}
