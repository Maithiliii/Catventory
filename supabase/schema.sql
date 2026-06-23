-- Run this in your Supabase SQL editor to set up Catventory

-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  is_live     boolean default false,
  last_location jsonb,
  created_at  timestamptz default now()
);

-- Cats table
create table if not exists public.cats (
  id            uuid primary key default gen_random_uuid(),
  cat_number    integer not null,  -- sequential per user (#00001)
  spotted_by    uuid not null references public.users(id) on delete cascade,
  name          text not null default 'Cat',
  emoji         text default '🐱',
  photo_url     text,
  lat           double precision,
  lng           double precision,
  location_name text,
  spotted_at    timestamptz default now(),
  created_at    timestamptz default now(),
  unique (spotted_by, cat_number)
);

-- Collections table (for social sharing later)
create table if not exists public.collections (
  user_id uuid references public.users(id) on delete cascade,
  cat_id  uuid references public.cats(id) on delete cascade,
  primary key (user_id, cat_id)
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.cats enable row level security;
alter table public.collections enable row level security;

-- Users: anyone can read, only owner can write
create policy "Users are publicly readable" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Cats: owner full access, others can read (for the shared map)
create policy "Cats are publicly readable" on public.cats for select using (true);
create policy "Owner can insert cats" on public.cats for insert with check (auth.uid() = spotted_by);
create policy "Owner can update cats" on public.cats for update using (auth.uid() = spotted_by);
create policy "Owner can delete cats" on public.cats for delete using (auth.uid() = spotted_by);

-- Storage bucket for cat photos
insert into storage.buckets (id, name, public) values ('cat-photos', 'cat-photos', true)
  on conflict do nothing;

create policy "Anyone can view cat photos" on storage.objects
  for select using (bucket_id = 'cat-photos');

create policy "Authenticated users can upload cat photos" on storage.objects
  for insert with check (bucket_id = 'cat-photos' and auth.role() = 'authenticated');
