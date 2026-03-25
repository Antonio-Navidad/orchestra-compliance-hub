-- compliance_rules_updates table
-- Stores parsed CBP/CSMS regulatory updates fetched weekly by compliance-rules-updater.
-- Each row represents one actionable compliance change that may affect active shipments.

create table if not exists public.compliance_rules_updates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- Source of the rule update
  source          text not null,          -- e.g. "CBP CSMS #64291847", "Federal Register Vol 90 No 12"
  source_url      text,                   -- canonical URL of the bulletin, if available
  effective_date  date not null,          -- date the rule takes / took effect

  -- Scope of the update
  transport_modes text[] not null default '{}',   -- ["ocean","air","land"] — empty = all modes
  affected_origins text[] not null default '{}',  -- ISO-3166 alpha-2 or full country names; empty = all origins
  affected_hts_chapters text[] not null default '{}', -- e.g. ["84","85"]; empty = all chapters

  -- What changed
  change_type     text not null check (change_type in (
    'tariff_rate',
    'document_requirement',
    'filing_deadline',
    'examination_criteria',
    'quota',
    'embargo',
    'de_minimis',
    'marking_requirement',
    'other'
  )),
  severity        text not null check (severity in ('critical','high','medium','low')),
  summary         text not null,          -- one-sentence plain-English summary of the change
  detail          text not null,          -- full parsed text of the relevant regulation / bulletin excerpt
  action_required text not null,          -- what a customs broker must do for affected shipments

  -- Metadata
  parsed_by_model text not null default 'claude-sonnet-4-6',
  confirmed       boolean not null default false,  -- set true after human review
  superseded_by   uuid references public.compliance_rules_updates(id)  -- links to newer row for same rule
);

-- Allow the edge function (service role) to insert
alter table public.compliance_rules_updates enable row level security;

create policy "Service role can manage compliance_rules_updates"
  on public.compliance_rules_updates
  for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated users can read compliance_rules_updates"
  on public.compliance_rules_updates
  for select
  to authenticated
  using (true);

-- Speed up the lookups workspace-crossref does after each run
create index if not exists compliance_rules_updates_effective_date_idx
  on public.compliance_rules_updates (effective_date desc);

create index if not exists compliance_rules_updates_origins_idx
  on public.compliance_rules_updates using gin (affected_origins);

create index if not exists compliance_rules_updates_modes_idx
  on public.compliance_rules_updates using gin (transport_modes);
