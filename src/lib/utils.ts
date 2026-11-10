export function normalizePhone(input: string): string {
  return (input || '').replace(/[^0-9]/g, '');
}

export function isValidThaiPhone(input: string): boolean {
  const n = normalizePhone(input);
  return n.length >= 9 && n.length <= 12;
}

export function formatPhone(input: string): string {
  const n = normalizePhone(input);
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  return input;
}

export function isLikelyUrl(input: string): boolean {
  const v = (input || '').trim();
  return /^https?:\/\/\S+\.\S+/i.test(v);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ข้อความเตือนวันหมดอายุของโค้ด */
export function expiryNote(days: number | null | undefined): {
  text: string;
  tone: 'ok' | 'warn' | 'bad';
} | null {
  if (days === null || days === undefined) return null;
  if (days < 0) return { text: `หมดอายุแล้ว ${Math.abs(days)} วัน`, tone: 'bad' };
  if (days === 0) return { text: 'หมดอายุวันนี้', tone: 'bad' };
  if (days <= 7) return { text: `เหลืออีก ${days} วัน`, tone: 'warn' };
  return { text: `เหลืออีก ${days} วัน`, tone: 'ok' };
}

export function normalizeTikTok(input: string): string {
  const v = (input || '').trim();
  if (!v) return '';
  const fromUrl = v.match(/tiktok\.com\/@([A-Za-z0-9._-]+)/i);
  const handle = fromUrl ? fromUrl[1] : v.replace(/^@/, '');
  return `@${handle}`;
}

/** นับจำนวนวันจากวันนี้ (เวลาไทย) ถึงวันที่รูปแบบ YYYY-MM-DD */
export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00+07:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

/** วันนี้ในรูปแบบ YYYY-MM-DD (เวลาไทย) ใช้เป็นค่า min ของช่องวันที่ */
export function todayISO(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** วันที่ (YYYY-MM-DD เวลาไทย) เมื่อนับจากวันนี้ไปอีก n วัน */
export function addDaysISO(days: number): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** ขอบล่างของวัน (เวลาไทย) เป็น ISO UTC — ใช้กรองคอลัมน์ timestamptz
 *  รับเฉพาะรูปแบบ YYYY-MM-DD ถ้าไม่ตรงคืน null (ไม่ต้องกรอง) */
export function dayStartUTC(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null;
  const d = new Date(`${day}T00:00:00.000+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ขอบบนของวัน (เวลาไทย 23:59:59.999) เป็น ISO UTC */
export function dayEndUTC(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null;
  const d = new Date(`${day}T23:59:59.999+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
