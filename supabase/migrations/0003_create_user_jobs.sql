-- Store saved job descriptions and tailored resume artifacts per user.
create table if not exists public.user_jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name varchar(100) not null,
  job_title varchar(100) not null,
  salary_min numeric,
  salary_max numeric,
  hourly_rate numeric,
  salary_currency varchar(3),
  salary_period varchar(16),
  salary_range varchar(64),
  location varchar(255),
  location_type text check (location_type in ('hybrid', 'remote', 'onsite')),
  job_description text,
  tailored_resume text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint salary_range_valid check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  )
);

-- Index to optimize queries filtering by user_id.
create index if not exists user_jobs_user_id_idx on public.user_jobs(user_id);

-- Index to optimize queries fetching recent jobs for a user.
create index if not exists user_jobs_user_id_created_at_idx on public.user_jobs(user_id, created_at);

-- Trigram index to optimize searches within job descriptions.
create extension if not exists pg_trgm;
create index idx_job_desc_trgm ON public.user_jobs USING gin (job_description gin_trgm_ops);


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
