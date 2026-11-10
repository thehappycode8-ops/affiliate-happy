'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClipStatus } from '@/lib/types';
import { expiryNote, formatDate, formatDateTime } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import CopyButton from './CopyButton';
import { ProductChips } from './ProductPicker';
import RewardCard, { type RewardInfo } from './RewardCard';

interface ClipRow {
  id: string;
  seq: number;
  clip_url: string;
  gen_code: string | null;
  code_expires_at: string | null;
  products: string[];
  content_type: string | null;
  status: ClipStatus;
  feedback: string | null;
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  days_to_expire: number | null;
}

interface ResultRow {
  id: string;
  ref_code: string;
  full_name: string;
  tiktok_username: string;
  phone_masked: string | null;
  created_at: string;
  clips: ClipRow[];
}

export default function StatusCheck({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [owner, setOwner] = useState<{ full_name: string; tiktok_username: string } | null>(null);
  const [approved, setApproved] = useState(0);

  const search = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    setError('');
    setResults(null);
    setReward(null);
    setOwner(null);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'ตรวจสอบไม่สำเร็จ');
        return;
      }
      setResults(json.results);
      setReward(json.reward ?? null);
      setOwner(json.owner ?? null);
      setApproved(json.summary?.approved ?? 0);
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      search(initialQuery);
    }
  }, [initialQuery, search]);

  return (
    <>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
      >
        <h2>เช็กสถานะคลิปที่ส่ง</h2>
        <p className="sub">กรอกเบอร์โทรที่ใช้ส่ง หรือรหัสอ้างอิง (เช่น HPY-2609-A3F91)</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label htmlFor="q">เบอร์โทร หรือ รหัสอ้างอิง</label>
          <input
            id="q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="08x-xxx-xxxx หรือ HPY-xxxx-xxxxx"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy || !query.trim()}>
          {busy ? <span className="spin" /> : null}
          {busy ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}
        </button>
      </form>

      {reward && owner && results && results.length > 0 && (
        <RewardCard
          reward={reward}
          name={owner.full_name}
          tiktok={owner.tiktok_username}
          approved={approved}
        />
      )}

      {results?.map((r) => {
        const approved = r.clips.filter((c) => c.status === 'approved').length;
        const pending = r.clips.filter((c) => c.status === 'pending').length;
        const rejected = r.clips.filter((c) => c.status === 'rejected').length;

        return (
          <div className="card" key={r.id}>
            <div className="result-head">
              <div>
                <div className="ref">{r.ref_code}</div>
                <p className="who">{r.full_name}</p>
                <div className="meta">
                  {r.tiktok_username} · {r.phone_masked} · ส่งเมื่อ {formatDateTime(r.created_at)}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                <div style={{ fontWeight: 500, color: 'var(--brand-700)' }}>
                  {r.clips.length} คลิป
                </div>
                <div style={{ color: 'var(--ink-mute)' }}>
                  อนุมัติ {approved} · รอตรวจ {pending} · ไม่อนุมัติ {rejected}
                </div>
              </div>
            </div>

            {r.clips.map((c) => {
              const exp = expiryNote(c.days_to_expire);
              return (
                <div className="clip-row" key={c.id}>
                  <div className="clip-row-head">
                    <span className="n">คลิปที่ {c.seq}</span>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="copy-field" style={{ marginBottom: 8 }}>
                    <a className="val mono" href={c.clip_url} target="_blank" rel="noreferrer">
                      {c.clip_url}
                    </a>
                    <CopyButton value={c.clip_url} variant="mini" label="คัดลอกลิงก์" />
                  </div>

                  <div className="clip-meta">
                    <span>
                      Gen Code <b className="mono">{c.gen_code || '-'}</b>
                      {c.gen_code && <CopyButton value={c.gen_code} variant="mini" />}
                    </span>
                    {c.code_expires_at && (
                      <span>
                        หมดอายุ <b>{formatDate(c.code_expires_at)}</b>{' '}
                        {exp && <span className={`pill pill-${exp.tone}`}>{exp.text}</span>}
                      </span>
                    )}
                    {c.products?.length > 0 && (
                      <span>
                        สินค้า <ProductChips products={c.products} size="sm" />
                      </span>
                    )}
                    {c.content_type && (
                      <span>
                        ประเภท <b>{c.content_type}</b>
                      </span>
                    )}
                    {c.reviewed_at && (
                      <span>
                        {c.status === 'approved' ? 'วันที่อนุมัติ' : 'วันที่ตรวจ'}{' '}
                        <b>{formatDateTime(c.reviewed_at)}</b>
                      </span>
                    )}
                  </div>

                  {c.status === 'rejected' && c.reject_reason && (
                    <div className="alert alert-error" style={{ margin: '10px 0 0' }}>
                      <strong>เหตุผล:</strong> {c.reject_reason}
                    </div>
                  )}

                  {c.feedback && (
                    <div className="alert alert-info" style={{ margin: '10px 0 0' }}>
                      <strong>ความคิดเห็นจากทีมงาน:</strong> {c.feedback}
                    </div>
                  )}
                </div>
              );
            })}

            {pending > 0 && (
              <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>
                ยังมี {pending} คลิปรอทีมงานตรวจสอบ กลับมาเช็กที่หน้านี้ได้ตลอดเวลา
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
