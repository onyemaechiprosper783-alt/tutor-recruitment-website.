-- Tutor Recruitment Website: isolated tables in the existing Supabase project.
-- Run this in Supabase SQL Editor.

create table if not exists public.tutor_recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  location text not null,
  criteria text[] not null check (criteria <@ array['WAEC','JAMB']::text[] and cardinality(criteria) between 1 and 2),
  subject text not null,
  experience text not null,
  about text not null check (char_length(trim(about)) >= 30),
  teaching_window text not null check (teaching_window in ('7:00 PM — 9:00 PM','9:00 PM — 11:00 PM','7:00 PM — 11:00 PM')),
  status text not null default 'pending' check (status in ('pending','reviewing','accepted','rejected')),
  submitted_at timestamptz not null default now()
);

alter table public.tutor_recruitment_applications enable row level security;

revoke all on public.tutor_recruitment_applications from anon, authenticated;

drop policy if exists "No public direct access" on public.tutor_recruitment_applications;

create or replace function public.submit_tutor_recruitment_application(
  p_full_name text,
  p_email text,
  p_phone text,
  p_location text,
  p_criteria text[],
  p_subject text,
  p_experience text,
  p_about text,
  p_teaching_window text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if p_criteria is null or cardinality(p_criteria) not between 1 and 2 or not (p_criteria <@ array['WAEC','JAMB']::text[]) then
    raise exception 'Invalid teaching criteria';
  end if;

  if p_criteria @> array['WAEC']::text[] and p_criteria @> array['JAMB']::text[] then
    if p_teaching_window <> '7:00 PM — 11:00 PM' then raise exception 'Invalid teaching window'; end if;
  elsif p_criteria @> array['WAEC']::text[] then
    if p_teaching_window <> '7:00 PM — 9:00 PM' then raise exception 'Invalid teaching window'; end if;
  elsif p_criteria @> array['JAMB']::text[] then
    if p_teaching_window <> '9:00 PM — 11:00 PM' then raise exception 'Invalid teaching window'; end if;
  else raise exception 'Invalid teaching criteria';
  end if;

  insert into public.tutor_recruitment_applications
    (full_name,email,phone,location,criteria,subject,experience,about,teaching_window)
  values
    (trim(p_full_name),lower(trim(p_email)),trim(p_phone),trim(p_location),p_criteria,trim(p_subject),trim(p_experience),trim(p_about),p_teaching_window)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_tutor_recruitment_application(text,text,text,text,text[],text,text,text,text) from public, authenticated;
grant execute on function public.submit_tutor_recruitment_application(text,text,text,text,text[],text,text,text,text) to anon;
