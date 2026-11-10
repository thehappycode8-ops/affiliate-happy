'use client';

import { useEffect, useState } from 'react';

/**
 * ปุ่มคู่มือเล็ก ๆ มุมขวาล่าง — กดแล้วเปิดคู่มือ PDF ในหน้าต่างซ้อน
 * กดกากบาทที่ตัวปุ่มเพื่อซ่อนปุ่มไปเลย (จำไว้ในเครื่องผู้ใช้)
 */
export default function HelpButton({
  file,
  label = 'คู่มือการใช้งาน',
  storageKey = 'hpy_help_hidden',
}: {
  file: string;
  label?: string;
  storageKey?: string;
}) {
  const [hidden, setHidden] = useState(true); // ซ่อนไว้ก่อนจนกว่าจะอ่านค่าจากเครื่องเสร็จ
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let off = false;
    try {
      off = localStorage.getItem(storageKey) === '1';
    } catch {
      /* อ่านไม่ได้ก็ถือว่ายังไม่ได้ซ่อน */
    }
    setHidden(off);
  }, [storageKey]);

  function hide() {
    setHidden(true);
    setOpen(false);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* ไม่เป็นไร */
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {!hidden && (
        <div className="help-fab">
          <button type="button" className="help-fab-main" onClick={() => setOpen(true)}>
            <span aria-hidden="true">📖</span> {label}
          </button>
          <button
            type="button"
            className="help-fab-x"
            onClick={hide}
            aria-label="ซ่อนปุ่มคู่มือ"
            title="ซ่อนปุ่มนี้"
          >
            ✕
          </button>
        </div>
      )}

      {open && (
        <div
          className="popup-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setOpen(false)}
        >
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-head">
              <strong>{label}</strong>
              <div className="help-modal-actions">
                <a className="btn btn-ghost btn-sm" href={file} target="_blank" rel="noreferrer">
                  เปิดแท็บใหม่
                </a>
                <a className="btn btn-ghost btn-sm" href={file} download>
                  ดาวน์โหลด
                </a>
                <button
                  type="button"
                  className="popup-close popup-close-inline"
                  onClick={() => setOpen(false)}
                  aria-label="ปิด"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe className="help-frame" src={file} title={label} />
          </div>
        </div>
      )}
    </>
  );
}
