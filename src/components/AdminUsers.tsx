'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import CopyButton from './CopyButton';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

/** สุ่มรหัสผ่านที่อ่านง่าย ไม่มีตัวอักษรที่สับสน (0/O, 1/l/I) */
function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export default function AdminUsers({ meId }: { meId: string }) {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('admin');
  const [password, setPassword] = useState('');
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ดึงรายชื่อไม่สำเร็จ');
        return;
      }
      setRows(json.data || []);
      setError('');
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOkMsg('');
    setCreated(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'สร้างแอดมินไม่สำเร็จ');
        return;
      }
      setCreated({ email, password });
      setEmail('');
      setFullName('');
      setPassword('');
      setRole('admin');
      await load();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, msg: string) {
    setError('');
    setOkMsg('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'อัปเดตไม่สำเร็จ');
        return;
      }
      setOkMsg(msg);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(u: AdminUser) {
    const pwd = randomPassword();
    if (!window.confirm(`ตั้งรหัสผ่านใหม่ให้ ${u.email} เป็น\n\n${pwd}\n\nยืนยันไหม? (คัดลอกเก็บไว้ก่อนกดตกลง)`))
      return;
    await patch(u.id, { password: pwd }, `ตั้งรหัสผ่านใหม่ให้ ${u.email} แล้ว: ${pwd}`);
  }

  async function remove(u: AdminUser) {
    if (!window.confirm(`ลบแอดมิน ${u.email} ออกจากระบบถาวร?\nลบแล้วกู้คืนไม่ได้`)) return;
    setBusy(true);
    setError('');
    setOkMsg('');
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ลบไม่สำเร็จ');
        return;
      }
      setOkMsg(`ลบ ${u.email} แล้ว`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {okMsg && <div className="alert alert-ok">{okMsg}</div>}

      <form className="card" onSubmit={createUser}>
        <div className="section-head">
          <h3>เพิ่มแอดมินใหม่</h3>
        </div>
        <hr className="section-divider" />

        {created && (
          <div className="alert alert-ok">
            <strong>สร้างบัญชีให้ {created.email} แล้ว</strong>
            <div className="copy-field" style={{ marginTop: 10, background: '#fff' }}>
              <span className="val mono">{created.password}</span>
              <CopyButton value={created.password} variant="mini" label="คัดลอกรหัสผ่าน" />
            </div>
            <p className="note" style={{ marginTop: 8 }}>
              คัดลอกส่งให้เจ้าตัวเลย — รหัสผ่านนี้จะไม่แสดงอีก (ถ้าลืมให้กด &ldquo;รีเซ็ตรหัสผ่าน&rdquo; ในตารางด้านล่าง)
            </p>
          </div>
        )}

        <div className="grid-2">
          <div className="field">
            <label htmlFor="u-email">
              อีเมล <span className="req">*</span>
            </label>
            <input
              id="u-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@happy.com"
            />
          </div>
          <div className="field">
            <label htmlFor="u-name">ชื่อที่แสดง</label>
            <input
              id="u-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="เช่น พี่หมิว (ทีมคอนเทนต์)"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="u-role">สิทธิ์</label>
            <select id="u-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">แอดมิน — ตรวจและอนุมัติคลิป</option>
              <option value="owner">เจ้าของระบบ — เพิ่ม/ลบแอดมินได้ด้วย</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="u-pass">
              รหัสผ่าน <span className="req">*</span> <span className="hint">อย่างน้อย 8 ตัว</span>
            </label>
            <input
              id="u-pass"
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ตั้งเอง หรือกดสุ่ม"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => setPassword(randomPassword())}
            >
              สุ่มรหัสผ่าน
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <span className="spin" /> : null}
          {busy ? 'กำลังสร้าง...' : 'สร้างแอดมิน'}
        </button>
      </form>

      <div className="card">
        <div className="section-head">
          <h3>แอดมินทั้งหมด</h3>
          <span className="count">{rows.length} คน</span>
        </div>
        <hr className="section-divider" />

        <div className="table-wrap" style={{ boxShadow: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>สิทธิ์</th>
                <th>สถานะ</th>
                <th>เข้าใช้งานล่าสุด</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const isMe = u.id === meId;
                return (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 500 }}>
                      {u.full_name || '-'}
                      {isMe && <span className="pill pill-ok" style={{ marginLeft: 6 }}>คุณ</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={busy || isMe}
                        onChange={(e) =>
                          patch(u.id, { role: e.target.value }, `เปลี่ยนสิทธิ์ ${u.email} แล้ว`)
                        }
                        style={{ width: 'auto', padding: '5px 9px', fontSize: 13 }}
                      >
                        <option value="admin">แอดมิน</option>
                        <option value="owner">เจ้าของระบบ</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge badge-${u.is_active ? 'approved' : 'rejected'}`}>
                        {u.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td>{u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : 'ยังไม่เคยเข้า'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => resetPassword(u)}
                      >
                        รีเซ็ตรหัสผ่าน
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 6 }}
                        disabled={busy || isMe}
                        onClick={() =>
                          patch(
                            u.id,
                            { is_active: !u.is_active },
                            u.is_active ? `ปิดการใช้งาน ${u.email} แล้ว` : `เปิดการใช้งาน ${u.email} แล้ว`
                          )
                        }
                      >
                        {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                      <button
                        className="btn btn-bad btn-sm"
                        style={{ marginLeft: 6 }}
                        disabled={busy || isMe}
                        onClick={() => remove(u)}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!busy && rows.length === 0 && <div className="empty">ยังไม่มีแอดมิน</div>}
        </div>

        <p className="note" style={{ marginTop: 14 }}>
          <strong>แอดมิน</strong> เข้าดูและอนุมัติคลิปได้ · <strong>เจ้าของระบบ</strong> ทำได้ทุกอย่าง
          รวมถึงเพิ่ม/ลบแอดมินหน้านี้ · ปิดใช้งานแล้วบัญชีจะเข้าหลังบ้านไม่ได้ทันที แต่ยังเก็บประวัติการตรวจไว้
        </p>
      </div>
    </>
  );
}
