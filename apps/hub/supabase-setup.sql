-- ============================================================
-- NexusHub — Supabase Database Setup
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. TABLA DE PERFILES
-- Extiende auth.users con datos adicionales del usuario
create table if not exists public.profiles (
  id               uuid references auth.users(id) on delete cascade primary key,
  email            text,
  full_name        text,
  avatar_url       text,
  plan_market      text not null default 'free' check (plan_market in ('free','pro','elite')),
  plan_bets        text not null default 'free' check (plan_bets in ('free','pro','elite')),
  telegram_linked  boolean not null default false,
  telegram_username text,
  -- Verificación de edad +18 (requerido por ley para acceso a contenido de apuestas)
  date_of_birth    date,
  age_verified     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Migración para bases de datos existentes (ejecutar si la tabla ya existe)
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists age_verified boolean not null default false;

-- 2. ROW LEVEL SECURITY — cada usuario solo ve sus propios datos
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 3. TRIGGER — crea perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, date_of_birth, age_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'date_of_birth')::date,
    coalesce((new.raw_user_meta_data->>'age_verified')::boolean, false)
  );
  return new;
end;
$$;

-- Elimina el trigger si ya existe y lo recrea
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. FUNCIÓN updated_at automático
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- ✅ Listo. Ahora configura en Authentication → URL Configuration:
--    Site URL:        http://localhost:4000
--    Redirect URLs:   http://localhost:4000/auth/callback
-- ============================================================
