-- Confirmed catalog facts from docs/reference/dumpster-rental-rates-and-terms.pdf.
-- The pricing version remains draft and is blocked from publication until the
-- unresolved business configuration listed below is explicitly resolved.

insert into public.services (code, name, service_type, description, status)
values
  (
    'hauling_junk_removal',
    'Hauling and Junk Removal',
    'hauling',
    'Photo-assisted and onsite-quote hauling and junk-removal service.',
    'active'
  ),
  (
    'dumpster_rental',
    'Dumpster Rental',
    'dumpster_rental',
    'Residential-waste and heavy-material dumpster rentals.',
    'active'
  );

insert into public.dumpster_sizes (
  code,
  name,
  capacity_cubic_yards,
  length_feet,
  width_feet,
  wall_height_feet,
  status
)
values
  ('15_yard', '15-Yard Dumpster', 15, 14, 7, 4, 'active'),
  ('22_yard', '22-Yard Dumpster', 22, 14, 7, 6, 'active');

insert into public.service_items (
  service_id,
  dumpster_size_id,
  code,
  name,
  item_kind,
  description,
  default_rental_days,
  status,
  sort_order
)
values
  (
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.dumpster_sizes where code = '15_yard'),
    'dumpster_15_residential',
    '15-Yard Dumpster — Residential Waste',
    'rental_package',
    'Residential-waste-only 15-yard dumpster rental.',
    5,
    'active',
    10
  ),
  (
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.dumpster_sizes where code = '15_yard'),
    'dumpster_15_heavy_materials',
    '15-Yard Dumpster — Heavy Materials',
    'rental_package',
    'Dirt, sod, concrete, and gravel only.',
    5,
    'active',
    20
  ),
  (
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.dumpster_sizes where code = '22_yard'),
    'dumpster_22_residential',
    '22-Yard Dumpster — Residential Waste',
    'rental_package',
    'Residential-waste-only 22-yard dumpster rental. Current base rate requires a quote.',
    5,
    'active',
    30
  ),
  (
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'specialty_mattress',
    'Mattress',
    'specialty_item',
    'Specialty item fee.',
    null,
    'active',
    100
  ),
  (
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'specialty_box_spring',
    'Box Spring',
    'specialty_item',
    'Specialty item fee.',
    null,
    'active',
    110
  ),
  (
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'specialty_refrigerator',
    'Refrigerator',
    'specialty_item',
    'Specialty item fee. Handling requirements remain subject to operational review.',
    null,
    'active',
    120
  );

insert into public.pricing_versions (
  code,
  version_number,
  status,
  currency_code,
  effective_from,
  publication_blockers,
  source_document_path,
  source_document_sha256,
  source_document_date,
  legal_review_required
)
values (
  'dumpster_rate_sheet_2026_07_16',
  1,
  'draft',
  'USD',
  null,
  array[
    'service_areas_unconfirmed',
    'taxes_unconfirmed',
    'delivery_zone_fees_unconfirmed',
    'extra_day_rate_unconfirmed',
    'prohibited_material_fee_unconfirmed',
    'overloaded_container_fee_unconfirmed',
    'effective_date_unconfirmed'
  ],
  'docs/reference/dumpster-rental-rates-and-terms.pdf',
  '94be90d1523cb6e655e933203cac5ea1f20ecf594156129f33bc8687808f4150',
  date '2026-07-16',
  true
);

insert into public.pricing_rules (
  code,
  name,
  service_id,
  service_item_id,
  rule_kind,
  priority,
  internal_description
)
values
  (
    'dumpster_15_residential_base',
    '15-Yard Residential Base Rental',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    'base_price',
    10,
    'Confirmed five-day base rate from the supplied rate sheet.'
  ),
  (
    'dumpster_15_heavy_base',
    '15-Yard Heavy Materials Base Rental',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_heavy_materials'),
    'base_price',
    10,
    'Confirmed five-day base rate from the supplied rate sheet.'
  ),
  (
    'dumpster_22_residential_base',
    '22-Yard Residential Base Rental',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_22_residential'),
    'base_price',
    10,
    'The supplied rate sheet says to contact Barnes for the current rate.'
  ),
  (
    'dumpster_15_residential_overweight',
    '15-Yard Residential Additional Weight',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    'surcharge',
    50,
    'Per-ton charge after three included tons.'
  ),
  (
    'dumpster_15_heavy_overweight',
    '15-Yard Heavy Materials Additional Weight',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_heavy_materials'),
    'surcharge',
    50,
    'Per-ton charge after three included tons.'
  ),
  (
    'dumpster_22_residential_overweight',
    '22-Yard Residential Additional Weight',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_22_residential'),
    'surcharge',
    50,
    'Per-ton charge after three included tons.'
  ),
  (
    'specialty_mattress_fee',
    'Mattress Fee',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'specialty_mattress'),
    'surcharge',
    100,
    'Confirmed specialty-item fee.'
  ),
  (
    'specialty_box_spring_fee',
    'Box Spring Fee',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'specialty_box_spring'),
    'surcharge',
    100,
    'Confirmed specialty-item fee.'
  ),
  (
    'specialty_refrigerator_fee',
    'Refrigerator Fee',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'specialty_refrigerator'),
    'surcharge',
    100,
    'Confirmed specialty-item fee.'
  ),
  (
    'prohibited_material_fee',
    'Prohibited Material Fee',
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'conditional_fee',
    200,
    'The source says an additional fee may apply but provides no amount.'
  ),
  (
    'overloaded_container_fee',
    'Overloaded Container Fee',
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'conditional_fee',
    210,
    'The source says an additional fee may apply but provides no amount.'
  );

insert into public.pricing_rule_versions (
  pricing_rule_id,
  pricing_version_id,
  value_type,
  direction,
  amount_cents,
  percentage_basis_points,
  range_min_cents,
  range_max_cents,
  unit,
  included_quantity,
  rounding_mode,
  eligibility_conditions,
  customer_description
)
select
  rule.id,
  version.id,
  values_to_insert.value_type::public.pricing_value_type,
  'charge'::public.adjustment_direction,
  values_to_insert.amount_cents,
  null,
  null,
  null,
  values_to_insert.unit::public.pricing_unit,
  values_to_insert.included_quantity,
  'not_applicable'::public.pricing_rounding_mode,
  values_to_insert.eligibility_conditions,
  values_to_insert.customer_description
from (
  values
    ('dumpster_15_residential_base', 'fixed_amount', 27500::bigint, 'rental', null::numeric, '{}'::jsonb, 'Five-day 15-yard residential-waste rental.'),
    ('dumpster_15_heavy_base', 'fixed_amount', 35000::bigint, 'rental', null::numeric, '{}'::jsonb, 'Five-day 15-yard heavy-material rental.'),
    ('dumpster_22_residential_base', 'quote_required', null::bigint, null, null::numeric, '{}'::jsonb, 'Contact Barnes for the current 22-yard residential-waste rate.'),
    ('dumpster_15_residential_overweight', 'per_unit', 5000::bigint, 'ton', 3::numeric, '{"applies_after_included_quantity": true}'::jsonb, 'Additional weight after three included tons.'),
    ('dumpster_15_heavy_overweight', 'per_unit', 5000::bigint, 'ton', 3::numeric, '{"applies_after_included_quantity": true}'::jsonb, 'Additional weight after three included tons.'),
    ('dumpster_22_residential_overweight', 'per_unit', 5000::bigint, 'ton', 3::numeric, '{"applies_after_included_quantity": true}'::jsonb, 'Additional weight after three included tons.'),
    ('specialty_mattress_fee', 'per_unit', 3000::bigint, 'each', null::numeric, '{}'::jsonb, 'Mattress fee per item.'),
    ('specialty_box_spring_fee', 'per_unit', 3000::bigint, 'each', null::numeric, '{}'::jsonb, 'Box spring fee per item.'),
    ('specialty_refrigerator_fee', 'per_unit', 3000::bigint, 'each', null::numeric, '{}'::jsonb, 'Refrigerator fee per item.'),
    ('prohibited_material_fee', 'quote_required', null::bigint, null, null::numeric, '{}'::jsonb, 'Additional prohibited-material charges require staff review and a quote.'),
    ('overloaded_container_fee', 'quote_required', null::bigint, null, null::numeric, '{}'::jsonb, 'Additional overloaded-container charges require staff review and a quote.')
) as values_to_insert(
  rule_code,
  value_type,
  amount_cents,
  unit,
  included_quantity,
  eligibility_conditions,
  customer_description
)
join public.pricing_rules as rule on rule.code = values_to_insert.rule_code
cross join public.pricing_versions as version
where version.code = 'dumpster_rate_sheet_2026_07_16';

insert into public.pricing_version_terms (
  pricing_version_id,
  service_item_id,
  code,
  term_text,
  sort_order,
  legal_review_required
)
select
  version.id,
  item.id,
  terms.code,
  terms.term_text,
  terms.sort_order,
  true
from (
  values
    (null::text, 'general_rental_period', 'Rental period is 5 days unless otherwise agreed.', 10),
    (null::text, 'general_safe_loading', 'Customer is responsible for safe loading and not exceeding weight limits.', 20),
    (null::text, 'general_hazardous_materials', 'Hazardous materials are prohibited in all dumpsters.', 30),
    (null::text, 'general_overweight_charge', 'Overweight charges apply at $50 per ton over the included limit.', 40),
    (null::text, 'general_conditional_fees', 'Additional fees may apply for prohibited materials or overloaded containers.', 50),
    ('dumpster_15_residential', 'residential_15_waste_only', 'Residential waste only.', 100),
    ('dumpster_15_residential', 'residential_15_prohibited_load', 'Do NOT load dirt, soil, gravel, or concrete.', 110),
    ('dumpster_15_residential', 'residential_15_included_weight', 'Includes up to 3 tons of disposal.', 120),
    ('dumpster_15_residential', 'residential_15_additional_weight', 'Additional weight: $50 per ton after 3 tons.', 130),
    ('dumpster_15_residential', 'residential_15_specialty_items', 'Specialty items (e.g., mattresses): $30 each.', 140),
    ('dumpster_15_residential', 'residential_15_no_hazardous', 'No hazardous materials.', 150),
    ('dumpster_15_heavy_materials', 'heavy_15_materials_only', 'For dirt, sod, concrete, and gravel only.', 200),
    ('dumpster_15_heavy_materials', 'heavy_15_no_household_trash', 'No residential household trash.', 210),
    ('dumpster_15_heavy_materials', 'heavy_15_included_weight', 'Includes up to 3 tons of disposal.', 220),
    ('dumpster_15_heavy_materials', 'heavy_15_additional_weight', 'Additional weight: $50 per ton after 3 tons.', 230),
    ('dumpster_15_heavy_materials', 'heavy_15_swap_out', 'Swap-out service available at the same price as the original rental.', 240),
    ('dumpster_22_residential', 'residential_22_waste_only', 'Residential waste only.', 300),
    ('dumpster_22_residential', 'residential_22_prohibited_load', 'Do NOT load dirt, sod, concrete, or gravel.', 310),
    ('dumpster_22_residential', 'residential_22_included_weight', 'Includes up to 3 tons of disposal.', 320),
    ('dumpster_22_residential', 'residential_22_additional_weight', 'Additional weight: $50 per ton after 3 tons.', 330),
    ('dumpster_22_residential', 'residential_22_rental_period', '5-day rental period.', 340)
) as terms(item_code, code, term_text, sort_order)
cross join public.pricing_versions as version
left join public.service_items as item on item.code = terms.item_code
where version.code = 'dumpster_rate_sheet_2026_07_16';
