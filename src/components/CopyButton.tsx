'use client';

import { useState } from 'react';

async function writeClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export default function CopyButton({
  value,
  label = 'คัดลอก',
  variant = 'light',
}: {
  value: string;
  label?: string;
  /** light = ปุ่มขาวบนพื้นเข้ม · mini = ปุ่มเล็กในตาราง/รายการ */
  variant?: 'light' | 'mini';
}) {
  const [done, setDone] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    await writeClipboard(value);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  const cls = variant === 'mini' ? `copy-mini${done ? ' done' : ''}` : 'copy-btn';

  return (
    <button type="button" className={cls} onClick={copy} title={`คัดลอก: ${value}`}>
      {done ? '✓ คัดลอกแล้ว' : label}
    </button>
  );
}

/** กล่องแสดงค่า + ปุ่มคัดลอก (ใช้กับลิงก์คลิป / Gen Code) */
export function CopyField({
  value,
  href,
  mono = false,
}: {
  value: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div className="copy-field">
      {href ? (
        <a className={`val${mono ? ' mono' : ''}`} href={href} target="_blank" rel="noreferrer">
          {value}
        </a>
      ) : (
        <span className={`val${mono ? ' mono' : ''}`}>{value}</span>
      )}
      <CopyButton value={value} variant="mini" />
    </div>
  );
}
