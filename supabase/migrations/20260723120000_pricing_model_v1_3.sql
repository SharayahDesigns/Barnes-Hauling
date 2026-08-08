-- Approved dumpster pricing from Barnes_Hauling_Official_Pricing_Model_v1.3.docx
-- Effective July 23, 2026. Keep prior draft pricing versions for history.

update public.service_items
set description = 'Residential-waste-only 22-yard dumpster rental with approved 5-day pricing.'
where code = 'dumpster_22_residential';

update public.service_items
set description = 'Staff-approved heavy-material rental for one clean material type per container.'
where code = 'dumpster_15_heavy_materials';

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
  'official_pricing_model_2026_07_23_v1_3',
  2,
  'draft',
  'USD',
  timestamptz '2026-07-23 00:00:00-06',
  array[
    'service_areas_unconfirmed',
    'taxes_unconfirmed'
  ],
  'owner-supplied/Barnes_Hauling_Official_Pricing_Model_v1.3.docx',
  '29e4083c82c625c6dfc7829b01634c0b84904dffe6a1b56cfe360798bdc85734',
  date '2026-07-23',
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
    'dumpster_15_residential_short_term_adjustment',
    '15-Yard Residential 48-Hour Adjustment',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    'discount',
    20,
    'Converts the standard 5-day 15-yard residential base rate to the approved 48-hour short-term rate.'
  ),
  (
    'dumpster_delivery_excess_mileage',
    'Dumpster Delivery Excess Mileage',
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'surcharge',
    30,
    'Charge only one-way driving miles beyond the first 20 miles, rounded on the excess portion to the next whole mile.'
  ),
  (
    'dumpster_15_residential_seven_day_upgrade',
    '15-Yard Residential 7-Day Upgrade',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    'surcharge',
    35,
    'Adds two days to the standard 5-day residential rental.'
  ),
  (
    'dumpster_additional_day',
    'Dumpster Additional Day',
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'surcharge',
    40,
    'Applies when an extension is approved and inventory remains available.'
  ),
  (
    'dumpster_late_cancellation',
    'Dumpster Late Cancellation',
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'conditional_fee',
    160,
    'May apply to late cancellations after equipment has been reserved or dispatched.'
  ),
  (
    'dumpster_failed_delivery',
    'Dumpster Failed Delivery',
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'conditional_fee',
    170,
    'Applies when access, placement, or customer-readiness issues prevent delivery.'
  ),
  (
    'dumpster_blocked_pickup',
    'Dumpster Blocked Pickup',
    (select id from public.services where code = 'dumpster_rental'),
    null,
    'conditional_fee',
    180,
    'Applies when Barnes cannot safely retrieve the dumpster at the scheduled time.'
  )
on conflict (code) do nothing;

update public.pricing_rules
set internal_description = 'Approved 5-day base rate for the 15-yard residential dumpster.'
where code = 'dumpster_15_residential_base';

update public.pricing_rules
set internal_description = 'Heavy-material rentals require staff approval. Public pricing starts at $395 and final terms depend on the approved material.'
where code = 'dumpster_15_heavy_base';

update public.pricing_rules
set internal_description = 'Approved 5-day base rate for the 22-yard residential dumpster.'
where code = 'dumpster_22_residential_base';

update public.pricing_rules
set internal_description = 'Per-ton charge after two included tons for 15-yard residential rentals.'
where code = 'dumpster_15_residential_overweight';

update public.pricing_rules
set internal_description = 'Material-specific overage range after the approved included weight for heavy-material rentals.'
where code = 'dumpster_15_heavy_overweight';

update public.pricing_rules
set internal_description = 'Per-ton charge after three included tons for 22-yard residential rentals.'
where code = 'dumpster_22_residential_overweight';

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
  rounding_increment,
  eligibility_conditions,
  customer_description,
  internal_description
)
select
  rule.id,
  version.id,
  values_to_insert.value_type::public.pricing_value_type,
  values_to_insert.direction::public.adjustment_direction,
  values_to_insert.amount_cents,
  null,
  values_to_insert.range_min_cents,
  values_to_insert.range_max_cents,
  values_to_insert.unit::public.pricing_unit,
  values_to_insert.included_quantity,
  values_to_insert.rounding_mode::public.pricing_rounding_mode,
  values_to_insert.rounding_increment,
  values_to_insert.eligibility_conditions,
  values_to_insert.customer_description,
  values_to_insert.internal_description
from (
  values
    (
      'dumpster_15_residential_base',
      'fixed_amount',
      'charge',
      27500::bigint,
      null::bigint,
      null::bigint,
      'rental',
      null::numeric,
      'not_applicable',
      null::numeric,
      '{}'::jsonb,
      '5-day 15-yard residential rental',
      'Standard 5-day residential base rate.'
    ),
    (
      'dumpster_15_residential_short_term_adjustment',
      'fixed_amount',
      'credit',
      2500::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"rental_days":[2]}'::jsonb,
      '48-hour 15-yard residential discount',
      'Reduces the 5-day residential base to the approved 48-hour price of $250.'
    ),
    (
      'dumpster_15_heavy_base',
      'quote_required',
      'charge',
      null::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"staff_approval_required":true,"starting_at_cents":39500}'::jsonb,
      'Starting at $395',
      'Heavy-material rentals require staff approval, approved material selection, and material-specific weight terms.'
    ),
    (
      'dumpster_22_residential_base',
      'fixed_amount',
      'charge',
      32500::bigint,
      null::bigint,
      null::bigint,
      'rental',
      null::numeric,
      'not_applicable',
      null::numeric,
      '{}'::jsonb,
      '5-day 22-yard residential rental',
      'Approved 5-day residential base rate.'
    ),
    (
      'dumpster_15_residential_overweight',
      'per_unit',
      'charge',
      5000::bigint,
      null::bigint,
      null::bigint,
      'ton',
      2::numeric,
      'not_applicable',
      null::numeric,
      '{"applies_after_included_quantity":true}'::jsonb,
      'Additional weight after 2 included tons',
      'Overage rate for 15-yard residential rentals.'
    ),
    (
      'dumpster_15_heavy_overweight',
      'estimated_range',
      'charge',
      null::bigint,
      5500::bigint,
      6500::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"staff_approval_required":true,"applies_after_approved_included_weight":true,"unit":"ton"}'::jsonb,
      'Heavy-material overage varies by approved material',
      'Heavy-material overage range of $55-$65 per ton after the approved included weight.'
    ),
    (
      'dumpster_22_residential_overweight',
      'per_unit',
      'charge',
      5000::bigint,
      null::bigint,
      null::bigint,
      'ton',
      3::numeric,
      'not_applicable',
      null::numeric,
      '{"applies_after_included_quantity":true}'::jsonb,
      'Additional weight after 3 included tons',
      'Overage rate for 22-yard residential rentals.'
    ),
    (
      'specialty_mattress_fee',
      'per_unit',
      'charge',
      3000::bigint,
      null::bigint,
      null::bigint,
      'each',
      null::numeric,
      'not_applicable',
      null::numeric,
      '{}'::jsonb,
      'Mattress fee per item',
      'Declared mattress fee.'
    ),
    (
      'specialty_box_spring_fee',
      'per_unit',
      'charge',
      3000::bigint,
      null::bigint,
      null::bigint,
      'each',
      null::numeric,
      'not_applicable',
      null::numeric,
      '{}'::jsonb,
      'Box spring fee per item',
      'Declared box spring fee.'
    ),
    (
      'specialty_refrigerator_fee',
      'per_unit',
      'charge',
      3000::bigint,
      null::bigint,
      null::bigint,
      'each',
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"subject_to_disposal_acceptance":true}'::jsonb,
      'Refrigerator or freezer fee per item',
      'Declared refrigerator or freezer fee.'
    ),
    (
      'dumpster_delivery_excess_mileage',
      'per_unit',
      'charge',
      200::bigint,
      null::bigint,
      null::bigint,
      'mile',
      20::numeric,
      'ceiling',
      1::numeric,
      '{"applies_after_included_quantity":true,"calculation_basis":"one_way_driving_miles"}'::jsonb,
      '$2 per excess mile beyond 20 driving miles',
      'Rounds only the excess-mile portion up to the next whole mile.'
    ),
    (
      'dumpster_15_residential_seven_day_upgrade',
      'fixed_amount',
      'charge',
      2000::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"base_rental_days":[5],"approved_resulting_rental_days":[7]}'::jsonb,
      '7-day upgrade',
      'Adds two days to the standard 5-day residential rental for $20 total.'
    ),
    (
      'dumpster_additional_day',
      'per_unit',
      'charge',
      1000::bigint,
      null::bigint,
      null::bigint,
      'day',
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"approval_required":true,"inventory_required":true}'::jsonb,
      'Additional rental day',
      'Approved extension rate after the included rental period or approved upgrade.'
    ),
    (
      'dumpster_late_cancellation',
      'fixed_amount',
      'charge',
      5000::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"may_apply":true,"window":"inside_24_hours_or_after_dispatch"}'::jsonb,
      'Late cancellation fee may apply',
      'May apply after equipment has been reserved or dispatched.'
    ),
    (
      'dumpster_failed_delivery',
      'fixed_amount',
      'charge',
      5000::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"requires_documented_access_issue":true}'::jsonb,
      'Failed delivery fee',
      'Applies when safe delivery cannot be completed.'
    ),
    (
      'dumpster_blocked_pickup',
      'fixed_amount',
      'charge',
      5000::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"requires_documented_access_issue":true}'::jsonb,
      'Blocked pickup fee',
      'Applies when safe pickup cannot be completed at the scheduled time.'
    ),
    (
      'prohibited_material_fee',
      'quote_required',
      'charge',
      null::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"staff_review_required":true,"documentation_required":true}'::jsonb,
      'Prohibited-material charges require staff review',
      'Post-rental prohibited-material charges require documentation and staff review.'
    ),
    (
      'overloaded_container_fee',
      'quote_required',
      'charge',
      null::bigint,
      null::bigint,
      null::bigint,
      null,
      null::numeric,
      'not_applicable',
      null::numeric,
      '{"staff_review_required":true,"documentation_required":true}'::jsonb,
      'Overloaded-container charges require staff review',
      'Unsafe or overloaded-container charges require documentation and staff review.'
    )
) as values_to_insert(
  rule_code,
  value_type,
  direction,
  amount_cents,
  range_min_cents,
  range_max_cents,
  unit,
  included_quantity,
  rounding_mode,
  rounding_increment,
  eligibility_conditions,
  customer_description,
  internal_description
)
join public.pricing_rules as rule on rule.code = values_to_insert.rule_code
cross join public.pricing_versions as version
where version.code = 'official_pricing_model_2026_07_23_v1_3';

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
    (null::text, 'general_delivery_miles', 'The base rental includes delivery within the first 20 driving miles. Mileage beyond 20 miles is $2 per excess mile, rounded on the excess portion to the next whole mile.', 10),
    (null::text, 'general_rental_extensions', 'A 7-day upgrade costs $20 total. Additional approved rental time costs $10 per calendar day and depends on dumpster availability.', 20),
    (null::text, 'general_weekend_delivery', 'There is no automatic weekend surcharge. Any exceptional weekend fee must be disclosed before payment.', 30),
    (null::text, 'general_cancellation', 'Cancellation is free 24 or more hours before delivery. A $50 fee may apply to a late cancellation after equipment has been reserved or dispatched.', 40),
    (null::text, 'general_post_rental_review', 'Post-rental charges require documentation, staff review, and itemized notice before charging.', 50),
    ('dumpster_15_residential', 'residential_15_short_term_rate', '48-hour residential rental: $250 including 2 tons.', 100),
    ('dumpster_15_residential', 'residential_15_standard_rate', '5-day residential rental: $275 including 2 tons.', 110),
    ('dumpster_15_residential', 'residential_15_upgrade_rate', '48-hour bookings may be upgraded to the 5-day rental for $25 when approved before pickup.', 120),
    ('dumpster_15_residential', 'residential_15_overage', 'Additional weight is $50 per ton after the included 2 tons.', 130),
    ('dumpster_15_heavy_materials', 'heavy_15_quote_required', 'Heavy-material rentals start at $395 and require staff approval before payment.', 200),
    ('dumpster_15_heavy_materials', 'heavy_15_single_material', 'Use one clean material type per rental: dirt, concrete, gravel, rock, or sod.', 210),
    ('dumpster_15_heavy_materials', 'heavy_15_weight_terms', 'Included weight, fill line, and overage rate are set by the approved material before payment.', 220),
    ('dumpster_22_residential', 'residential_22_standard_rate', '5-day residential rental: $325 including 3 tons.', 300),
    ('dumpster_22_residential', 'residential_22_overage', 'Additional weight is $50 per ton after the included 3 tons.', 310),
    ('specialty_mattress', 'specialty_mattress_rate', 'Mattress fee: $30 each.', 400),
    ('specialty_box_spring', 'specialty_box_spring_rate', 'Box spring fee: $30 each.', 410),
    ('specialty_refrigerator', 'specialty_refrigerator_rate', 'Refrigerator or freezer fee: $30 each, subject to disposal-site acceptance.', 420)
) as terms(item_code, code, term_text, sort_order)
cross join public.pricing_versions as version
left join public.service_items as item on item.code = terms.item_code
where version.code = 'official_pricing_model_2026_07_23_v1_3';
