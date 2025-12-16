-- Store the user's core resume Markdown for tailoring workflows.
alter table if exists public.profiles
  add column if not exists base_resume text;

comment on column public.profiles.base_resume is 'Persistent Markdown content provided by the user for tailoring resumes.';
