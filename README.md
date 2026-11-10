# Happy — ระบบรับผลงานนายหน้า (ส่งคลิป)

ระบบ **หน้าเดียวจบ** สำหรับให้นายหน้า/แกนนำส่งคลิป + เช็กสถานะ

- **หน้าบ้าน (`/`)** — แท็บ *ส่งคลิป* และ *เช็กสถานะ* อยู่หน้าเดียวกัน
  ใครทำครบตามเงื่อนไข (เริ่มต้น **40 คลิปที่อนุมัติแล้ว**) จะเห็นการ์ด **"ยินดีด้วย!"**
  พร้อมโปสเตอร์แคมเปญและรางวัล บนสุดของหน้าเช็กสถานะ
- **หลังบ้าน (`/admin`)** — ล็อกอินเข้าไปอนุมัติ / ไม่อนุมัติ / แก้ไข / โหลด CSV
- **ฐานข้อมูล** — Supabase (PostgreSQL + Auth)
- **ฟอนต์** — Kanit · **ธีม** — Happy (น้ำตาล / ชมพู / ขาว) → ดู `BRANDING.md`

---

## 1. ข้อมูลที่ฟอร์มเก็บ

**ข้อมูลของคุณ**

| ช่อง | บังคับ |
|---|---|
| เบอร์โทร | ✓ |
| ชื่อ | ✓ |
| นามสกุล | ✓ |
| TikTok username | ✓ |

**คลิปที่ส่ง** — เพิ่มได้สูงสุด **20 คลิป** ต่อการส่ง 1 ครั้ง

| ช่อง | บังคับ |
|---|---|
| ลิงก์คลิป | ✓ |
| Gen Code | ✓ |
| วันหมดอายุของโค้ด | – (ใส่ไว้เพื่อให้ทีมงานเตือนก่อนโค้ดหมดอายุ) |
| สินค้า | – **เลือกได้หลายรายการ** จากการ์ดรูปสินค้า |
| ประเภทคอนเทนต์ | – (ค่าเริ่มต้น "ไม่ระบุ") |

ส่งเสร็จได้ **รหัสอ้างอิง** `HPY-YYMM-XXXXX` ไว้เช็กสถานะ (หรือใช้เบอร์โทรก็ได้)

---

## 2. ติดตั้ง Supabase

1. สมัคร/เข้า [supabase.com](https://supabase.com) → **New project**
   - Region แนะนำ **Southeast Asia (Singapore)**
2. **SQL Editor → New query** → copy ทั้งไฟล์ `supabase/schema.sql` → paste → **Run**
   - สคริปต์นี้ **รันซ้ำได้เสมอ** (มีอัปเดตอะไรใหม่ก็รันไฟล์นี้ทับได้เลย)
   - สร้างตาราง `products` พร้อมสินค้าตั้งต้น 1 รายการ (Night Gold Hya Mask พร้อมรูป แก้ได้จากหลังบ้าน) และ bucket `product-images` ให้อัตโนมัติ
   - สร้างตาราง `reward_settings` (เงื่อนไข + รางวัล + ภาพแคมเปญ) และ bucket `reward-images` ให้ด้วย

### สร้างแอดมินคนแรก (ทำครั้งเดียว)

หน้าล็อกอิน **ไม่มีสมัครสมาชิก** — คนแรกต้องสร้างจาก Supabase ก่อน

1. **Authentication → Users → Add user** — ใส่อีเมล + รหัสผ่าน แล้วติ๊ก **Auto Confirm User**
2. คัดลอก **User UID** ที่ได้
3. **SQL Editor** รันคำสั่งนี้ (แทน UID และอีเมลจริง) — ต้องเป็น `owner` เท่านั้น

```sql
insert into public.admin_users (id, email, full_name, role)
values ('<USER-UID>', 'admin@happy.com', 'ผู้ดูแลระบบ', 'owner')
on conflict (id) do update
  set email = excluded.email, full_name = excluded.full_name, role = 'owner';
```

4. แนะนำ: **Authentication → Sign In / Providers** ปิด **"Allow new users to sign up"**
   จะได้ไม่มีใครสมัครเข้ามาเองได้

### เพิ่มคนถัดไป — ทำในเว็บได้เลย

ล็อกอินเป็น `owner` แล้วเข้า **`/admin/users`** (ปุ่ม "จัดการผู้ใช้" บนแถบหลังบ้าน)
สร้างบัญชีให้ทีมได้ในหน้าเดียว มีปุ่มสุ่มรหัสผ่าน + คัดลอกส่งให้เจ้าตัว
ไม่ต้องเข้า Supabase อีก

| สิทธิ์ | ทำอะไรได้ |
|---|---|
| `admin` | ดู ตรวจ อนุมัติ/ไม่อนุมัติคลิป แก้ข้อมูลคลิป โหลด CSV |
| `owner` | ทุกอย่างของ admin + จัดการผู้ใช้ (เพิ่ม/ปิดใช้งาน/รีเซ็ตรหัสผ่าน/ลบ) |

ระบบกันไว้ให้แล้ว: ปิดใช้งาน ลดสิทธิ์ หรือลบบัญชีตัวเองไม่ได้
และต้องเหลือ `owner` ที่ใช้งานได้อย่างน้อย 1 คนเสมอ

### เอาคีย์มาใส่

**Project Settings → API**

| ค่าใน Supabase | ตัวแปร |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ `service_role` key ข้ามทุกกฎความปลอดภัยของฐานข้อมูล — ใส่ได้เฉพาะฝั่งเซิร์ฟเวอร์
> **ห้าม** ตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_` และห้าม commit ขึ้น Git

---

## 3. รันบนเครื่องตัวเอง

```bash
npm install
cp .env.example .env.local     # แล้วแก้ค่าใน .env.local ให้เป็นของจริง
npm run dev
```

เปิด http://localhost:3000 (หน้าส่งคลิป) · http://localhost:3000/admin (หลังบ้าน)

---

## 4. Deploy ขึ้น Netlify (แนะนำ) หรือ Vercel

### Netlify
1. push โค้ดขึ้น GitHub (private ได้)
2. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project → GitHub** → เลือก repo
   (มี `netlify.toml` ให้แล้ว Netlify จะรู้เองว่าเป็น Next.js ไม่ต้องแก้ค่า build)
3. ก่อนกด Deploy เปิด **Environment variables** ใส่ตัวแปรทั้ง 5 ตัวตาม `.env.example`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_CAMPAIGN_SUBTITLE`
4. **Deploy site** → ได้ URL `ชื่อ.netlify.app` (เปลี่ยนชื่อ/ต่อโดเมนจริงที่ **Site configuration → Domain management**)
5. แก้โค้ดแล้ว push ขึ้น GitHub → Netlify deploy ใหม่ให้อัตโนมัติ

### Vercel (ทางเลือก)
ขั้นตอนเหมือนกัน: vercel.com → Add New → Project → เลือก repo → ใส่ Environment Variables → Deploy

## 5. โฟลว์การทำงาน

```
นายหน้ากรอกฟอร์ม → ส่งได้ทีละหลายคลิป
      ↓  ได้รหัสอ้างอิง HPY-YYMM-XXXXX ทันที
  ทุกคลิป = pending (รอตรวจสอบ)
      ↓  แอดมินเปิดหลังบ้าน กดรายคลิป หรือติ๊กหลายคลิปแล้วกดทีเดียว
  approved (อนุมัติ)  /  rejected (ไม่อนุมัติ + ต้องระบุเหตุผล)
      ↓
  นายหน้าเห็นผลที่แท็บ "เช็กสถานะ" ทันที
```

**สถานะเป็นรายคลิป** ไม่ใช่รายคน — คนหนึ่งส่ง 5 คลิป อนุมัติ 3 ไม่อนุมัติ 2 ได้

---

## 6. หลังบ้านทำอะไรได้

- การ์ดสรุป: คลิปทั้งหมด / ผู้ส่ง / ส่งวันนี้ / รอตรวจ / อนุมัติ / ไม่อนุมัติ — **กดที่การ์ดเพื่อกรอง**
- **โค้ดใกล้หมดอายุ (≤ 7 วัน)** และ **โค้ดหมดอายุแล้ว** — กดดูรายการได้ ใช้ไล่เตือนนายหน้า
- ค้นหา: ชื่อ / เบอร์ / TikTok / Gen Code / รหัสอ้างอิง / ลิงก์
- ติ๊กหลายคลิป → อนุมัติหรือไม่อนุมัติพร้อมกัน
- เปิดรายละเอียดคลิป: อนุมัติ/ไม่อนุมัติ, แก้ Gen Code / วันหมดอายุ / สินค้า / ประเภท, หมายเหตุภายใน, ดูประวัติว่าใครกดอะไรตอนไหน
- ดาวน์โหลด CSV (เปิดใน Excel ภาษาไทยได้ ไม่เพี้ยน)
- **จัดการสินค้า** (`/admin/products`) — เพิ่มสินค้าใหม่พร้อมอัปโหลดรูป, แก้ชื่อ/ชื่อบนแพ็กเกจ,
  เปลี่ยนรูป, สลับลำดับ ↑↓, ซ่อนชั่วคราว, ลบ
  ชื่อที่แก้จะถูกอัปเดตให้คลิปเก่าที่เคยเลือกสินค้านั้นไว้ด้วยอัตโนมัติ
  รายการนี้คือรายการเดียวกับที่โผล่ในฟอร์มส่งคลิปและรูปตกแต่งหัวเว็บ
- **ตั้งค่ารางวัล** (`/admin/reward`) — ตั้งว่าครบกี่คลิปถึงได้รางวัล (ค่าเริ่มต้น **40**),
  ชื่อรางวัล, รายละเอียด, ข้อความติดต่อกลับ และ **อัปโหลดโปสเตอร์แคมเปญ**
  มีตัวอย่างสดให้ดูว่านายหน้าจะเห็นแบบไหน · เปิด/ปิดได้ทั้งก้อนตอนแคมเปญยังไม่เริ่มหรือแจกครบแล้ว

---

## 7. ความปลอดภัย

- เปิด **RLS** ทุกตาราง + revoke สิทธิ์ `anon`/`authenticated` — เข้าถึงข้อมูลตรง ๆ ไม่ได้
- ทุกการอ่าน/เขียนวิ่งผ่าน API route ฝั่งเซิร์ฟเวอร์ที่ใช้ `service_role` เท่านั้น
- หน้าเช็กสถานะคืนเฉพาะฟิลด์ที่ผู้ส่งควรเห็น เบอร์โทรถูกปิดบัง (`08xxxxx5678`) และ **ไม่ส่ง** หมายเหตุภายในออกไป
- `/admin` + `/api/admin/*` ตรวจ 2 ชั้น: ต้องล็อกอิน Supabase Auth **และ** มีชื่อใน `admin_users` ที่ `is_active = true`
- **Gen Code ห้ามซ้ำ** ทั้งในฟอร์มเดียวกันและกับที่เคยส่งเข้ามาแล้ว (บังคับที่ระดับฐานข้อมูล)

---

## 8. โครงสร้างไฟล์

```
supabase/schema.sql               SQL ทั้งหมด (รันครั้งเดียวตอนติดตั้ง)
src/app/page.tsx                  หน้าบ้าน — ส่งคลิป + เช็กสถานะ
src/app/admin/page.tsx            หลังบ้าน (ต้องล็อกอิน)
src/app/admin/login/page.tsx      หน้าเข้าสู่ระบบ
src/app/admin/users/page.tsx      บัญชีแอดมิน (เฉพาะ owner)
src/app/admin/products/page.tsx   จัดการสินค้า (ชื่อ + รูป)
src/app/admin/reward/page.tsx     ตั้งค่ารางวัลเมื่อส่งคลิปครบ
src/app/api/admin/users/          GET/POST/PATCH/DELETE ผู้ใช้หลังบ้าน
src/app/api/admin/products/       GET/POST/PATCH/DELETE สินค้า
src/app/api/products/             GET รายการสินค้าที่เปิดใช้งาน (หน้าบ้านเรียก)
src/app/api/submissions/          POST รับคลิปเข้าระบบ
src/app/api/status/               POST เช็กสถานะด้วยเบอร์/รหัสอ้างอิง
src/app/api/admin/clips/          GET รายการคลิป + PATCH รายคลิป
src/app/api/admin/bulk/           POST อนุมัติ/ไม่อนุมัติหลายคลิป
src/app/api/admin/export/         GET ดาวน์โหลด CSV
src/components/ClipSubmitForm.tsx ฟอร์มส่งคลิป
src/components/StatusCheck.tsx    หน้าเช็กสถานะ
src/components/AdminDashboard.tsx ตารางหลังบ้าน
src/components/ClipDrawer.tsx     แผงรายละเอียด/อนุมัติรายคลิป
src/components/AdminProducts.tsx  หน้าจัดการสินค้า
src/components/AdminReward.tsx    หน้าตั้งค่ารางวัล + ตัวอย่างสด
src/components/RewardCard.tsx     การ์ด "ยินดีด้วย!" / แถบความคืบหน้า
src/components/ProductPicker.tsx  การ์ดเลือกสินค้า (เลือกได้หลายรายการ)
src/lib/product-image.ts          อัปโหลดรูปขึ้น Supabase Storage (สินค้า + โปสเตอร์รางวัล)
public/reward/yacht-trip.jpg      โปสเตอร์แคมเปญตั้งต้น (แอดมินเปลี่ยนได้จากหลังบ้าน)
src/app/globals.css               ธีมฟ้า + ฟอนต์ Kanit (แก้สีที่ :root)
```

---

## 9. ปรับแต่งที่ทำได้ทันที

| อยากเปลี่ยน | แก้ที่ |
|---|---|
| รายการ **สินค้า** (ชื่อ + รูป) | **หลังบ้าน → จัดการสินค้า** (`/admin/products`) ไม่ต้องแก้โค้ด |
| **รางวัล** + จำนวนคลิปที่ต้องทำให้ครบ | **หลังบ้าน → ตั้งค่ารางวัล** (`/admin/reward`) ไม่ต้องแก้โค้ด |
| ตัวเลือก **ประเภทคอนเทนต์** | `CONTENT_TYPES` ใน `src/lib/types.ts` |
| จำนวนคลิปสูงสุดต่อครั้ง | `MAX_CLIPS` ใน `src/lib/types.ts` |
| เฉดสีฟ้า / ฟอนต์ | ตัวแปร `--brand-*` ใน `src/app/globals.css` |
| ข้อความหัวเว็บ | env `NEXT_PUBLIC_CAMPAIGN_SUBTITLE` |
| ข้อความไทม์ไลน์แต่ละสถานะ | trigger `log_clip_event()` ใน `schema.sql` |
| เกณฑ์ "ใกล้หมดอายุ" (ตอนนี้ 7 วัน) | `v_clip_stats` ใน `schema.sql` + `expiryNote()` ใน `src/lib/utils.ts` |
