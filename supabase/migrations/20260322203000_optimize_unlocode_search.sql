-- =========================================================
-- OPTIMIZE UN/LOCODE SEARCH
-- =========================================================

create extension if not exists pg_trgm;

alter table public.unlocodes
add column if not exists search_text text not null default '';

create or replace function public.set_unlocode_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        new.unlocode,
        new.country_code,
        new.location_code,
        new.country_name,
        new.name,
        coalesce(new.name_without_diacritics, ''),
        coalesce(new.subdivision_code, ''),
        coalesce(new.iata_code, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

drop trigger if exists set_unlocodes_search_text on public.unlocodes;

create trigger set_unlocodes_search_text
before insert or update on public.unlocodes
for each row
execute function public.set_unlocode_search_text();

update public.unlocodes
set search_text = lower(
  regexp_replace(
    concat_ws(
      ' ',
      unlocode,
      country_code,
      location_code,
      country_name,
      name,
      coalesce(name_without_diacritics, ''),
      coalesce(subdivision_code, ''),
      coalesce(iata_code, '')
    ),
    '\s+',
    ' ',
    'g'
  )
);

drop index if exists public.idx_unlocodes_name;
drop index if exists public.idx_unlocodes_name_without_diacritics;
drop index if exists public.idx_unlocodes_subdivision_code;

create index if not exists idx_unlocodes_unlocode_pattern
  on public.unlocodes (unlocode text_pattern_ops);

create index if not exists idx_unlocodes_search_text_trgm
  on public.unlocodes using gin (search_text gin_trgm_ops);

create index if not exists idx_unlocodes_name_trgm
  on public.unlocodes using gin (name gin_trgm_ops);

create index if not exists idx_unlocodes_name_without_diacritics_trgm
  on public.unlocodes using gin (name_without_diacritics gin_trgm_ops);

create or replace function public.search_unlocodes(
  p_query text default null,
  p_country_code text default null,
  p_function_classifier text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  source_id uuid,
  country_code text,
  location_code text,
  unlocode text,
  country_name text,
  name text,
  name_without_diacritics text,
  subdivision_code text,
  function_classifier text,
  status text,
  change_indicator text,
  date_code text,
  iata_code text,
  coordinates text,
  remarks text,
  source_page_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query,
      nullif(upper(btrim(p_query)), '') as normalized_code,
      nullif(upper(btrim(p_country_code)), '') as normalized_country_code,
      nullif(btrim(p_function_classifier), '') as normalized_function_classifier
  )
  select
    u.id,
    u.source_id,
    u.country_code,
    u.location_code,
    u.unlocode,
    u.country_name,
    u.name,
    u.name_without_diacritics,
    u.subdivision_code,
    u.function_classifier,
    u.status,
    u.change_indicator,
    u.date_code,
    u.iata_code,
    u.coordinates,
    u.remarks,
    u.source_page_url,
    u.created_at,
    u.updated_at
  from public.unlocodes u
  cross join params p
  where (
    p.normalized_query is null
    or u.search_text ilike '%' || p.normalized_query || '%'
    or u.unlocode = p.normalized_code
  )
    and (
      p.normalized_country_code is null
      or u.country_code = p.normalized_country_code
    )
    and (
      p.normalized_function_classifier is null
      or coalesce(u.function_classifier, '') like '%' || p.normalized_function_classifier || '%'
    )
  order by
    case
      when p.normalized_query is null then 0
      when u.unlocode = p.normalized_code then 1000
      when u.unlocode like p.normalized_code || '%' then 900
      when lower(u.name) like p.normalized_query || '%' then 800
      when lower(coalesce(u.name_without_diacritics, '')) like p.normalized_query || '%' then 775
      when lower(coalesce(u.country_name, '')) like p.normalized_query || '%' then 650
      when lower(coalesce(u.iata_code, '')) = p.normalized_query then 625
      else greatest(
        similarity(u.search_text, p.normalized_query),
        similarity(lower(coalesce(u.name_without_diacritics, '')), p.normalized_query),
        similarity(lower(coalesce(u.name, '')), p.normalized_query)
      ) * 100
    end desc,
    u.country_code asc,
    u.name asc,
    u.location_code asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace view public.unlocode_lookup_view as
select
  u.id,
  u.source_id,
  u.country_code,
  u.location_code,
  u.unlocode,
  u.country_name,
  u.name,
  u.name_without_diacritics,
  u.subdivision_code,
  u.function_classifier,
  u.status,
  u.change_indicator,
  u.date_code,
  u.iata_code,
  u.coordinates,
  u.remarks,
  u.source_page_url,
  u.created_at,
  u.updated_at,
  case
    when coalesce(u.subdivision_code, '') <> '' then u.unlocode || ' - ' || u.name || ' (' || u.subdivision_code || ')'
    else u.unlocode || ' - ' || u.name
  end as display_name,
  u.search_text
from public.unlocodes u;
