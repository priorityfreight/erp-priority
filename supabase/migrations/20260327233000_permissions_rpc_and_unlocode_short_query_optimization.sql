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
      nullif(btrim(p_function_classifier), '') as normalized_function_classifier,
      char_length(nullif(lower(btrim(p_query)), '')) as normalized_query_length
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
      when coalesce(p.normalized_query_length, 0) < 4 then 0
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

create or replace function public.upsert_role_resource_permission(
  p_role_id uuid,
  p_resource_id uuid,
  p_action_id uuid,
  p_condition_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.erp_is_admin() then
    raise exception 'Only admins can update role resource permissions';
  end if;

  insert into public.role_resource_permissions (
    role_id,
    resource_id,
    action_id,
    condition_id,
    allowed
  )
  values (
    p_role_id,
    p_resource_id,
    p_action_id,
    p_condition_id,
    p_allowed
  )
  on conflict (role_id, resource_id, action_id)
  do update set
    condition_id = excluded.condition_id,
    allowed = excluded.allowed;
end;
$$;

create or replace function public.upsert_role_field_permission(
  p_role_id uuid,
  p_field_id uuid,
  p_action_id uuid,
  p_condition_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.erp_is_admin() then
    raise exception 'Only admins can update role field permissions';
  end if;

  insert into public.role_field_permissions (
    role_id,
    field_id,
    action_id,
    condition_id,
    allowed
  )
  values (
    p_role_id,
    p_field_id,
    p_action_id,
    p_condition_id,
    p_allowed
  )
  on conflict (role_id, field_id, action_id)
  do update set
    condition_id = excluded.condition_id,
    allowed = excluded.allowed;
end;
$$;
