'use client';

import { useEffect, useState } from 'react';

/**
 * ป็อปอัพภาพแคมเปญ — เด้งขึ้นตอนเปิดหน้าเว็บ กดกากบาทหรือพื้นหลังเพื่อปิด
 * ปิดแล้วจะไม่เด้งซ้ำในการเข้าเว็บรอบนั้น (จำไว้ใน sessionStorage)
 * แอดมินเปิด/ปิดฟีเจอร์นี้ได้จากหน้า "ตั้งค่ารางวัล"
 */
export default function CampaignPopup({
  imageUrl,
  title,
}: {
  imageUrl: string;
  title?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const key = `hpy_popup_seen:${imageUrl}`;

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === '1';
    } catch {
      /* โหมดส่วนตัว / ปิดคุกกี้ — ถือว่ายังไม่เคยเห็น */
    }
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, [key]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      /* ไม่เป็นไร */
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="popup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'ภาพแคมเปญ'}
      onClick={close}
    >
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="popup-close" onClick={close} aria-label="ปิด">
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title || 'ภาพแคมเปญ'} />
        <button type="button" className="btn btn-primary popup-cta" onClick={close}>
          เริ่มส่งคลิป
        </button>
      </div>
    </div>
  );
}
