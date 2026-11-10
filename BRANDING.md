# BRANDING.md — แบรนด์ Happy ในโปรเจคนี้

บริษัท แฮปปี้ เร็จจี้888 จำกัด · โคลนจากเทมเพลตระบบส่งคลิป คงโครงสร้างและฟีเจอร์ทั้งหมด
ใส่โลโก้ (vector จาก Logo.pdf) และธีมสีน้ำตาล-ชมพู-ขาวตามโลโก้แล้ว (10 พ.ย. 2569)

## 0. สีที่ใช้
| ชื่อ | HEX | ใช้ที่ |
|---|---|---|
| Brown | `#603B31` | `--brand-600` ปุ่ม หัวข้อ ตัวอักษรโลโก้ themeColor |
| Pink | `#EEB8C1` | `--brand-300` / `--brand-pink` พื้นรอง ป้าย เงาโฟกัส |
| Blush | `#FDF4F5` | พื้นหลัง `--canvas` |
| Dark Brown | `#3D241E` | ข้อความหลัก `--ink` |

## 1. สีแบรนด์ — แก้ที่เดียว (ถ้าต้องปรับอีก)
`src/app/globals.css` บล็อก `:root` ด้านบนสุด

| ตัวแปร | ใช้ทำอะไร | แนวทาง |
|---|---|---|
| `--brand-50` … `--brand-900` | สีหลักทั้งเว็บ ปุ่ม / หัวข้อ / เส้นขอบ / เกรเดียนต์ | ไล่จากอ่อน (50) → เข้ม (900) สร้างจากสีหลักของ CI ได้ที่ uicolors.app หรือ tailwind shades |
| `--brand-glow`, `--brand-glow-soft`, `--brand-glow-0` | เงาเรืองรอบช่องที่โฟกัส/การ์ดที่เลือก | ใช้ค่า RGB ของ `--brand-400` ที่ alpha .16 / .22 / 0 |
| `--brand-tint`, `--brand-tint-2` | พื้นอ่อนสุดของช่องกรอก และปลายเกรเดียนต์พื้นหลัง | ใกล้ `--brand-50` แต่อ่อนกว่า |
| `--ink`, `--ink-soft`, `--ink-mute` | สีตัวอักษร | โทนเข้มของสีหลักผสมดำ |
| `--line`, `--canvas` | เส้นแบ่ง / พื้นหลังหน้า | โทนอ่อนมากของสีหลัก |
| `--shadow`, `--shadow-sm` | เงาการ์ด | เปลี่ยน rgba ให้เป็นโทนของ `--brand-900` |

สีสถานะ (`--ok` เขียว, `--warn` ส้ม, `--bad` แดง) ไม่ต้องเปลี่ยน ยกเว้น CI กำหนดไว้

จุดอื่นที่ต้องให้ตรงกัน
- `src/app/layout.tsx` → `themeColor` (สีแถบเบราว์เซอร์มือถือ) = `--brand-600`
- `public/logo.svg`, `src/app/icon.svg` → สี fill ในไฟล์

## 2. โลโก้ (ใส่แล้ว)
| ไฟล์ | ใช้ที่ไหน | หมายเหตุ |
|---|---|---|
| `src/components/Logo.tsx` | หน้าแรก, แถบหลังบ้าน, หน้าล็อกอิน | vector 2 สี: พื้นชมพูคงที่ ตัวอักษรใช้ currentColor |
| `public/logo.svg` | โลโก้ SVG สีดำ | |
| `public/logo-source.pdf` | ไฟล์ต้นฉบับที่ได้รับ | เก็บไว้อ้างอิง |
| `src/app/icon.svg` | favicon ตัว J serif สีแชมเปญบนพื้นดำ | |

## 3. ฟอนต์
ตอนนี้ใช้ **Kanit** (โหลดจาก Google Fonts ใน `src/app/layout.tsx` และ `font-family` ใน `globals.css`)
ถ้า CI กำหนดฟอนต์อื่น เปลี่ยน 2 จุดนี้

## 4. ข้อความและรหัส
| สิ่งที่เปลี่ยนแล้ว | ค่าปัจจุบัน | อยู่ที่ |
|---|---|---|
| ชื่อแบรนด์บนเว็บ | `HAPPY` | `.env.example` → `NEXT_PUBLIC_BRAND_NAME` (ตั้งใน Vercel ด้วย) |
| ข้อความใต้หัวข้อ "ส่งคลิป" | นายหน้า กลุ่ม VIP แกนนำ x HAPPY · … | `NEXT_PUBLIC_CAMPAIGN_SUBTITLE` |
| รหัสอ้างอิง | `HPY-YYMM-XXXXX` | `supabase/schema.sql` ฟังก์ชัน `generate_ref_code`, ข้อความตัวอย่างใน `StatusCheck.tsx`, `api/status/route.ts` |
| ชื่อไฟล์ CSV ที่ export | `clips-hpy-<วันที่>.csv` | `api/admin/export/route.ts` |
| อีเมลตัวอย่างในฟอร์ม | `admin@happy.com`, `staff@happy.com` | `LoginForm.tsx`, `AdminUsers.tsx` |
| TikTok ตัวอย่าง | `@happy.official` | `ClipSubmitForm.tsx` |
| คีย์ localStorage | `hpy_popup_seen`, `hpy_help_hidden*` | `CampaignPopup.tsx`, `HelpButton.tsx`, `admin/page.tsx` |

## 5. ข้อมูลที่ยังว่าง (ใส่ผ่านหน้าหลังบ้านได้ ไม่ต้องแก้โค้ด)
- **สินค้า** — seed ไว้ 1 รายการ Night Gold Hya Whitening Mask พร้อมรูป (ตัดพื้นขาวจากภาพที่ได้รับ) เพิ่มได้จากหลังบ้าน → แก้ที่ `/admin/products` (หรือแก้ `supabase/schema.sql` ก่อนรัน)
- **รางวัล / เงื่อนไข / โปสเตอร์แคมเปญ** — ค่าเริ่มต้น 40 คลิป ชื่อรางวัลชั่วคราว ไม่มีรูป → `/admin/reward`
- **คู่มือ PDF** — `public/docs/manual-user.pdf` และ `manual-admin.pdf` ยังไม่มี (ของเดิมเป็นของ TGM) ปุ่ม "คู่มือการใช้งาน" จะเปิดไม่เจอไฟล์จนกว่าจะวางคู่มือใหม่

## 6. ตอนขึ้นระบบจริง (แยกจาก TGM ทั้งหมด)
1. สร้าง Supabase project ใหม่ → รัน `supabase/schema.sql`
2. สร้างแอดมินคนแรกตามขั้นตอนใน `README.md`
3. สร้าง repo GitHub ใหม่ → deploy บน Vercel โปรเจคใหม่ → ตั้ง env ทั้ง 5 ตัวตาม `.env.example`
