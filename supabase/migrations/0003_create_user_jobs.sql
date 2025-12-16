-- Store saved job descriptions and tailored resume artifacts per user.
create table if not exists public.user_jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name varchar(100) not null,
  job_title varchar(100) not null,
  salary_min numeric,
  salary_max numeric,
  hourly_rate numeric,
  salary_currency varchar(8),
  salary_period varchar(16),
  salary_range varchar(64),
  location varchar(255),
  location_type text check (location_type in ('hybrid', 'remote', 'onsite')),
  job_description text,
  tailored_resume_path varchar(100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint salary_range_valid check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  )
);

create index if not exists user_jobs_user_id_idx on public.user_jobs(user_id);

-- Keep updated_at synchronized.
drop trigger if exists update_user_jobs_modtime on public.user_jobs;
create trigger update_user_jobs_modtime
  before update on public.user_jobs
  for each row
  execute procedure public.update_modified_column();

alter table public.user_jobs enable row level security;

create policy "User jobs are viewable by owners" on public.user_jobs
  for select
  using (auth.uid() = user_id);

create policy "User jobs are insertable by owners" on public.user_jobs
  for insert
  with check (auth.uid() = user_id);

create policy "User jobs are updatable by owners" on public.user_jobs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "User jobs are deletable by owners" on public.user_jobs
  for delete
  using (auth.uid() = user_id);
