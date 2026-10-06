-- ============================================================================
-- SPENDA GAME CENTER V17 — SUPABASE
-- Database bank soal sekolah + Supabase Auth + RLS Guru
-- SMP NEGERI 2 SOYO JAYA
-- ============================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- BANK SOAL
-- --------------------------------------------------------------------------
create table if not exists public.question_banks (
    id uuid primary key default gen_random_uuid(),
    school_id text not null default 'SMPN2SOYOJAYA',
    game text not null,
    teacher text not null,
    teacher_user_id uuid references auth.users(id) on delete set null,
    level text not null,
    class_name text not null,
    subject text not null,
    difficulty text not null default 'Semua',
    questions jsonb not null default '[]'::jsonb,
    source text not null default 'import',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint question_banks_questions_array
      check (jsonb_typeof(questions) = 'array'),
    constraint question_banks_game_check
      check (game in ('benar-salah','gesture-battle','family-100','clash-of-champions')),
    constraint question_banks_difficulty_check
      check (difficulty in ('Mudah','Sedang','Sulit','Semua'))
);

-- --------------------------------------------------------------------------
-- PROFIL GURU
-- Akun dibuat dari Supabase Dashboard > Authentication > Users.
-- Trigger di bawah otomatis membuat profil saat user baru dibuat.
-- --------------------------------------------------------------------------
create table if not exists public.teacher_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    school_id text not null default 'SMPN2SOYOJAYA',
    full_name text not null,
    role text not null default 'teacher',
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint teacher_profiles_role_check check (role in ('teacher','admin'))
);

-- --------------------------------------------------------------------------
-- BACKFILL: hubungkan bank lama ke akun guru yang namanya sama, jika ada.
-- Jalankan setelah user Guru dibuat. Baris lama yang tidak punya pasangan tetap
-- memiliki teacher_user_id NULL dan masih dapat dibaca oleh Game Center.
-- --------------------------------------------------------------------------
update public.question_banks q
set teacher_user_id = p.user_id
from public.teacher_profiles p
where q.teacher_user_id is null
  and lower(trim(q.teacher)) = lower(trim(p.full_name))
  and q.school_id = p.school_id;

-- --------------------------------------------------------------------------
-- INDEX / UNIQUE
-- --------------------------------------------------------------------------
drop index if exists public.ux_question_banks_identity;

create unique index if not exists ux_question_banks_identity_v17
on public.question_banks
(school_id, game, teacher_user_id, level, class_name, subject, difficulty);

create index if not exists idx_question_banks_lookup_v17
on public.question_banks
(school_id, game, teacher_user_id, level, class_name, subject, difficulty);

create index if not exists idx_question_banks_teacher_user_v17
on public.question_banks(teacher_user_id);

create index if not exists idx_question_banks_game_teacher_v17
on public.question_banks(school_id, game, teacher);

create index if not exists idx_question_banks_updated_v17
on public.question_banks(updated_at desc);

create index if not exists idx_teacher_profiles_school_role
on public.teacher_profiles(school_id, role, active);

-- --------------------------------------------------------------------------
-- UPDATED_AT
-- --------------------------------------------------------------------------
create or replace function public.set_spenda_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_question_banks_updated_at on public.question_banks;
create trigger trg_question_banks_updated_at
before update on public.question_banks
for each row execute function public.set_spenda_updated_at();

drop trigger if exists trg_teacher_profiles_updated_at on public.teacher_profiles;
create trigger trg_teacher_profiles_updated_at
before update on public.teacher_profiles
for each row execute function public.set_spenda_updated_at();

-- --------------------------------------------------------------------------
-- AUTO-CREATE PROFILE AFTER SUPABASE AUTH USER CREATION
-- full_name diambil dari user_metadata.full_name; jika tidak ada, gunakan
-- bagian sebelum @ dari email. Admin tetap dapat mengubahnya di SQL.
-- --------------------------------------------------------------------------
create or replace function public.handle_new_spenda_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')), '');
  if v_name is null then
    v_name := split_part(coalesce(new.email,''), '@', 1);
  end if;

  insert into public.teacher_profiles(user_id, school_id, full_name)
  values(new.id, 'SMPN2SOYOJAYA', coalesce(v_name,'Guru'))
  on conflict(user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_spenda on auth.users;
create trigger on_auth_user_created_spenda
after insert on auth.users
for each row execute function public.handle_new_spenda_user();

-- --------------------------------------------------------------------------
-- ADMIN HELPER FOR RLS
-- SECURITY DEFINER agar pengecekan admin tidak terkena RLS recursive policy.
-- --------------------------------------------------------------------------
create or replace function public.is_spenda_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.teacher_profiles p
    where p.user_id = (select auth.uid())
      and p.school_id = 'SMPN2SOYOJAYA'
      and p.role = 'admin'
      and p.active = true
  );
$$;

-- --------------------------------------------------------------------------
-- RLS TEACHER PROFILES
-- --------------------------------------------------------------------------
alter table public.teacher_profiles enable row level security;

revoke all on table public.teacher_profiles from anon;
revoke all on table public.teacher_profiles from authenticated;
grant select on public.teacher_profiles to authenticated;

drop policy if exists teacher_profiles_select_self_or_admin on public.teacher_profiles;
create policy teacher_profiles_select_self_or_admin
on public.teacher_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.is_spenda_admin()
);

-- --------------------------------------------------------------------------
-- RLS QUESTION BANKS
-- GAME CENTER / PID / IFP: READ ONLY dari anon/authenticated.
-- GURU: INSERT/UPDATE/DELETE hanya bank milik user yang login.
-- ADMIN: dapat mengelola seluruh bank sekolah.
-- --------------------------------------------------------------------------
alter table public.question_banks enable row level security;

revoke all on table public.question_banks from anon;
revoke all on table public.question_banks from authenticated;
grant select on public.question_banks to anon, authenticated;
grant insert, update, delete on public.question_banks to authenticated;

drop policy if exists question_banks_select_school on public.question_banks;
create policy question_banks_select_school
on public.question_banks
for select
to anon, authenticated
using (school_id = 'SMPN2SOYOJAYA');

drop policy if exists question_banks_insert_teacher on public.question_banks;
create policy question_banks_insert_teacher
on public.question_banks
for insert
to authenticated
with check (
  school_id = 'SMPN2SOYOJAYA'
  and (
    public.is_spenda_admin()
    or (
      teacher_user_id = (select auth.uid())
      and exists (
        select 1 from public.teacher_profiles p
        where p.user_id = (select auth.uid())
          and p.school_id = 'SMPN2SOYOJAYA'
          and p.active = true
          and p.role = 'teacher'
          and lower(trim(p.full_name)) = lower(trim(teacher))
      )
    )
  )
);

drop policy if exists question_banks_update_teacher on public.question_banks;
create policy question_banks_update_teacher
on public.question_banks
for update
to authenticated
using (
  school_id = 'SMPN2SOYOJAYA'
  and (teacher_user_id = (select auth.uid()) or public.is_spenda_admin())
)
with check (
  school_id = 'SMPN2SOYOJAYA'
  and (
    public.is_spenda_admin()
    or (
      teacher_user_id = (select auth.uid())
      and exists (
        select 1 from public.teacher_profiles p
        where p.user_id = (select auth.uid())
          and p.school_id = 'SMPN2SOYOJAYA'
          and p.active = true
          and lower(trim(p.full_name)) = lower(trim(teacher))
      )
    )
  )
);

drop policy if exists question_banks_delete_teacher on public.question_banks;
create policy question_banks_delete_teacher
on public.question_banks
for delete
to authenticated
using (
  school_id = 'SMPN2SOYOJAYA'
  and (teacher_user_id = (select auth.uid()) or public.is_spenda_admin())
);

-- --------------------------------------------------------------------------
-- SAFE VIEWS
-- --------------------------------------------------------------------------
drop view if exists public.question_bank_teachers;
create view public.question_bank_teachers
with (security_invoker = true)
as
select
  school_id,
  game,
  teacher,
  teacher_user_id,
  count(*) as jumlah_bank
from public.question_banks
where jsonb_array_length(questions) > 0
group by school_id, game, teacher, teacher_user_id;

drop view if exists public.question_bank_summary;
create view public.question_bank_summary
with (security_invoker = true)
as
select
  id,
  school_id,
  game,
  teacher,
  teacher_user_id,
  level,
  class_name,
  subject,
  difficulty,
  jsonb_array_length(questions) as jumlah_soal,
  source,
  created_at,
  updated_at
from public.question_banks;

grant select on public.question_bank_teachers to anon, authenticated;
grant select on public.question_bank_summary to anon, authenticated;
revoke execute on function public.is_spenda_admin() from anon, public;
grant execute on function public.is_spenda_admin() to authenticated;
revoke execute on function public.handle_new_spenda_user() from anon, authenticated, public;

-- --------------------------------------------------------------------------
-- CATATAN ADMIN
-- --------------------------------------------------------------------------
-- 1. Jalankan SQL ini sekali.
-- 2. Supabase Dashboard > Authentication > Users > Add user.
-- 3. Buat akun email/password untuk setiap guru. Jangan aktifkan sign-up umum
--    dari aplikasi web jika tidak diperlukan.
-- 4. Setelah user dibuat, trigger otomatis membuat teacher_profiles.
-- 5. Atur nama guru jika diperlukan:
--    update public.teacher_profiles
--    set full_name='Nama Lengkap Guru'
--    where user_id=(select id from auth.users where email='guru@email.sch.id');
-- 6. Untuk akun admin:
--    update public.teacher_profiles set role='admin'
--    where user_id=(select id from auth.users where email='admin@email.sch.id');
--
-- Game Center menggunakan anon SELECT saja. Halaman Database Soal Guru
-- memerlukan login authenticated untuk INSERT/UPDATE/DELETE.
-- ============================================================================
