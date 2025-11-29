-- 勤怠管理システム DB スキーマ
-- Supabase SQL Editor で実行してください

-- 1. clinics（クリニック設定）
create table if not exists public.clinics (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  timezone      text not null default 'Asia/Tokyo',
  rounding_unit integer not null default 5,   -- 丸め単位（分）: 5, 10, 15...
  rounding_mode text not null default 'nearest', -- 'floor' | 'ceil' | 'nearest'
  created_at    timestamptz not null default now()
);

-- 2. staffs（パート職員）
create table if not exists public.staffs (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics(id) on delete cascade,
  name          text not null,
  hourly_wage   numeric(10,2) not null default 0, -- 時給
  pin_hash      text not null,                   -- PIN のハッシュ（平文は保存しない）
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_staffs_clinic_id on public.staffs (clinic_id);

-- 3. admins（管理者メタ情報）
create table if not exists public.admins (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  user_id    uuid not null, -- auth.users.id
  role       text not null default 'owner', -- 拡張余地
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

-- 4. ENUM 型の作成（既に存在する場合はスキップ）
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'attendance_source') then
    create type public.attendance_source as enum ('tablet', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('open', 'closed');
  end if;
end $$;

-- 5. attendances（勤怠レコード）
create table if not exists public.attendances (
  id                      uuid primary key default gen_random_uuid(),
  clinic_id               uuid not null references public.clinics(id) on delete cascade,
  staff_id                uuid not null references public.staffs(id) on delete cascade,

  work_date               date not null, -- 勤務日（ローカル日付）

  -- 実打刻（サーバ時刻をそのまま保持）
  clock_in_actual         timestamptz,
  clock_out_actual        timestamptz,

  -- 丸め後（計算用）
  clock_in_effective      timestamptz,
  clock_out_effective     timestamptz,

  clock_in_source         attendance_source,
  clock_out_source         attendance_source,

  status                  attendance_status not null default 'open', -- open=出勤中, closed=退勤済み
  work_minutes_effective  integer not null default 0, -- 丸め後の労働時間（分）
  has_manual_correction   boolean not null default false,
  note                    text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_attendances_clinic_date on public.attendances (clinic_id, work_date);
create index if not exists idx_attendances_staff_date on public.attendances (staff_id, work_date);

-- 6. ENUM 型の作成（attendance_logs用、既に存在する場合はスキップ）
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'attendance_log_type') then
    create type public.attendance_log_type as enum ('create', 'clock_in', 'clock_out', 'edit');
  end if;
end $$;

-- 7. attendance_logs（修正履歴）
create table if not exists public.attendance_logs (
  id                uuid primary key default gen_random_uuid(),
  attendance_id     uuid not null references public.attendances(id) on delete cascade,
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  staff_id          uuid not null references public.staffs(id) on delete cascade,

  log_type          attendance_log_type not null,

  -- 変更前後（必要に応じて null 可）
  before_clock_in_effective  timestamptz,
  after_clock_in_effective   timestamptz,
  before_clock_out_effective timestamptz,
  after_clock_out_effective  timestamptz,

  triggered_by_admin_user_id uuid, -- auth.users.id（タブレット打刻時は null）
  created_at                 timestamptz not null default now()
);
create index if not exists idx_attendance_logs_attendance_id on public.attendance_logs (attendance_id);

-- 8. updated_at の自動更新トリガー（attendances テーブル用）
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_attendances_updated_at on public.attendances;
create trigger update_attendances_updated_at
  before update on public.attendances
  for each row
  execute function public.update_updated_at_column();

