-- ============================================================
-- SPENDA GAME CENTER V20
-- LOGIN GURU: DROPDOWN DARI public.teacher_master
-- ============================================================

-- Fungsi ini hanya mengembalikan guru aktif yang memiliki email.
-- Password tidak pernah dikirim atau disimpan di sini.
-- Login tetap dilakukan melalui Supabase Auth.

-- Pastikan kolom email tersedia sebelum fungsi dibuat.
alter table if exists public.teacher_master
  add column if not exists email text;

create or replace function public.get_spenda_teacher_login_list(p_school_id text default 'SMPN2SOYOJAYA')
returns table (
  id bigint,
  full_name text,
  email text
)
language sql
security definer
set search_path = public
as $$
  select tm.id, tm.full_name, tm.email
  from public.teacher_master tm
  where tm.school_id = p_school_id
    and tm.role = 'teacher'
    and tm.active = true
    and nullif(trim(tm.email), '') is not null
  order by lower(tm.full_name);
$$;

revoke all on function public.get_spenda_teacher_login_list(text) from public;
grant execute on function public.get_spenda_teacher_login_list(text) to anon, authenticated;


-- Opsional: lihat guru yang belum memiliki email login.
select id, full_name, nip
from public.teacher_master
where school_id = 'SMPN2SOYOJAYA'
  and role = 'teacher'
  and active = true
  and nullif(trim(email), '') is null
order by id;
