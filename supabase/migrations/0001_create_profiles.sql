-- Profiles table stores TuneIt user profile data linked to Supabase Auth users.
create table if not exists public.profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  display_name varchar(255) generated always as (btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) stored,
  headline text,
  bio text,
  linkedin_url varchar(100),
  github_url varchar(100),
  website_url varchar(100),
  base_resume text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_user_id_key on public.profiles(user_id);

create or replace function public.update_modified_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists update_profiles_modtime on public.profiles;
create trigger update_profiles_modtime
before update on public.profiles
for each row
execute procedure public.update_modified_column();

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owners" on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "Profiles are insertable by owners" on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Profiles are updatable by owners" on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Profiles are deletable by owners" on public.profiles
  for delete
  using (auth.uid() = user_id);
