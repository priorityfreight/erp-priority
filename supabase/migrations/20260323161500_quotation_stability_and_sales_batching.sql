create or replace function update_quotation_option_sales_amounts(
  p_quotation_id uuid,
  p_option_label text,
  p_sales_amounts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_option_label text := coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), 'Opcion 1');
begin
  if p_sales_amounts is null or jsonb_typeof(p_sales_amounts) <> 'object' then
    raise exception 'Sales amounts payload must be a JSON object keyed by quotation cost line id';
  end if;

  update quotation_costs qc
  set
    sale_amount = updates.sale_amount,
    profit_amount = case
      when updates.sale_amount is null or qc.purchase_amount is null then null
      else updates.sale_amount - qc.purchase_amount
    end
  from (
    select
      key::uuid as line_id,
      nullif(btrim(value), '')::numeric as sale_amount
    from jsonb_each_text(p_sales_amounts)
  ) as updates
  where qc.id = updates.line_id
    and qc.quotation_id = p_quotation_id
    and qc.option_label = normalized_option_label;

  perform recalculate_quotation_totals(p_quotation_id);
end;
$$;
