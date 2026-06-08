
ALTER TABLE public.confirmations
  ADD COLUMN sweet_dishes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN savory_dishes text[] NOT NULL DEFAULT '{}';

UPDATE public.confirmations
  SET sweet_dishes = ARRAY[sweet_dish],
      savory_dishes = ARRAY[savory_dish]
  WHERE sweet_dish IS NOT NULL OR savory_dish IS NOT NULL;

ALTER TABLE public.confirmations
  ALTER COLUMN sweet_dish DROP NOT NULL,
  ALTER COLUMN savory_dish DROP NOT NULL;
