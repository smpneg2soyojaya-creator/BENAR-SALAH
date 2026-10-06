-- SPENDA GAME CENTER FINAL
-- Guru login sederhana berbasis teacher_master.password
-- Password Guru diisi/diedit langsung oleh Admin di Supabase > Table Editor > teacher_master.

alter table if exists public.teacher_master
  add column if not exists password text;

alter table if exists public.question_banks
  add column if not exists teacher_master_id bigint;

create index if not exists idx_question_banks_teacher_master
  on public.question_banks (school_id, teacher_master_id, game, level, class_name, subject, difficulty);

-- Pastikan fungsi login Guru tidak memperlihatkan password.
create or replace function public.get_teacher_login_list()
returns table (
  teacher_id bigint,
  full_name text,
  has_password boolean
)
language sql
security definer
set search_path = public
set row_security = off
as $func$
  select
    tm.id,
    tm.full_name,
    (nullif(btrim(tm.password), '') is not null)
  from public.teacher_master tm
  where tm.school_id = 'SMPN2SOYOJAYA'
    and coalesce(tm.active, true) = true
    and coalesce(lower(tm.role), 'teacher') = 'teacher'
  order by lower(tm.full_name);
$func$;

grant execute on function public.get_teacher_login_list() to anon, authenticated;

-- Verifikasi login Guru.
create or replace function public.verify_teacher_login(
  p_teacher_id bigint,
  p_password text
)
returns table (
  teacher_id bigint,
  school_id text,
  full_name text,
  nip text,
  no_hp text,
  mata_pelajaran text,
  jenjang text,
  role text,
  active boolean
)
language sql
security definer
set search_path = public
set row_security = off
as $func$
  select
    tm.id,
    tm.school_id,
    tm.full_name,
    tm.nip,
    tm.no_hp,
    tm.mata_pelajaran,
    tm.jenjang,
    tm.role,
    tm.active
  from public.teacher_master tm
  where tm.id = p_teacher_id
    and tm.school_id = 'SMPN2SOYOJAYA'
    and coalesce(tm.active, true) = true
    and coalesce(lower(tm.role), 'teacher') = 'teacher'
    and coalesce(tm.password, '') = coalesce(p_password, '')
    and nullif(btrim(coalesce(tm.password, '')), '') is not null
  limit 1;
$func$;

grant execute on function public.verify_teacher_login(bigint, text) to anon, authenticated;

-- Penugasan Guru untuk akun yang sudah terverifikasi.
create or replace function public.get_teacher_assignments_for_login(
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
security definer
set search_path = public
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
  join public.teacher_master tm on tm.id = ta.teacher_master_id
  where ta.school_id = 'SMPN2SOYOJAYA'
    and ta.teacher_master_id = p_teacher_id
    and coalesce(ta.active, true) = true
    and tm.school_id = 'SMPN2SOYOJAYA'
    and coalesce(tm.active, true) = true
    and coalesce(tm.password, '') = coalesce(p_password, '')
    and nullif(btrim(coalesce(tm.password, '')), '') is not null
  order by ta.level, ta.subject, ta.class_name;
$func$;

grant execute on function public.get_teacher_assignments_for_login(bigint, text) to anon, authenticated;

-- Simpan/update bank soal milik Guru yang sudah login.
create or replace function public.teacher_save_bank(
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
returns public.question_banks
language plpgsql
security definer
set search_path = public
set row_security = off
as $func$
declare
  v_teacher public.teacher_master%rowtype;
  v_id uuid;
  v_row public.question_banks%rowtype;
begin
  select * into v_teacher
  from public.teacher_master
  where id = p_teacher_id
    and school_id = 'SMPN2SOYOJAYA'
    and coalesce(active, true) = true
    and coalesce(role, 'teacher') = 'teacher'
    and coalesce(password, '') = coalesce(p_password, '')
    and nullif(btrim(coalesce(password, '')), '') is not null;

  if not found then
    raise exception 'Login Guru tidak valid.' using errcode = '28000';
  end if;

  select qb.id into v_id
  from public.question_banks qb
  where qb.school_id = v_teacher.school_id
    and qb.teacher_master_id = v_teacher.id
    and qb.game = p_game
    and qb.level = p_level
    and qb.class_name = p_class_name
    and qb.subject = p_subject
    and qb.difficulty = p_difficulty
  order by qb.updated_at desc nulls last
  limit 1;

  if v_id is null then
    insert into public.question_banks (
      school_id, game, teacher, teacher_user_id, teacher_master_id,
      level, class_name, subject, difficulty, questions, source
    ) values (
      v_teacher.school_id, p_game, v_teacher.full_name, null, v_teacher.id,
      p_level, p_class_name, p_subject, p_difficulty, coalesce(p_questions, '[]'::jsonb), coalesce(p_source, 'manual')
    ) returning * into v_row;
  else
    update public.question_banks
    set teacher = v_teacher.full_name,
        teacher_master_id = v_teacher.id,
        teacher_user_id = null,
        level = p_level,
        class_name = p_class_name,
        subject = p_subject,
        difficulty = p_difficulty,
        questions = coalesce(p_questions, '[]'::jsonb),
        source = coalesce(p_source, 'manual'),
        updated_at = now()
    where id = v_id
    returning * into v_row;
  end if;

  return v_row;
end;
$func$;

grant execute on function public.teacher_save_bank(bigint, text, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- Daftar bank milik Guru yang sudah login.
create or replace function public.teacher_list_banks(
  p_teacher_id bigint,
  p_password text,
  p_game text default null,
  p_level text default null,
  p_class_name text default null,
  p_subject text default null,
  p_difficulty text default null
)
returns setof public.question_banks
language sql
security definer
set search_path = public
set row_security = off
as $func$
  select qb.*
  from public.question_banks qb
  join public.teacher_master tm on tm.id = qb.teacher_master_id
  where qb.school_id = 'SMPN2SOYOJAYA'
    and qb.teacher_master_id = p_teacher_id
    and tm.school_id = 'SMPN2SOYOJAYA'
    and coalesce(tm.active, true) = true
    and coalesce(tm.password, '') = coalesce(p_password, '')
    and nullif(btrim(coalesce(tm.password, '')), '') is not null
    and (p_game is null or qb.game = p_game)
    and (p_level is null or qb.level = p_level)
    and (p_class_name is null or qb.class_name = p_class_name)
    and (p_subject is null or qb.subject = p_subject)
    and (p_difficulty is null or lower(p_difficulty) = 'semua' or qb.difficulty = p_difficulty)
  order by qb.updated_at desc nulls last;
$func$;

grant execute on function public.teacher_list_banks(bigint, text, text, text, text, text, text) to anon, authenticated;

-- Hapus bank soal milik Guru.
create or replace function public.teacher_delete_bank(
  p_teacher_id bigint,
  p_password text,
  p_game text,
  p_level text,
  p_class_name text,
  p_subject text,
  p_difficulty text
)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $func$
begin
  if not exists (
    select 1 from public.teacher_master tm
    where tm.id = p_teacher_id
      and tm.school_id = 'SMPN2SOYOJAYA'
      and coalesce(tm.active, true) = true
      and coalesce(tm.password, '') = coalesce(p_password, '')
      and nullif(btrim(coalesce(tm.password, '')), '') is not null
  ) then
    raise exception 'Login Guru tidak valid.' using errcode = '28000';
  end if;

  delete from public.question_banks qb
  where qb.school_id = 'SMPN2SOYOJAYA'
    and qb.teacher_master_id = p_teacher_id
    and qb.game = p_game
    and qb.level = p_level
    and qb.class_name = p_class_name
    and qb.subject = p_subject
    and qb.difficulty = p_difficulty;

  return true;
end;
$func$;

grant execute on function public.teacher_delete_bank(bigint, text, text, text, text, text, text) to anon, authenticated;

-- Penugasan dapat dikelola Admin berdasarkan teacher_master_id.
-- teacher_user_id tidak lagi wajib untuk membuat penugasan.
