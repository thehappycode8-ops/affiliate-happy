'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  DATE_FIELDS,
  STATUS_LABEL,
  type ClipFull,
  type ClipStats,
  type ClipStatus,
  type DateField,
} from '@/lib/types';
import { addDaysISO, expiryNote, formatDate, formatDateTime, formatPhone, todayISO } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import ClipDrawer from './ClipDrawer';
import Logo from './Logo';
import CopyButton from './CopyButton';
import { ProductChips } from './ProductPicker';
import { useProducts } from '@/lib/products';

const PER_PAGE = 25;

export default function AdminDashboard({
  adminEmail,
  adminName,
  adminRole,
}: {
  adminEmail: string;
  adminName: string;
  adminRole: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ClipFull[]>([]);
  const [stats, setStats] = useState<ClipStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [expiry, setExpiry] = useState('');
  const [product, setProduct] = useState('');
  const [ad, setAd] = useState('');                       // '' | 'yes' | 'no'

  // ---- ช่องกรอก (ยังไม่ค้นหา จนกว่าจะกดปุ่ม "ค้นหา" หรือกด Enter) ----
  const [qDraft, setQDraft] = useState('');
  const [dateField, setDateField] = useState<DateField>('created_at');
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');

  // ---- ค่าที่ใช้ค้นหาจริง ----
  const [applied, setApplied] = useState<{
    q: string;
    field: DateField;
    from: string;
    to: string;
  }>({ q: '', field: 'created_at', from: '', to: '' });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ClipFull | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const { products: catalog } = useProducts();

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      if (status) params.set('status', status);
      if (expiry) params.set('expiry', expiry);
      if (product) params.set('product', product);
      if (ad) params.set('ad', ad);
      if (applied.from || applied.to) {
        params.set('date_field', applied.field);
        if (applied.from) params.set('date_from', applied.from);
        if (applied.to) params.set('date_to', applied.to);
      }
      if (applied.q) params.set('q', applied.q);

      const res = await fetch(`/api/admin/clips?${params}`);
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ดึงข้อมูลไม่สำเร็จ');
        return;
      }
      setRows(json.data || []);
      setStats(json.stats || null);
      setTotal(json.total || 0);
      setChecked(new Set());
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [page, status, expiry, product, ad, applied, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(newStatus: ClipStatus) {
    let reason = '';
    if (newStatus === 'rejected') {
      reason = window.prompt('เหตุผลที่ไม่อนุมัติ (ผู้ส่งจะเห็นข้อความนี้)') || '';
      if (!reason.trim()) return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...checked], status: newStatus, reject_reason: reason }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || 'อัปเดตไม่สำเร็จ');
    await load();
  }

  /** ติ๊ก / ยกเลิกติ๊ก "ยิงแอดแล้ว" ในตารางทีละแถว */
  async function toggleAd(row: ClipFull) {
    const next = !row.ad_boosted;
    setError('');
    // อัปเดตหน้าจอทันที แล้วย้อนกลับถ้าเซิร์ฟเวอร์ปฏิเสธ
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ad_boosted: next } : r)));
    const res = await fetch(`/api/admin/clips/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_boosted: next }),
    });
    const json = await res.json();
    if (!res.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ad_boosted: !next } : r)));
      setError(json.error || 'อัปเดตไม่สำเร็จ');
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? (json.data as ClipFull) : r)));
    load();
  }

  /** ติ๊ก / ยกเลิกติ๊ก "ยิงแอดแล้ว" หลายคลิปพร้อมกัน */
  async function bulkAd(on: boolean) {
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...checked], ad_boosted: on }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || 'อัปเดตไม่สำเร็จ');
    else if (json.skipped > 0) {
      setError(`อัปเดต ${json.updated} คลิป · ข้าม ${json.skipped} คลิปที่ยังไม่อนุมัติ`);
    }
    await load();
  }

  async function bulkDelete() {
    const n = checked.size;
    const ok = window.confirm(
      `ลบ ${n} คลิปนี้ออกจากระบบถาวร?\n\n` +
        'ลบแล้วกู้คืนไม่ได้ · ถ้าผู้ส่งคนไหนไม่เหลือคลิปเลย ชื่อผู้ส่งจะถูกลบไปด้วย'
    );
    if (!ok) return;

    setBusy(true);
    const res = await fetch('/api/admin/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...checked] }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || 'ลบไม่สำเร็จ');
    setChecked(new Set());
    await load();
  }

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const exportQs = new URLSearchParams();
  if (status) exportQs.set('status', status);
  if (expiry) exportQs.set('expiry', expiry);
  if (product) exportQs.set('product', product);
  if (ad) exportQs.set('ad', ad);
  if (applied.from || applied.to) {
    exportQs.set('date_field', applied.field);
    if (applied.from) exportQs.set('date_from', applied.from);
    if (applied.to) exportQs.set('date_to', applied.to);
  }

  /** กดปุ่ม "ค้นหา" — เอาค่าที่กรอกไว้ทั้งหมดไปใช้จริง */
  function runSearch() {
    setPage(1);
    setApplied({ q: qDraft.trim(), field: dateField, from: fromDraft, to: toDraft });
  }

  /** ปุ่มช่วงวันที่ด่วน — ตั้งวันให้แล้วค้นหาทันที ไม่ต้องกดซ้ำ */
  function quickRange(kind: 'today' | 'last7' | 'month') {
    const t = todayISO();
    const from = kind === 'today' ? t : kind === 'last7' ? addDaysISO(-6) : `${t.slice(0, 8)}01`;
    setFromDraft(from);
    setToDraft(t);
    setPage(1);
    setApplied({ q: qDraft.trim(), field: dateField, from, to: t });
  }

  function clearDates() {
    setFromDraft('');
    setToDraft('');
    setPage(1);
    setApplied((a) => ({ ...a, from: '', to: '' }));
  }

  /** กดการ์ดสรุป — ตั้งตัวกรองชุดใหม่ ล้างตัวที่ไม่เกี่ยวออก */
  function pick(next: { status?: string; expiry?: string; ad?: string } = {}) {
    setPage(1);
    setStatus(next.status ?? '');
    setExpiry(next.expiry ?? '');
    setAd(next.ad ?? '');
  }

  const today = todayISO();
  const dateOn = Boolean(fromDraft || toDraft);
  const isToday = applied.from === today && applied.to === today;
  const isLast7 = applied.from === addDaysISO(-6) && applied.to === today;
  const isMonth = applied.from === `${today.slice(0, 8)}01` && applied.to === today;

  /** มีค่าที่กรอกไว้แต่ยังไม่ได้กดค้นหา */
  const dirty =
    qDraft.trim() !== applied.q ||
    fromDraft !== applied.from ||
    toDraft !== applied.to ||
    (dateField !== applied.field && Boolean(fromDraft || toDraft));

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch();
  };

  return (
    <>
      <div className="admin-bar">
        <div className="admin-brand">
          <Logo className="admin-logo" />
          <div>
            <div className="title">สำหรับแอดมิน</div>
            <div className="who">เข้าใช้งานโดย {adminName}</div>
          </div>
        </div>
        <div className="actions" style={{ margin: 0 }}>
          {adminRole === 'owner' && (
            <a className="btn btn-ghost btn-sm" href="/admin/users">
              บัญชีแอดมิน
            </a>
          )}
          <a className="btn btn-ghost btn-sm" href="/admin/products">
            จัดการสินค้า
          </a>
          <a className="btn btn-ghost btn-sm" href="/admin/reward">
            ตั้งค่ารางวัล
          </a>
          <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noreferrer">
            ดูหน้าส่งคลิป
          </a>
          <a className="btn btn-ghost btn-sm" href={`/api/admin/export?${exportQs}`}>
            ดาวน์โหลด CSV
          </a>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            ออกจากระบบ
          </button>
        </div>
      </div>

      <main className="page" style={{ paddingTop: 20 }}>
        <div className="shell-wide">
          {stats && (
            <div className="stats">
              <div
                className={`stat clickable${!status && !expiry && !ad ? ' on' : ''}`}
                onClick={() => pick()}
              >
                <div className="n">{stats.total}</div>
                <div className="l">คลิปทั้งหมด</div>
              </div>
              <div className="stat">
                <div className="n">{stats.submitters}</div>
                <div className="l">ผู้ส่ง</div>
              </div>
              <div className="stat">
                <div className="n">{stats.today}</div>
                <div className="l">ส่งเข้ามาวันนี้</div>
              </div>
              <div
                className={`stat clickable warn${status === 'pending' && !ad ? ' on' : ''}`}
                onClick={() => pick({ status: 'pending' })}
              >
                <div className="n">{stats.pending}</div>
                <div className="l">รอตรวจสอบ</div>
              </div>
              <div
                className={`stat clickable${status === 'approved' && !ad ? ' on' : ''}`}
                onClick={() => pick({ status: 'approved' })}
              >
                <div className="n">{stats.approved}</div>
                <div className="l">อนุมัติแล้ว</div>
              </div>
              <div
                className={`stat clickable bad${status === 'rejected' && !ad ? ' on' : ''}`}
                onClick={() => pick({ status: 'rejected' })}
              >
                <div className="n">{stats.rejected}</div>
                <div className="l">ไม่อนุมัติ</div>
              </div>
              <div
                className={`stat clickable${ad === 'yes' ? ' on' : ''}`}
                onClick={() => pick({ ad: 'yes' })}
                title="คลิปที่อนุมัติแล้วและติ๊กว่ายิงแอดแล้ว"
              >
                <div className="n">{stats.ad_boosted ?? 0}</div>
                <div className="l">ยิงแอดแล้ว</div>
              </div>
              <div
                className={`stat clickable warn${ad === 'no' ? ' on' : ''}`}
                onClick={() => pick({ ad: 'no' })}
                title="คลิปที่อนุมัติแล้ว แต่ยังไม่ได้ยิงแอด"
              >
                <div className="n">{stats.ad_waiting ?? 0}</div>
                <div className="l">รอยิงแอด</div>
              </div>
              <div
                className={`stat clickable warn${expiry === 'soon' ? ' on' : ''}`}
                onClick={() => pick({ expiry: 'soon' })}
              >
                <div className="n">{stats.expiring_soon}</div>
                <div className="l">โค้ดใกล้หมดอายุ (7 วัน)</div>
              </div>
              <div
                className={`stat clickable bad${expiry === 'expired' ? ' on' : ''}`}
                onClick={() => pick({ expiry: 'expired' })}
              >
                <div className="n">{stats.expired}</div>
                <div className="l">โค้ดหมดอายุแล้ว</div>
              </div>
            </div>
          )}

          <div className="toolbar">
            <input
              type="text"
              placeholder="ค้นหา ชื่อ / เบอร์ / TikTok / Gen Code / รหัสอ้างอิง"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={onEnter}
            />
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">ทุกสถานะ</option>
              {(Object.keys(STATUS_LABEL) as ClipStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={expiry}
              onChange={(e) => {
                setPage(1);
                setExpiry(e.target.value);
              }}
            >
              <option value="">วันหมดอายุ: ทั้งหมด</option>
              <option value="soon">ใกล้หมดอายุ (≤ 7 วัน)</option>
              <option value="expired">หมดอายุแล้ว</option>
            </select>
            <select
              value={product}
              onChange={(e) => {
                setPage(1);
                setProduct(e.target.value);
              }}
            >
              <option value="">สินค้า: ทั้งหมด</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={ad}
              onChange={(e) => {
                setPage(1);
                setAd(e.target.value);
              }}
            >
              <option value="">ยิงแอด: ทั้งหมด</option>
              <option value="yes">ยิงแอดแล้ว</option>
              <option value="no">รอยิงแอด</option>
            </select>
            <button
              className={`btn btn-sm btn-search${dirty ? ' is-dirty' : ''}`}
              onClick={runSearch}
              disabled={busy}
            >
              🔍 ค้นหา
            </button>
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={busy}>
              {busy ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-mute)' }}>
              ทั้งหมด {total} คลิป
            </span>
          </div>

          <div className={`date-filter${dateOn ? ' is-on' : ''}`}>
            <span className="df-label">ช่วงวันที่</span>
            <select
              className="df-field"
              value={dateField}
              onChange={(e) => setDateField(e.target.value as DateField)}
            >
              {(Object.keys(DATE_FIELDS) as DateField[]).map((k) => (
                <option key={k} value={k}>
                  {DATE_FIELDS[k]}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="df-date"
              aria-label="ตั้งแต่วันที่"
              value={fromDraft}
              max={toDraft || undefined}
              onChange={(e) => setFromDraft(e.target.value)}
              onKeyDown={onEnter}
            />
            <span className="df-dash">ถึง</span>
            <input
              type="date"
              className="df-date"
              aria-label="ถึงวันที่"
              value={toDraft}
              min={fromDraft || undefined}
              onChange={(e) => setToDraft(e.target.value)}
              onKeyDown={onEnter}
            />
            <button
              type="button"
              className={`btn btn-sm btn-search df-go${dirty ? ' is-dirty' : ''}`}
              onClick={runSearch}
              disabled={busy}
            >
              ค้นหา
            </button>
            <div className="df-quick">
              <button
                type="button"
                className={`df-chip${isToday ? ' is-on' : ''}`}
                onClick={() => quickRange('today')}
              >
                วันนี้
              </button>
              <button
                type="button"
                className={`df-chip${isLast7 ? ' is-on' : ''}`}
                onClick={() => quickRange('last7')}
              >
                7 วัน
              </button>
              <button
                type="button"
                className={`df-chip${isMonth ? ' is-on' : ''}`}
                onClick={() => quickRange('month')}
              >
                เดือนนี้
              </button>
              {(dateOn || applied.from || applied.to) && (
                <button type="button" className="df-chip df-clear" onClick={clearDates}>
                  ✕ ล้างช่วงวันที่
                </button>
              )}
            </div>
            {dirty && <div className="df-hint">กด “ค้นหา” เพื่อใช้เงื่อนไขที่เพิ่งเลือก</div>}
            {!dirty && (applied.from || applied.to) && (
              <div className="df-hint df-ok">
                กำลังกรอง {DATE_FIELDS[applied.field]}
                {applied.from ? ` ตั้งแต่ ${formatDate(applied.from)}` : ''}
                {applied.to ? ` ถึง ${formatDate(applied.to)}` : ''} · พบ {total} คลิป
              </div>
            )}
          </div>

          {checked.size > 0 && (
            <div className="bulk-bar">
              <span>เลือกไว้ {checked.size} คลิป</span>
              <button className="btn btn-ok btn-sm" onClick={() => bulk('approved')} disabled={busy}>
                ✓ อนุมัติทั้งหมด
              </button>
              <button className="btn btn-bad btn-sm" onClick={() => bulk('rejected')} disabled={busy}>
                ✕ ไม่อนุมัติทั้งหมด
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => bulkAd(true)}
                disabled={busy}
                title="ติ๊กว่ายิงแอดแล้ว (เฉพาะคลิปที่อนุมัติแล้ว)"
              >
                📣 ยิงแอดแล้ว
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => bulkAd(false)}
                disabled={busy}
                title="ยกเลิกการติ๊กว่ายิงแอดแล้ว"
              >
                ↩ ยกเลิกยิงแอด
              </button>
              {adminRole === 'owner' && (
                <button className="btn btn-bad btn-sm" onClick={bulkDelete} disabled={busy}>
                  🗑 ลบทิ้งถาวร
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setChecked(new Set())}>
                ยกเลิกการเลือก
              </button>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="tick">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && checked.size === rows.length}
                      onChange={(e) =>
                        setChecked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                      }
                    />
                  </th>
                  <th>ผู้ส่ง</th>
                  <th>TikTok</th>
                  <th>เบอร์โทร</th>
                  <th>คลิป</th>
                  <th>ลิงก์</th>
                  <th>Gen Code</th>
                  <th>หมดอายุ</th>
                  <th>สินค้า</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th className="ad-col">ยิงแอดแล้ว</th>
                  <th>วันที่ส่ง</th>
                  <th>วันที่อนุมัติ / ตรวจ</th>
                  <th>ความคิดเห็น</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const exp = expiryNote(r.days_to_expire);
                  return (
                    <tr
                      key={r.id}
                      className={checked.has(r.id) ? 'sel' : ''}
                      onClick={() => setSelected(r)}
                    >
                      <td className="tick" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked.has(r.id)}
                          onChange={() => toggle(r.id)}
                        />
                      </td>
                      <td style={{ fontWeight: 500 }}>{r.full_name}</td>
                      <td>
                        {r.tiktok_profile_url ? (
                          <a
                            href={r.tiktok_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.tiktok_username}
                          </a>
                        ) : (
                          r.tiktok_username
                        )}
                      </td>
                      <td>{formatPhone(r.phone)}</td>
                      <td>#{r.seq}</td>
                      <td className="link">
                        <a
                          href={r.clip_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          เปิดคลิป ↗
                        </a>
                        <CopyButton value={r.clip_url} variant="mini" label="คัดลอก" />
                      </td>
                      <td>
                        <span className="mono" title={r.gen_code || ''}>
                          {r.gen_code || '-'}
                        </span>
                        {r.gen_code && <CopyButton value={r.gen_code} variant="mini" />}
                      </td>
                      <td>
                        {r.code_expires_at ? (
                          <>
                            {formatDate(r.code_expires_at)}{' '}
                            {exp && <span className={`pill pill-${exp.tone}`}>{exp.text}</span>}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td><ProductChips products={r.products} size="sm" /></td>
                      <td>{r.content_type || '-'}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="ad-col" onClick={(e) => e.stopPropagation()}>
                        {r.status === 'approved' ? (
                          <label
                            className={`ad-tick${r.ad_boosted ? ' is-on' : ''}`}
                            title={
                              r.ad_boosted
                                ? `ยิงแอดแล้ว · ${formatDateTime(r.ad_boosted_at)}${
                                    r.ad_boosted_by ? ` · ${r.ad_boosted_by}` : ''
                                  }`
                                : 'ติ๊กเมื่อยิงแอดคลิปนี้แล้ว'
                            }
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(r.ad_boosted)}
                              onChange={() => toggleAd(r)}
                            />
                            <span>{r.ad_boosted ? 'ยิงแล้ว' : 'ยังไม่ยิง'}</span>
                          </label>
                        ) : (
                          <span className="ad-na" title="ติ๊กได้เฉพาะคลิปที่อนุมัติแล้ว">
                            -
                          </span>
                        )}
                      </td>
                      <td>{formatDateTime(r.created_at)}</td>
                      <td>{r.reviewed_at ? formatDateTime(r.reviewed_at) : '-'}</td>
                      <td className="link" title={r.feedback || ''}>
                        {r.feedback || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!busy && rows.length === 0 && <div className="empty">ยังไม่มีคลิปที่ตรงกับเงื่อนไข</div>}
          </div>

          {lastPage > 1 && (
            <div className="pager">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← ก่อนหน้า
              </button>
              <span>
                หน้า {page} / {lastPage}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                ถัดไป →
              </button>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <ClipDrawer
          clip={selected}
          adminEmail={adminEmail}
          adminRole={adminRole}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
          onSaved={(updated) => {
            setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setSelected(updated);
            load();
          }}
        />
      )}
    </>
  );
}
