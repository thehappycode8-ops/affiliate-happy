-- =====================================================================
-- HAPPY — ระบบรับผลงานนายหน้า (ส่งคลิป)
-- Supabase schema — รันทั้งไฟล์นี้ใน Supabase Dashboard > SQL Editor
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Enum สถานะของคลิป
--    pending   = รอตรวจสอบ
--    approved  = อนุมัติ
--    rejected  = ไม่อนุมัติ
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'clip_status') then
    create type public.clip_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) ฟังก์ชันสร้างรหัสอ้างอิงของการส่งแต่ละครั้ง เช่น HPY-2609-A3F91
-- ---------------------------------------------------------------------
create or replace function public.generate_ref_code()
returns text
language plpgsql
as $$
declare
  new_code text;
begin
  loop
    new_code := 'HPY-'
      || to_char(timezone('Asia/Bangkok', now()), 'YYMM')
      || '-'
      || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    exit when not exists (
      select 1 from public.submissions where ref_code = new_code
    );
  end loop;
  return new_code;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) ผู้ส่ง (1 แถว = การกดส่ง 1 ครั้ง ซึ่งมีได้หลายคลิป)
-- ---------------------------------------------------------------------
create table if not exists public.submissions (
  id                uuid primary key default gen_random_uuid(),
  ref_code          text unique not null default public.generate_ref_code(),

  phone             text not null,
  phone_normalized  text generated always as (regexp_replace(phone, '[^0-9]', '', 'g')) stored,
  first_name        text not null,
  last_name         text not null,
  tiktok_username   text not null,
  tiktok_profile_url text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_sub_phone   on public.submissions (phone_normalized);
create index if not exists idx_sub_tiktok  on public.submissions (lower(tiktok_username));
create index if not exists idx_sub_created on public.submissions (created_at desc);

-- ---------------------------------------------------------------------
-- 4) คลิปที่ส่ง
-- ---------------------------------------------------------------------
create table if not exists public.clips (
  id               uuid primary key default gen_random_uuid(),
  submission_id    uuid not null references public.submissions(id) on delete cascade,
  seq              int  not null default 1,          -- คลิปที่ 1, 2, 3 ...

  clip_url         text not null,                    -- ลิงก์คลิป
  gen_code         text,                             -- Gen Code ที่ได้จากทีมงาน
  code_expires_at  date,                             -- วันหมดอายุของโค้ด (ไม่บังคับ)
  products         text[] not null default '{}',     -- สินค้า (เลือกได้หลายรายการ)
  content_type     text,                             -- ประเภทคอนเทนต์

  status           public.clip_status not null default 'pending',
  feedback         text,                             -- ความคิดเห็นจากทีมงาน (ผู้ส่งเห็น)
  admin_note       text,                             -- หมายเหตุภายใน (ผู้ส่งไม่เห็น)
  reject_reason    text,                             -- เหตุผลที่ไม่อนุมัติ (ผู้ส่งเห็น)
  reviewed_by      uuid references auth.users(id) on delete set null,
  reviewed_at      timestamptz,                      -- วันที่อนุมัติ / วันที่ตรวจ

  ad_boosted       boolean not null default false,   -- ยิงแอดแล้วหรือยัง (ติ๊กได้เฉพาะคลิปที่อนุมัติแล้ว)
  ad_boosted_at    timestamptz,                      -- ติ๊กเมื่อไหร่
  ad_boosted_by    text,                             -- อีเมลแอดมินที่ติ๊ก

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- รองรับการอัปเกรดจาก schema เวอร์ชันก่อนหน้า (ต้องอยู่ก่อนสร้าง index)
-- ---------------------------------------------------------------------
alter table public.clips add column if not exists feedback text;
alter table public.clips add column if not exists products text[] not null default '{}';
alter table public.submissions add column if not exists tiktok_profile_url text;
alter table public.clips add column if not exists code_valid_days int;

-- ติ๊ก "ยิงแอดแล้ว" (ใช้ได้เฉพาะคลิปที่อนุมัติแล้ว)
alter table public.clips add column if not exists ad_boosted boolean not null default false;
alter table public.clips add column if not exists ad_boosted_at timestamptz;
alter table public.clips add column if not exists ad_boosted_by text;

-- ย้ายข้อมูลจากคอลัมน์ product (เลือกได้อันเดียว) มาเป็น products (หลายอัน)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clips' and column_name = 'product'
  ) then
    -- view เดิมอ้างถึงคอลัมน์ product ต้องทิ้งก่อนถึงจะ drop คอลัมน์ได้
    drop view if exists public.v_clips_full;
    execute $mig$
      update public.clips
         set products = array[product]
       where product is not null and product <> '' and cardinality(products) = 0
    $mig$;
    execute 'alter table public.clips drop column product';
  end if;
end $$;

create index if not exists idx_clip_sub     on public.clips (submission_id, seq);
create index if not exists idx_clip_status  on public.clips (status);
create index if not exists idx_clip_created on public.clips (created_at desc);
create index if not exists idx_clip_expires on public.clips (code_expires_at)
  where code_expires_at is not null;
create unique index if not exists idx_clip_gencode
  on public.clips (lower(gen_code))
  where gen_code is not null and gen_code <> '';
create index if not exists idx_clip_products on public.clips using gin (products);
create index if not exists idx_clip_reviewed on public.clips (reviewed_at desc)
  where reviewed_at is not null;
create index if not exists idx_clip_ad on public.clips (ad_boosted);

-- ---------------------------------------------------------------------
-- 4.5) สินค้า — แอดมินแก้ชื่อ/รูป/ลำดับได้เองจากหลังบ้าน
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,          -- ชื่อที่บันทึกลงคลิปและขึ้นในรายงาน
  sub         text,                          -- ชื่อบนแพ็กเกจ (ไม่บังคับ)
  image_url   text,                          -- ลิงก์รูป (ไฟล์ใน public/ หรือ Supabase Storage)
  sort_order  int  not null default 100,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_products_order on public.products (sort_order, name);

-- ใส่สินค้าตั้งต้น 1 รายการ (รันซ้ำไม่ทับของที่แอดมินแก้ไปแล้ว)
-- [BRAND] Happy — แก้ชื่อ/รูป หรือเพิ่มสินค้าได้จากหน้าหลังบ้าน (/admin/products)
insert into public.products (name, sub, image_url, sort_order) values
  ('Night Gold Hya Whitening Mask', 'Happy Official · 30 g', '/products/night-gold-hya-set.png', 10)
on conflict (name) do nothing;

-- ที่เก็บรูปสินค้าที่แอดมินอัปโหลด (ข้ามอัตโนมัติถ้ารันนอก Supabase)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'storage' and table_name = 'buckets') then
    execute $b$
      insert into storage.buckets (id, name, public)
      values ('product-images', 'product-images', true)
      on conflict (id) do update set public = true
    $b$;
  end if;
end $$;

-- เปลี่ยนชื่อสินค้า แล้วให้คลิปเก่าที่เคยเลือกไว้เปลี่ยนตามด้วย
create or replace function public.rename_product_in_clips(old_name text, new_name text)
returns void
language sql
as $$
  update public.clips
     set products = array_replace(products, old_name, new_name)
   where products @> array[old_name];
$$;

-- ---------------------------------------------------------------------
-- 4.6) รางวัลเมื่อส่งคลิปครบตามเงื่อนไข — แอดมินตั้งค่าเองจากหลังบ้าน
--      เก็บแถวเดียว (id = 1) เพื่อให้แก้ง่ายและไม่มีทางซ้ำ
-- ---------------------------------------------------------------------
create table if not exists public.reward_settings (
  id            int primary key default 1 check (id = 1),
  enabled       boolean not null default true,
  target_clips  int     default 40,          -- null = ไม่กำหนดจำนวนคลิป (โชว์แค่แคมเปญ/ป็อปอัพ)
  prize_title   text    not null default 'DINNER ทริปเรือยอร์ช พัทยา สุด Exclusive',
  prize_detail  text,          -- บรรทัดรายละเอียดใต้ชื่อรางวัล
  headline      text    not null default 'คุณคือผู้พิชิตรางวัล',
  contact_note  text,          -- ข้อความแจ้งว่าทีมงานจะติดต่อกลับเมื่อไหร่
  image_url     text,          -- โปสเตอร์แคมเปญ โชว์บนการ์ดตอนทำครบ
  updated_at    timestamptz not null default now()
);

-- เผื่อ DB ที่ติดตั้งไว้ก่อนมีคอลัมน์รูป
alter table public.reward_settings add column if not exists image_url text;
alter table public.reward_settings add column if not exists popup_enabled boolean not null default true;
-- ช่องทางติดต่อทีมงาน (แก้ได้จากหลังบ้าน) — รันซ้ำได้
alter table public.reward_settings add column if not exists contact_title text;
alter table public.reward_settings add column if not exists contact_line_url text;
alter table public.reward_settings add column if not exists contact_line_id text;
update public.reward_settings set contact_title = coalesce(contact_title, 'แอดไลน์เพื่อสอบถาม'), contact_line_id = coalesce(contact_line_id, 'Ploywadee88') where id = 1;
-- ให้ target_clips เว้นว่างได้ (ไม่กำหนดจำนวนคลิป) — รันซ้ำได้
alter table public.reward_settings alter column target_clips drop not null;
alter table public.reward_settings drop constraint if exists reward_settings_target_clips_check;
alter table public.reward_settings add constraint reward_settings_target_clips_check
  check (target_clips is null or target_clips > 0);

insert into public.reward_settings
  (id, enabled, target_clips, prize_title, prize_detail, headline, contact_note, image_url)
values (
  1, true, 40,
  'รางวัลแคมเปญ Happy (รอกำหนด)',
  'ทีมงานจะประกาศรายละเอียดรางวัลเร็ว ๆ นี้',
  'คุณคือผู้พิชิตรางวัล',
  'ทีมงานจะติดต่อกลับทางเบอร์ที่ลงทะเบียนไว้ภายใน 7 วันทำการ',
  null
)
on conflict (id) do nothing;

-- ที่เก็บโปสเตอร์รางวัลที่แอดมินอัปโหลด (ข้ามอัตโนมัติถ้ารันนอก Supabase)
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'storage' and table_name = 'buckets') then
    execute $b$
      insert into storage.buckets (id, name, public)
      values ('reward-images', 'reward-images', true)
      on conflict (id) do update set public = true
    $b$;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5) ไทม์ไลน์การดำเนินการของแต่ละคลิป
-- ---------------------------------------------------------------------
create table if not exists public.clip_events (
  id          bigint generated always as identity primary key,
  clip_id     uuid not null references public.clips(id) on delete cascade,
  status      public.clip_status,
  message     text,
  actor       text,                     -- 'system' | อีเมลแอดมิน
  created_at  timestamptz not null default now()
);

create index if not exists idx_ce_clip on public.clip_events (clip_id, created_at);

-- ---------------------------------------------------------------------
-- 6) รายชื่อแอดมินที่เข้าหลังบ้านได้ (ผูกกับ auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'admin',   -- 'admin' | 'owner'
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7) Triggers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sub_touch on public.submissions;
create trigger trg_sub_touch
  before update on public.submissions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_reward_touch on public.reward_settings;
create trigger trg_reward_touch
  before update on public.reward_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_clip_touch on public.clips;
create trigger trg_clip_touch
  before update on public.clips
  for each row execute function public.touch_updated_at();

-- บันทึกเหตุการณ์อัตโนมัติเมื่อส่งคลิป / เปลี่ยนสถานะ
create or replace function public.log_clip_event()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.clip_events (clip_id, status, message, actor)
    values (new.id, new.status, 'ได้รับคลิปเรียบร้อย รอทีมงานตรวจสอบ', 'system');
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.clip_events (clip_id, status, message, actor)
    values (
      new.id,
      new.status,
      case new.status
        when 'approved' then 'อนุมัติคลิปเรียบร้อย'
        when 'rejected' then coalesce(nullif(new.reject_reason, ''), 'คลิปไม่ผ่านการตรวจสอบ')
        else 'กลับไปเป็นสถานะรอตรวจสอบ'
      end,
      'system'  -- ฝั่งแอปจะเขียนทับด้วยอีเมลแอดมินที่กดจริง
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clip_log_insert on public.clips;
create trigger trg_clip_log_insert
  after insert on public.clips
  for each row execute function public.log_clip_event();

drop trigger if exists trg_clip_log_update on public.clips;
create trigger trg_clip_log_update
  after update on public.clips
  for each row execute function public.log_clip_event();

-- ---------------------------------------------------------------------
-- 8) Row Level Security
--    ปิดทุกอย่างสำหรับ anon/authenticated — ทุกการอ่าน/เขียนวิ่งผ่าน
--    Next.js API route ที่ใช้ service_role key เท่านั้น
-- ---------------------------------------------------------------------
alter table public.submissions enable row level security;
alter table public.clips       enable row level security;
alter table public.clip_events enable row level security;
alter table public.products    enable row level security;
alter table public.reward_settings enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "admin reads own profile" on public.admin_users;
create policy "admin reads own profile"
  on public.admin_users for select
  to authenticated
  using (id = auth.uid());

revoke all on public.submissions from anon, authenticated;
revoke all on public.clips       from anon, authenticated;
revoke all on public.clip_events from anon, authenticated;
revoke all on public.products    from anon, authenticated;
revoke all on public.reward_settings from anon, authenticated;

-- ---------------------------------------------------------------------
-- 9) View รวมคลิป + ข้อมูลผู้ส่ง (ใช้ในหน้าหลังบ้าน)
-- ---------------------------------------------------------------------
drop view if exists public.v_clips_full;
create view public.v_clips_full as
select
  c.id,
  c.submission_id,
  c.seq,
  c.clip_url,
  c.gen_code,
  c.code_expires_at,
  c.code_valid_days,
  c.products,
  c.content_type,
  c.status,
  c.feedback,
  c.admin_note,
  c.reject_reason,
  c.reviewed_by,
  c.reviewed_at,
  c.ad_boosted,
  c.ad_boosted_at,
  c.ad_boosted_by,
  c.created_at,
  c.updated_at,
  s.ref_code,
  s.phone,
  s.phone_normalized,
  s.first_name,
  s.last_name,
  (s.first_name || ' ' || s.last_name) as full_name,
  s.tiktok_username,
  s.tiktok_profile_url,
  case
    when c.code_expires_at is null then null
    else (c.code_expires_at - (timezone('Asia/Bangkok', now()))::date)
  end as days_to_expire
from public.clips c
join public.submissions s on s.id = c.submission_id;

revoke all on public.v_clips_full from anon, authenticated;

-- ---------------------------------------------------------------------
-- 10) View สรุปตัวเลขสำหรับหน้าหลังบ้าน
-- ---------------------------------------------------------------------
drop view if exists public.v_clip_stats;
create view public.v_clip_stats as
select
  (select count(*) from public.clips)                                   as total,
  (select count(*) from public.clips where status = 'pending')          as pending,
  (select count(*) from public.clips where status = 'approved')         as approved,
  (select count(*) from public.clips where status = 'rejected')         as rejected,
  (select count(*) from public.clips
     where created_at >= date_trunc('day', timezone('Asia/Bangkok', now()))) as today,
  (select count(*) from public.clips
     where code_expires_at is not null
       and code_expires_at >= (timezone('Asia/Bangkok', now()))::date
       and code_expires_at <= (timezone('Asia/Bangkok', now()))::date + 7) as expiring_soon,
  (select count(*) from public.clips
     where code_expires_at is not null
       and code_expires_at < (timezone('Asia/Bangkok', now()))::date)   as expired,
  (select count(*) from public.clips
     where status = 'approved' and ad_boosted)                          as ad_boosted,
  (select count(*) from public.clips
     where status = 'approved' and not ad_boosted)                      as ad_waiting,
  (select count(distinct phone_normalized) from public.submissions)     as submitters;  -- นับคนตามเบอร์ไม่ซ้ำ

revoke all on public.v_clip_stats from anon, authenticated;

-- =====================================================================
-- 11) วิธีเพิ่มแอดมินคนแรก
-- ---------------------------------------------------------------------
-- 1. Supabase Dashboard > Authentication > Users > "Add user"
--    ใส่อีเมล + รหัสผ่าน แล้วติ๊ก "Auto Confirm User"
-- 2. คัดลอก User UID มาแทนใน SQL ข้างล่าง แล้วรัน
--
-- insert into public.admin_users (id, email, full_name, role)
-- values ('<USER-UID-ที่คัดลอกมา>', 'admin@happy.com', 'ผู้ดูแลระบบ', 'owner')
-- on conflict (id) do update
--   set email = excluded.email, full_name = excluded.full_name, role = excluded.role;
-- =====================================================================
