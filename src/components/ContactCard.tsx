/** แถบช่องทางติดต่อทีมงาน (แบบเรียบ อยู่ท้ายหน้า) — ค่าตั้งได้จากหลังบ้าน: ตั้งค่ารางวัล → ช่องทางติดต่อทีมงาน */
export default function ContactCard({
  title,
  lineUrl,
  lineId,
}: {
  title: string | null;
  lineUrl: string | null;
  lineId: string | null;
}) {
  if (!lineUrl && !lineId) return null;
  const heading = title || 'ติดต่อทีมงาน';

  return (
    <p className="contact-line" aria-label="ช่องทางติดต่อทีมงาน">
      <span className="contact-dot" aria-hidden="true" />
      <span>
        มีคำถาม? <b>{heading}</b>
        {lineId ? <> · Line ID <b>{lineId}</b></> : null}
      </span>
      {lineUrl && (
        <a href={lineUrl} target="_blank" rel="noopener noreferrer">
          เพิ่มเพื่อน ↗
        </a>
      )}
    </p>
  );
}
