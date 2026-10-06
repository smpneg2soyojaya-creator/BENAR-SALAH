-- SPENDA GAME CENTER - SETUP SUPABASE (JALANKAN SEKALI)
-- Data Guru dikelola di public.teacher_master.
-- Password Guru dikelola langsung di Supabase Authentication > Users.
-- Aplikasi TIDAK lagi memakai Edge Function untuk membuat password.

alter table if exists public.teacher_assignments
  alter column teacher_user_id drop not null;

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

-- CEK:
select tm.id, tm.full_name, tm.nip, tm.active
from public.teacher_master tm
where tm.school_id='SMPN2SOYOJAYA'
order by tm.full_name;
