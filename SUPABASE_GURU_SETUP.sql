-- SPENDA GAME CENTER — SETUP GURU (JALANKAN SEKALI)
-- Data Guru: public.teacher_master
-- Password akun: Supabase Authentication > Users
-- Penugasan: public.teacher_assignments (satu Guru boleh banyak Mapel/Kelas)

-- 1. Pastikan kolom penugasan tersedia.
alter table if exists public.teacher_assignments
  add column if not exists school_id text default 'SMPN2SOYOJAYA';
alter table if exists public.teacher_assignments
  add column if not exists teacher_master_id bigint;
alter table if exists public.teacher_assignments
  add column if not exists teacher_user_id uuid;
alter table if exists public.teacher_assignments
  add column if not exists teacher_nip text;
alter table if exists public.teacher_assignments
  add column if not exists subject text;
alter table if exists public.teacher_assignments
  add column if not exists level text default 'SMP';
alter table if exists public.teacher_assignments
  add column if not exists class_name text;
alter table if exists public.teacher_assignments
  add column if not exists active boolean default true;

alter table if exists public.teacher_assignments
  alter column teacher_user_id drop not null;

-- 2. Dropdown Login Guru: hanya mengirim Nama + NIP internal.
create or replace function public.get_teacher_login_list()
returns table (
  teacher_id bigint,
  full_name text,
  nip text
)
language sql
security definer
set search_path = public, pg_catalog
set row_security = off
as $func$
  select tm.id, tm.full_name, tm.nip
  from public.teacher_master tm
  where tm.school_id = 'SMPN2SOYOJAYA'
    and coalesce(tm.active,true) = true
    and lower(coalesce(tm.role,'teacher')) = 'teacher'
    and nullif(trim(tm.nip),'') is not null
  order by lower(tm.full_name);
$func$;

revoke all on function public.get_teacher_login_list() from public;
grant execute on function public.get_teacher_login_list() to anon, authenticated;

-- 3. Penugasan Guru berdasarkan NIP.
create or replace function public.get_teacher_assignments(p_nip text)
returns table (
  subject text,
  level text,
  class_name text
)
language sql
security definer
set search_path = public, pg_catalog
set row_security = off
as $func$
  select ta.subject, ta.level, ta.class_name
  from public.teacher_assignments ta
  where ta.school_id = 'SMPN2SOYOJAYA'
    and ta.teacher_nip = p_nip
    and coalesce(ta.active,true) = true
  order by ta.level, ta.subject, ta.class_name;
$func$;

revoke all on function public.get_teacher_assignments(text) from public;
grant execute on function public.get_teacher_assignments(text) to authenticated;

-- 4. Index agar pencarian penugasan cepat.
create index if not exists idx_teacher_assignments_school_nip
on public.teacher_assignments(school_id, teacher_nip, active);

create index if not exists idx_teacher_assignments_master
on public.teacher_assignments(teacher_master_id, active);

-- CATATAN: Password TIDAK dibuat/disimpan di teacher_master.
-- Buat akun login Guru di Supabase Authentication > Users.
-- Gunakan email teknis berbasis NIP: [NIP tanpa spasi/tanda]@login.spenda.local
-- Contoh: 198504162019031004@login.spenda.local
-- Aplikasi hanya menampilkan nama Guru pada dropdown.
-- Contoh satu Guru memegang dua Mapel:
-- INSERT INTO public.teacher_assignments
-- (school_id, teacher_master_id, teacher_nip, subject, level, class_name, active)
-- VALUES
-- ('SMPN2SOYOJAYA', 9, '199902022024212008', 'IPA', 'SMP', 'VII', true),
-- ('SMPN2SOYOJAYA', 9, '199902022024212008', 'Matematika', 'SMP', 'VIII', true);
