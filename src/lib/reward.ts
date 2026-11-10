export interface RewardSettings {
  enabled: boolean;
  /** null = ไม่กำหนดจำนวนคลิป — โชว์แค่ข้อมูลแคมเปญ/ป็อปอัพ ไม่มีแถบความคืบหน้า */
  target_clips: number | null;
  prize_title: string;
  prize_detail: string | null;
  headline: string;
  contact_note: string | null;
  image_url: string | null;
  /** โชว์รูปแคมเปญเป็นป็อปอัพตอนเปิดหน้าเว็บหรือไม่ */
  popup_enabled: boolean;
  /** ช่องทางติดต่อทีมงาน — โชว์ใต้แท็บส่งคลิป/เช็กสถานะ (ว่างทั้งคู่ = ไม่โชว์) */
  contact_title: string | null;
  contact_line_url: string | null;
  contact_line_id: string | null;
}

/** ค่าเริ่มต้น ใช้ตอนที่ยังไม่มีแถวในตาราง (หรือยังไม่ได้รัน schema.sql) */
export const DEFAULT_REWARD: RewardSettings = {
  enabled: true,
  target_clips: 40,
  prize_title: 'รางวัลแคมเปญ Happy (รอกำหนด)',
  prize_detail: 'ทีมงานจะประกาศรายละเอียดรางวัลเร็ว ๆ นี้',
  headline: 'คุณคือผู้พิชิตรางวัล',
  contact_note: 'ทีมงานจะติดต่อกลับทางเบอร์ที่ลงทะเบียนไว้ภายใน 7 วันทำการ',
  image_url: null,
  popup_enabled: true,
  contact_title: 'แอดไลน์เพื่อสอบถาม',
  contact_line_url: null,
  contact_line_id: 'Ploywadee88',
};
