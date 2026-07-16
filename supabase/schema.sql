-- Lantern Sky database schema. Run this in the Supabase SQL editor.
-- IMPORTANT: change the admin email below to the one you'll sign in with.

create table if not exists tributes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('honor', 'memory', 'message')),
  display_name text check (char_length(display_name) <= 60),
  show_name boolean not null default true,
  message text not null check (char_length(message) between 1 and 280),
  approved boolean not null default false
);

alter table tributes enable row level security;

-- Anyone may read tributes that have been approved.
create policy "public read approved"
  on tributes for select
  using (approved = true);

-- Anyone may submit a tribute, but only in unapproved state.
create policy "public submit unapproved"
  on tributes for insert
  with check (approved = false);

-- The admin (you) can see, approve, and delete everything.
-- >>> CHANGE THIS EMAIL to the address you'll use on admin.html <<<
create policy "admin full access"
  on tributes for all
  using (auth.jwt() ->> 'email' = 'avimizrahimsit@gmail.com')
  with check (auth.jwt() ->> 'email' = 'avimizrahimsit@gmail.com');
