create or replace function create_quotation_cargo_line(
  p_quotation_id uuid,
  p_load_type text,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into quotation_cargo_lines (
    quotation_id,
    load_type,
    piece_count,
    width,
    length,
    height,
    weight,
    freight_class,
    cbm,
    volumetric_weight_kg,
    sort_order
  )
  values (
    p_quotation_id,
    nullif(btrim(coalesce(p_load_type, '')), ''),
    p_piece_count,
    p_width,
    p_length,
    p_height,
    p_weight,
    nullif(btrim(coalesce(p_freight_class, '')), ''),
    p_cbm,
    p_volumetric_weight_kg,
    coalesce(p_sort_order, 1)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_cargo_line(
  p_id uuid,
  p_load_type text,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_cargo_lines
  set
    load_type = nullif(btrim(coalesce(p_load_type, '')), ''),
    piece_count = p_piece_count,
    width = p_width,
    length = p_length,
    height = p_height,
    weight = p_weight,
    freight_class = nullif(btrim(coalesce(p_freight_class, '')), ''),
    cbm = p_cbm,
    volumetric_weight_kg = p_volumetric_weight_kg,
    sort_order = coalesce(p_sort_order, 1)
  where id = p_id;
end;
$$;

create or replace function delete_quotation_cargo_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from quotation_cargo_lines
  where id = p_id;
end;
$$;

create or replace function create_booking_from_quotation(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  shipment_id uuid;
begin
  select status
  into current_status
  from quotations
  where id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if current_status <> 'aceptada' then
    raise exception 'Quotation % must be aceptada before booking', p_quotation_id;
  end if;

  shipment_id := create_shipment(p_quotation_id);
  return shipment_id;
end;
$$;
