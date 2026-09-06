-- Money-zen — Schéma Supabase (à exécuter dans Supabase SQL Editor)
-- ============================================================================
--
-- INSTRUCTIONS :
--   1. Ouvre https://supabase.com → Dashboard → ton projet money-zen
--   2. Clique "SQL Editor" dans le sidebar
--   3. Copie-colle ce fichier → "Run"
--   4. Toutes les tables + RLS policies sont créées en une fois
--
-- Stratégie :
--   - Chaque table a user_id (FK auth.users.id)
--   - Row Level Security (RLS) activé : users ne voient que leurs propres rows
--   - Index optimisés pour sync delta (updated_at)
--   - Trigger pour auto-set updated_at
-- ============================================================================

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Profiles (1:1 avec auth.users) ───────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  base_currency text not null default 'XAF',
  language text not null default 'fr' check (language in ('fr', 'en')),
  theme_preference text not null default 'system' check (theme_preference in ('light', 'dark', 'system')),
  demo_mode boolean not null default false,
  is_onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Helper : trigger updated_at ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── Accounts ──────────────────────────────────────────────────────────────
create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cloud_id uuid,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'card', 'mobile_money', 'savings', 'crypto', 'wallet', 'other')),
  currency text not null,
  initial_balance_minor integer not null default 0,
  current_balance_minor integer not null default 0,
  icon text not null default '💵',
  color text not null default '#C97048',
  mobile_money_provider text,
  masked_number text,
  notes text,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  sync_status text not null default 'synced' check (sync_status in ('pending', 'synced', 'failed', 'conflict')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_accounts_user ON public.accounts (user_id);
create index if not exists idx_accounts_updated ON public.accounts (user_id, updated_at);
create trigger trg_accounts_updated before update on public.accounts
  for each row execute function public.set_updated_at();

-- ─── Categories ─────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cloud_id uuid,
  name text not null,
  type text not null check (type in ('expense', 'income', 'transfer', 'savings')),
  icon text not null default '📦',
  color text not null default '#9B9489',
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  is_system boolean not null default false,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_categories_user ON public.categories (user_id);
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- ─── Transactions ──────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cloud_id uuid,
  type text not null check (type in ('expense', 'income', 'transfer')),
  account_id uuid references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount_minor integer not null check (amount_minor > 0),
  currency_code text not null,
  converted_amount_minor integer not null default 0,
  base_currency_code text not null,
  exchange_rate numeric not null default 1.0,
  exchange_rate_date timestamptz,
  date timestamptz not null,
  description text not null default '',
  notes text,
  merchant text,
  receipt_id uuid,
  is_recurring boolean not null default false,
  recurring_transaction_id uuid,
  transfer_pair_id uuid,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_transactions_user ON public.transactions (user_id);
create index if not exists idx_transactions_user_date ON public.transactions (user_id, date desc);
create index if not exists idx_transactions_updated ON public.transactions (user_id, updated_at);
create trigger trg_transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();

-- ─── Transaction Transfers ─────────────────────────────────────────────────
create table if not exists public.transaction_transfers (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_account_id uuid references public.accounts(id),
  destination_account_id uuid references public.accounts(id),
  source_amount_minor integer not null check (source_amount_minor > 0),
  source_currency text not null,
  destination_amount_minor integer not null check (destination_amount_minor > 0),
  destination_currency text not null,
  exchange_rate numeric not null default 1.0,
  exchange_rate_date timestamptz,
  fee_transaction_id uuid,
  created_at timestamptz not null default now(),
  check (source_account_id != destination_account_id)
);

-- ─── Budgets ──────────────────────────────────────────────────────────────
create table if not exists public.budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cloud_id uuid,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  currency_code text not null,
  amount_minor integer not null check (amount_minor > 0),
  period text not null default 'monthly',
  start_date timestamptz not null,
  end_date timestamptz not null,
  warning_threshold integer not null default 75,
  alert_threshold integer not null default 90,
  over_threshold integer not null default 100,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_budgets_updated before update on public.budgets
  for each row execute function public.set_updated_at();

-- ─── Goals ────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cloud_id uuid,
  name text not null,
  icon text not null default '🎯',
  color text not null default '#C97048',
  target_amount_minor integer not null check (target_amount_minor > 0),
  current_amount_minor integer not null default 0,
  currency_code text not null,
  target_date timestamptz,
  linked_account_id uuid references public.accounts(id) on delete set null,
  is_achieved boolean not null default false,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_goals_updated before update on public.goals
  for each row execute function public.set_updated_at();

-- ─── Recurring Transactions ────────────────────────────────────────────────
create table if not exists public.recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cloud_id uuid,
  type text not null check (type in ('expense', 'income', 'transfer')),
  account_id uuid references public.accounts(id),
  category_id uuid references public.categories(id),
  amount_minor integer not null check (amount_minor > 0),
  currency_code text not null,
  description text not null default '',
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date timestamptz not null,
  end_date timestamptz,
  day_of_month integer,
  occurrences_generated integer not null default 0,
  next_occurrence timestamptz,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Exchange Rates (shared, not per-user) ────────────────────────────────
create table if not exists public.exchange_rates (
  id uuid primary key default uuid_generate_v4(),
  from_currency text not null,
  to_currency text not null,
  rate numeric not null check (rate > 0),
  source text not null default 'api',
  rate_date timestamptz not null,
  fetched_at timestamptz not null default now(),
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_currency, to_currency, rate_date)
);
create index if not exists idx_exchange_rates_pair ON public.exchange_rates (from_currency, to_currency);

-- ─── Receipts (metadata only — image dans Storage) ──────────────────────
create table if not exists public.receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  cloud_url text,
  cloud_bucket_path text,
  cloud_synced_at timestamptz,
  storage_mode text not null default 'local' check (storage_mode in ('local', 'cloud', 'hybrid')),
  original_file_name text,
  mime_type text not null,
  size_bytes integer not null,
  ocr_processed boolean not null default false,
  ocr_data jsonb,
  deleted_at timestamptz,
  sync_status text not null default 'synced',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_receipts_user ON public.receipts (user_id);

-- ─── OCR Usage (anti-abus, 10 scans/user/mois) ────────────────────────────
create table if not exists public.ocr_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  key_index integer not null,
  used_at timestamptz not null default now(),
  month_bucket text not null,
  success boolean not null default true,
  error_code text,
  file_size_bytes integer,
  receipt_id uuid
);
create index if not exists idx_ocr_usage_user_month ON public.ocr_usage (user_id, month_bucket);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — users ne voient que leurs propres données
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_transfers enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.receipts enable row level security;
alter table public.ocr_usage enable row level security;

-- Policies : SELECT, INSERT, UPDATE, DELETE uniquement si user_id = auth.uid()
create policy "users_select_own_profiles" on public.profiles for select using (auth.uid() = id);
create policy "users_insert_own_profiles" on public.profiles for insert with check (auth.uid() = id);
create policy "users_update_own_profiles" on public.profiles for update using (auth.uid() = id);

-- Helper macro pour les autres tables
create or replace function public.user_owns() returns void as $$
begin
  -- Placeholder — chaque policy est définie explicitement ci-dessous.
end;
$$ language plpgsql;

-- Accounts policies
create policy "users_select_own_accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "users_insert_own_accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "users_update_own_accounts" on public.accounts for update using (auth.uid() = user_id);
create policy "users_delete_own_accounts" on public.accounts for delete using (auth.uid() = user_id);

-- Categories policies
create policy "users_select_own_categories" on public.categories for select using (auth.uid() = user_id);
create policy "users_insert_own_categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "users_update_own_categories" on public.categories for update using (auth.uid() = user_id);
create policy "users_delete_own_categories" on public.categories for delete using (auth.uid() = user_id);

-- Transactions policies
create policy "users_select_own_transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "users_insert_own_transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "users_update_own_transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "users_delete_own_transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Transaction transfers policies
create policy "users_select_own_transfers" on public.transaction_transfers for select using (auth.uid() = user_id);
create policy "users_insert_own_transfers" on public.transaction_transfers for insert with check (auth.uid() = user_id);
create policy "users_update_own_transfers" on public.transaction_transfers for update using (auth.uid() = user_id);
create policy "users_delete_own_transfers" on public.transaction_transfers for delete using (auth.uid() = user_id);

-- Budgets policies
create policy "users_select_own_budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "users_insert_own_budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "users_update_own_budgets" on public.budgets for update using (auth.uid() = user_id);
create policy "users_delete_own_budgets" on public.budgets for delete using (auth.uid() = user_id);

-- Goals policies
create policy "users_select_own_goals" on public.goals for select using (auth.uid() = user_id);
create policy "users_insert_own_goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "users_update_own_goals" on public.goals for update using (auth.uid() = user_id);
create policy "users_delete_own_goals" on public.goals for delete using (auth.uid() = user_id);

-- Recurring transactions policies
create policy "users_select_own_recurring" on public.recurring_transactions for select using (auth.uid() = user_id);
create policy "users_insert_own_recurring" on public.recurring_transactions for insert with check (auth.uid() = user_id);
create policy "users_update_own_recurring" on public.recurring_transactions for update using (auth.uid() = user_id);
create policy "users_delete_own_recurring" on public.recurring_transactions for delete using (auth.uid() = user_id);

-- Receipts policies
create policy "users_select_own_receipts" on public.receipts for select using (auth.uid() = user_id);
create policy "users_insert_own_receipts" on public.receipts for insert with check (auth.uid() = user_id);
create policy "users_update_own_receipts" on public.receipts for update using (auth.uid() = user_id);
create policy "users_delete_own_receipts" on public.receipts for delete using (auth.uid() = user_id);

-- OCR Usage policies (read own, insert with own user_id or null)
create policy "users_select_own_ocr_usage" on public.ocr_usage for select using (auth.uid() = user_id or user_id is null);
create policy "users_insert_own_ocr_usage" on public.ocr_usage for insert with check (auth.uid() = user_id or user_id is null);

-- Exchange rates : public read (pas de RLS, c'est une ressource partagée)
-- (les rates sont communes à tous les users, la table est publique en lecture)

-- ════════════════════════════════════════════════════════════════════════════
-- Trigger : auto-create profile à l'inscription
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
-- Storage Bucket pour les reçus
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Storage policies : users ne peuvent écrire que dans leur dossier user-id/
create policy "users_upload_own_receipts"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users_read_own_receipts"
  on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users_delete_own_receipts"
  on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════════════
-- Done. Vérifie :
--   select * from public.profiles;         -- doit être vide
--   select tablename from pg_tables where schemaname = 'public';
-- ════════════════════════════════════════════════════════════════════════════
