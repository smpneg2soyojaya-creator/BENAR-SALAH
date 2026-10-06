-- ============================================================
-- SPENDA GAME CENTER V21
-- LOGIN GURU: dropdown mengambil SEMUA guru aktif dari teacher_master
-- ============================================================
-- Nama guru tetap tampil walaupun email belum diisi.
-- Guru tanpa email tidak dapat login sampai Admin melengkapi emailnya.

alter table if exists public.teacher_master
  add column if not exists email text;

create or replace function public.get_spenda_teacher_login_list(
  p_school_id text default 'SMPN2SOYOJAYA'
)
returns table (
  id bigint,
  full_name text,
  email text
)
language sql
security definer
set search_path = public
as $$
  select
    tm.id,
    tm.full_name,
    tm.email
  from public.teacher_master tm
  where tm.school_id = p_school_id
    and tm.role = 'teacher'
    and tm.active = true
  order by lower(tm.full_name);
$$;

revoke all on function public.get_spenda_teacher_login_list(text) from public;
grant execute on function public.get_spenda_teacher_login_list(text) to anon, authenticated;

-- Cek daftar guru yang akan muncul pada dropdown.
select id, full_name, email, active
from public.teacher_master
where school_id = 'SMPN2SOYOJAYA'
  and role = 'teacher'
  and active = true
order by lower(full_name);
