-- ============================================================
-- SPENDA GAME CENTER V38
-- LOGIN GURU MENGGUNAKAN password DI teacher_master
-- ============================================================
--
-- Konsep final:
-- 1. Data Guru dikelola langsung di public.teacher_master.
-- 2. Kolom password berada di public.teacher_master.
-- 3. Guru login dengan pilihan Nama Guru + Password.
-- 4. NIP/NIPPPK hanya identitas internal dan tidak ditampilkan
--    di dropdown.
-- 5. Admin tetap login menggunakan Supabase Auth.
-- 6. Satu Guru dapat mempunyai banyak penugasan di
--    public.teacher_assignments.
-- 7. Tidak menggunakan Edge Function untuk password Guru.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kolom password
-- ------------------------------------------------------------
alter table if exists public.teacher_master
  add column if not exists password text;

-- ------------------------------------------------------------
-- 2. Lindungi teacher_master dari akses publik langsung.
--    Password tidak pernah dikirim melalui select publik.
-- ------------------------------------------------------------
alter table if exists public.teacher_master enable row level security;
revoke all on public.teacher_master from anon;

-- ------------------------------------------------------------
-- 3. Dropdown Login Guru
--    Yang ditampilkan aplikasi hanya full_name.
--    teacher_id dan nip dipakai internal.
-- ------------------------------------------------------------
create or replace function public.get_teacher_login_list()
returns table (
  teacher_id bigint,
  full_name text,
  nip text
)
language sql
stable
security definer
set search_path = public, pg_catalog
set row_security = off
as $func$
  select
    tm.id,
    tm.full_name,
    tm.nip
  from public.teacher_master tm
  where tm.school_id = 'SMPN2SOYOJAYA'
    and coalesce(tm.active, true) = true
    and lower(coalesce(tm.role, 'teacher')) = 'teacher'
  order by lower(tm.full_name);
$func$;

revoke all on function public.get_teacher_login_list() from public;
grant execute on function public.get_teacher_login_list() to anon, authenticated;

-- ------------------------------------------------------------
-- 4. Verifikasi Login Guru
--    Password tidak dikembalikan.
-- ------------------------------------------------------------
create or replace function public.verify_teacher_login(
  p_teacher_id bigint,
  p_password text
)
returns table (
  teacher_id bigint,
  full_name text,
  nip text,
  school_id text,
  mata_pelajaran text,
  jenjang text,
  role text,
  active boolean
)
language sql
stable
security definer
set search_path = public, pg_catalog
set row_security = off
as $func$
  select
    tm.id,
    tm.full_name,
    tm.nip,
    tm.school_id,
    tm.mata_pelajaran,
    tm.jenjang,
    tm.role,
    tm.active
  from public.teacher_master tm
  where tm.id = p_teacher_id
    and tm.school_id = 'SMPN2SOYOJAYA'
    and coalesce(tm.active, true) = true
    and lower(coalesce(tm.role, 'teacher')) = 'teacher'
    and nullif(btrim(coalesce(tm.password, '')), '') is not null
    and tm.password = p_password
  limit 1;
$func$;

revoke all on function public.verify_teacher_login(bigint, text) from public;
grant execute on function public.verify_teacher_login(bigint, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 5. Ambil Penugasan Guru saat login
--    Verifikasi ulang password supaya tidak bisa digunakan
--    oleh pengguna yang hanya mengetahui teacher_id.
-- ------------------------------------------------------------
create or replace function public.get_teacher_assignments_login(
  p_teacher_id bigint,
  p_password text
)
returns table (
  id bigint,
  teacher_master_id bigint,
  teacher_nip text,
  subject text,
  level text,
  class_name text,
  active boolean
)
language sql
stable
security definer
set search_path = public, pg_catalog
set row_security = off
as $func$
  select
    ta.id,
    ta.teacher_master_id,
    ta.teacher_nip,
    ta.subject,
    ta.level,
    ta.class_name,
    ta.active
  from public.teacher_assignments ta
  join public.teacher_master tm
    on tm.id = ta.teacher_master_id
  where tm.id = p_teacher_id
    and tm.school_id = 'SMPN2SOYOJAYA'
    and tm.active = true
    and lower(coalesce(tm.role, 'teacher')) = 'teacher'
    and tm.password = p_password
    and ta.school_id = 'SMPN2SOYOJAYA'
    and ta.active = true
  order by ta.level, ta.subject, ta.class_name;
$func$;

revoke all on function public.get_teacher_assignments_login(bigint, text) from public;
grant execute on function public.get_teacher_assignments_login(bigint, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 6. Simpan Bank Soal dari Guru login DB
-- ------------------------------------------------------------
create or replace function public.save_question_bank_for_teacher(
  p_teacher_id bigint,
  p_password text,
  p_game text,
  p_level text,
  p_class_name text,
  p_subject text,
  p_difficulty text,
  p_questions jsonb,
  p_source text default 'manual'
)
returns setof public.question_banks
language plpgsql
security definer
set search_path = public, pg_catalog
set row_security = off
as $func$
declare
  v_teacher record;
  v_bank_id uuid;
begin
  select
    tm.id,
    tm.full_name,
    tm.nip,
    tm.school_id,
    tm.user_id
  into v_teacher
  from public.teacher_master tm
  where tm.id = p_teacher_id
    and tm.school_id = 'SMPN2SOYOJAYA'
    and tm.active = true
    and lower(coalesce(tm.role, 'teacher')) = 'teacher'
    and tm.password = p_password
  limit 1;

  if not found then
    raise exception 'Nama Guru atau password salah.';
  end if;

  select qb.id
  into v_bank_id
  from public.question_banks qb
  where qb.school_id = v_teacher.school_id
    and qb.game = p_game
    and qb.teacher = v_teacher.full_name
    and qb.level = p_level
    and qb.class_name = p_class_name
    and qb.subject = p_subject
    and qb.difficulty = coalesce(nullif(p_difficulty, ''), 'Semua')
  order by qb.updated_at desc
  limit 1;

  if v_bank_id is null then
    insert into public.question_banks (
      school_id,
      game,
      teacher,
      teacher_user_id,
      level,
      class_name,
      subject,
      difficulty,
      questions,
      source,
      created_at,
      updated_at
    ) values (
      v_teacher.school_id,
      p_game,
      v_teacher.full_name,
      v_teacher.user_id,
      p_level,
      p_class_name,
      p_subject,
      coalesce(nullif(p_difficulty, ''), 'Semua'),
      coalesce(p_questions, '[]'::jsonb),
      coalesce(nullif(p_source, ''), 'manual'),
      now(),
      now()
    )
    returning id into v_bank_id;
  else
    update public.question_banks
    set
      teacher_user_id = v_teacher.user_id,
      questions = coalesce(p_questions, '[]'::jsonb),
      source = coalesce(nullif(p_source, ''), 'manual'),
      updated_at = now()
    where id = v_bank_id;
  end if;

  return query
  select qb.*
  from public.question_banks qb
  where qb.id = v_bank_id;
end;
$func$;

grant execute on function public.save_question_bank_for_teacher(bigint, text, text, text, text, text, text, jsonb, text)
to anon, authenticated;

-- ------------------------------------------------------------
-- 7. Hapus Bank Soal dari Guru login DB
-- ------------------------------------------------------------
create or replace function public.delete_question_bank_for_teacher(
  p_teacher_id bigint,
  p_password text,
  p_game text,
  p_level text,
  p_class_name text,
  p_subject text,
  p_difficulty text
)
returns integer
language sql
security definer
set search_path = public, pg_catalog
set row_security = off
as $func$
  with teacher_ok as (
    select tm.id, tm.full_name, tm.school_id
    from public.teacher_master tm
    where tm.id = p_teacher_id
      and tm.school_id = 'SMPN2SOYOJAYA'
      and tm.active = true
      and lower(coalesce(tm.role, 'teacher')) = 'teacher'
      and tm.password = p_password
    limit 1
  ), deleted as (
    delete from public.question_banks qb
    using teacher_ok t
    where qb.school_id = t.school_id
      and qb.teacher = t.full_name
      and qb.game = p_game
      and qb.level = p_level
      and qb.class_name = p_class_name
      and qb.subject = p_subject
      and qb.difficulty = coalesce(nullif(p_difficulty, ''), 'Semua')
    returning qb.id
  )
  select count(*)::integer from deleted;
$func$;

grant execute on function public.delete_question_bank_for_teacher(bigint, text, text, text, text, text, text)
to anon, authenticated;

-- ------------------------------------------------------------
-- 8. Cek hasil struktur
-- ------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'teacher_master'
order by ordinal_position;

select *
from public.get_teacher_login_list();

-- ============================================================
-- SELESAI
-- ============================================================
