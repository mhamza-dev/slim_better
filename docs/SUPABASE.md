## Environment

Copy `.env.example` to `.env` and set:

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database SQL

Run in Supabase SQL editor.

```sql
-- Table
create table if not exists public.patients (
  id serial primary key,
  patient_name varchar(100) not null,
  date_of_birth date not null,
  city varchar(50),
  advance_payment numeric(10,2) default 0,
  paid_payment numeric(10,2) default 0,
  total_payment numeric(10,2) default 0,
  sessions_completed int default 0,
  total_sessions int default 0,
  gap_between_sessions int default 7,
  start_date date not null,
  next_session_date date,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

-- RLS
alter table public.patients enable row level security;
drop policy if exists patients_owner_all on public.patients;
create policy patients_owner_all on public.patients
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- default created_by
create or replace function public.set_created_by()
returns trigger as $$
begin
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_patients_created_by on public.patients;
create trigger trg_patients_created_by
before insert on public.patients
for each row execute function public.set_created_by();

-- Optional enriched view
create or replace view public.patients_enriched as
select
  p.*,
  extract(year from age(current_date, p.date_of_birth))::int as age,
  (coalesce(p.total_payment,0) - coalesce(p.paid_payment,0))::numeric(10,2) as pending_payment,
  (coalesce(p.sessions_completed,0) || '/' || coalesce(p.total_sessions,0)) as sessions_progress
from public.patients p;

grant select on public.patients_enriched to anon, authenticated;
```


