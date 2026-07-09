CREATE OR REPLACE VIEW public.items_presentation AS
SELECT id, item_id, item_number, item_text, anchor_low, anchor_high, dimension_id, facet_name, context_type, instrument_id, instrument_version, include_in_romantic, rater_type
FROM public.items;
GRANT SELECT ON public.items_presentation TO authenticated, anon;