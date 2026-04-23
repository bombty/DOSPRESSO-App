#!/bin/bash
set -e
npm install
timeout 45 bash -c 'yes "" 2>/dev/null | npx drizzle-kit push' || true

# Task #141: Populate factory_ingredient_nutrition with real per-100g
# nutrition values and allergen tags. Idempotent — UPDATE statements are
# guarded by `WHERE verified_by IS NULL`, so re-runs are safe and become
# no-ops once data is in place.
if [ -z "$DATABASE_URL" ]; then
  echo "post-merge: DATABASE_URL is required to apply Task #141 nutrition seed" >&2
  exit 1
fi

if [ ! -f scripts/pilot/19-sema-alerjen-besin-doldurma.sql ]; then
  echo "post-merge: nutrition seed script missing" >&2
  exit 1
fi

echo "post-merge: applying factory_ingredient_nutrition seed (Task #141)..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/pilot/19-sema-alerjen-besin-doldurma.sql

# Coverage assertion — fail loudly if the customer allergen page would
# regress. Per task #141, we require:
#   - every row has a non-NULL allergens array and confidence >= 80
#   - the bulk of rows have non-zero nutrition (a small set of legitimately
#     zero-kcal items — water, salt, food-grade additives — is allowed)
#   - well-known allergen anchors (gluten / sut / yumurta / soya) are
#     present, so the page actually renders allergen badges
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE
  total_rows INT;
  bad_meta INT;
  zero_kcal_rows INT;
  rows_with_allergens INT;
  has_gluten BOOL;
  has_sut BOOL;
  has_yumurta BOOL;
  has_soya BOOL;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM factory_ingredient_nutrition;
  IF total_rows = 0 THEN
    RAISE EXCEPTION 'post-merge: factory_ingredient_nutrition is empty';
  END IF;

  SELECT COUNT(*) INTO bad_meta
  FROM factory_ingredient_nutrition
  WHERE allergens IS NULL OR confidence IS NULL OR confidence < 80;
  IF bad_meta > 0 THEN
    RAISE EXCEPTION 'post-merge: % factory_ingredient_nutrition rows missing allergens or confidence < 80', bad_meta;
  END IF;

  SELECT COUNT(*) INTO zero_kcal_rows
  FROM factory_ingredient_nutrition
  WHERE COALESCE(energy_kcal, 0) = 0;
  -- water/salt/colorants/enzymes/etc. legitimately stay at 0; cap at 35%.
  IF zero_kcal_rows::numeric / total_rows > 0.35 THEN
    RAISE EXCEPTION 'post-merge: % / % rows still have energy_kcal = 0 (population likely incomplete)', zero_kcal_rows, total_rows;
  END IF;

  SELECT COUNT(*) INTO rows_with_allergens
  FROM factory_ingredient_nutrition
  WHERE array_length(allergens, 1) > 0;
  IF rows_with_allergens < 20 THEN
    RAISE EXCEPTION 'post-merge: only % rows carry an allergen tag (expected at least 20)', rows_with_allergens;
  END IF;

  SELECT EXISTS (SELECT 1 FROM factory_ingredient_nutrition WHERE 'gluten'  = ANY(allergens)) INTO has_gluten;
  SELECT EXISTS (SELECT 1 FROM factory_ingredient_nutrition WHERE 'sut'     = ANY(allergens)) INTO has_sut;
  SELECT EXISTS (SELECT 1 FROM factory_ingredient_nutrition WHERE 'yumurta' = ANY(allergens)) INTO has_yumurta;
  SELECT EXISTS (SELECT 1 FROM factory_ingredient_nutrition WHERE 'soya'    = ANY(allergens)) INTO has_soya;
  IF NOT (has_gluten AND has_sut AND has_yumurta AND has_soya) THEN
    RAISE EXCEPTION 'post-merge: missing core allergen tags (gluten=% sut=% yumurta=% soya=%)',
      has_gluten, has_sut, has_yumurta, has_soya;
  END IF;
END \$\$;
"
