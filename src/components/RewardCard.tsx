'use client';

export interface RewardInfo {
  enabled: boolean;
  target_clips: number | null;
  prize_title: string;
  prize_detail: string | null;
  headline: string;
  contact_note: string | null;
  image_url: string | null;
  achieved: boolean;
  remaining: number;
}

function Trophy() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
      <path d="M18 3h2.5A1.5 1.5 0 0 1 22 4.5V6a4 4 0 0 1-3.6 3.98A6.5 6.5 0 0 1 13 14.4V17h2.5a1 1 0 0 1 1 1v.5H7.5V18a1 1 0 0 1 1-1H11v-2.6a6.5 6.5 0 0 1-5.4-4.42A4 4 0 0 1 2 6V4.5A1.5 1.5 0 0 1 3.5 3H6V2h12v1Zm0 2v3.9A2 2 0 0 0 20 6V5h-2ZM6 8.9V5H4v1a2 2 0 0 0 2 2.9ZM6 20h12a1 1 0 0 1 1 1v1H5v-1a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

/**
 * การ์ดรางวัล — โชว์บนหน้าเช็กสถานะ
 *  - ครบตามเงื่อนไข  -> การ์ด "ยินดีด้วย!" พร้อมรางวัลและข้อความติดต่อกลับ
 *  - ยังไม่ครบ        -> แถบความคืบหน้า บอกว่าเหลืออีกกี่คลิป
 */
export default function RewardCard({
  reward,
  name,
  tiktok,
  approved,
}: {
  reward: RewardInfo;
  name: string;
  tiktok: string;
  approved: number;
}) {
  if (reward.achieved) {
    return (
      <div className="reward-card">
        <span className="reward-medal">
          <Trophy />
        </span>

        <h2 className="reward-title">ยินดีด้วย!</h2>
        <p className="reward-name">{name}</p>
        <p className="reward-user">{tiktok}</p>

        <p className="reward-cond">
          {reward.headline}
          <br />
          ทำครบ {reward.target_clips} คลิป ตามเงื่อนไข
        </p>

        {reward.image_url && (
          <div className="reward-poster">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={reward.image_url} alt={reward.prize_title} loading="lazy" />
          </div>
        )}

        <div className="reward-prize">
          <strong>{reward.prize_title}</strong>
          {reward.prize_detail && <span>{reward.prize_detail}</span>}
        </div>

        {reward.contact_note && <p className="reward-note">{reward.contact_note}</p>}
      </div>
    );
  }

  // ไม่กำหนดจำนวนคลิป -> การ์ดข้อมูลแคมเปญ (โปสเตอร์ + รางวัล) ไม่มีแถบความคืบหน้า
  if (reward.target_clips === null) {
    return (
      <div className="reward-card reward-card-info">
        {reward.image_url && (
          <div className="reward-poster">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={reward.image_url} alt={reward.prize_title} loading="lazy" />
          </div>
        )}
        <div className="reward-prize">
          <strong>{reward.prize_title}</strong>
          {reward.prize_detail && <span>{reward.prize_detail}</span>}
        </div>
        <p className="reward-note">
          อนุมัติแล้ว <b>{approved}</b> คลิป
          {reward.contact_note ? ` · ${reward.contact_note}` : ''}
        </p>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((approved / reward.target_clips) * 100));

  return (
    <div className="reward-progress">
      <div className="rp-head">
        <div>
          <div className="rp-label">ความคืบหน้าเพื่อรับรางวัล</div>
          <div className="rp-prize">{reward.prize_title}</div>
        </div>
        <div className="rp-count">
          <b>{approved}</b> / {reward.target_clips}
        </div>
      </div>

      <div className="rp-bar" role="img" aria-label={`อนุมัติแล้ว ${approved} จาก ${reward.target_clips} คลิป`}>
        <span style={{ width: `${pct}%` }} />
      </div>

      <p className="rp-foot">
        อีก <b>{reward.remaining}</b> คลิปที่อนุมัติแล้ว จะครบตามเงื่อนไข
        {reward.prize_detail ? ` · ${reward.prize_detail}` : ''}
      </p>
    </div>
  );
}
