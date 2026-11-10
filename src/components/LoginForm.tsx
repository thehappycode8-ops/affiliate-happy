'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(
        authError.message.includes('Invalid login')
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
          : authError.message
      );
      setBusy(false);
      return;
    }

    router.replace('/admin');
    router.refresh();
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>เข้าสู่ระบบหลังบ้าน</h2>
      <p className="sub">สำหรับทีมงานที่ดูแลการอนุมัติ Affiliate</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="email">อีเมล</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@happy.com"
        />
      </div>

      <div className="field">
        <label htmlFor="password">รหัสผ่าน</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? <span className="spin" /> : null}
        {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
