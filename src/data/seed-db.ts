/**
 * Seed script: downloads real cosmetics products from Open Beauty Facts API
 * and inserts them into data/cosmetics.db.
 *
 * Run with: bun run src/data/seed-db.ts
 *
 * Fetches from multiple product categories to build a diverse dataset of
 * 2000-5000 real products with ingredient lists.
 */

import { getDb } from '../lib/db';

interface OBFProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
}

interface OBFSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OBFProduct[];
}

interface ProductRow {
  count: number;
}

// Categories to fetch from Open Beauty Facts
const CATEGORIES = [
  'moisturizers',
  'face-creams',
  'cleansers',
  'facial-cleansers',
  'serums',
  'face-serums',
  'sunscreens',
  'sun-creams',
  'shampoos',
  'toners',
  'face-toners',
  'face-masks',
  'hair-masks',
  'body-lotions',
  'body-milks',
  'lip-balms',
  'hand-creams',
  'eye-creams',
  'anti-aging-creams',
  'foundations',
  'conditioners',
  'hair-conditioners',
  'shower-gels',
  'deodorants',
  'toothpastes',
  'day-creams',
  'night-creams',
  'bb-creams',
  'micellar-waters',
  'facial-oils',
];

// Pages to fetch per category (100 products per page)
const PAGES_PER_CATEGORY = 4;

function buildUrl(category: string, page: number): string {
  return (
    `https://world.openbeautyfacts.org/cgi/search.pl?` +
    `action=process&` +
    `tagtype_0=categories&tag_contains_0=contains&tag_0=${category}&` +
    `json=true&page_size=100&page=${page}&` +
    `fields=product_name,brands,categories,ingredients_text,ingredients_text_en`
  );
}

function normalizeCategory(categories: string | undefined): string | null {
  if (!categories) return null;
  // Take the most specific (last) category, or the first one
  const parts = categories.split(',').map((c) => c.trim().toLowerCase());
  // Return the first recognizable category
  for (const part of parts) {
    if (part.includes('moisturiz')) return 'moisturizer';
    if (part.includes('cream') && part.includes('face')) return 'face cream';
    if (part.includes('cream') && part.includes('eye')) return 'eye cream';
    if (part.includes('cream') && part.includes('hand')) return 'hand cream';
    if (part.includes('cream')) return 'cream';
    if (part.includes('cleanser') || part.includes('cleansing')) return 'cleanser';
    if (part.includes('serum')) return 'serum';
    if (part.includes('sunscreen') || part.includes('sun protection')) return 'sunscreen';
    if (part.includes('shampoo')) return 'shampoo';
    if (part.includes('conditioner')) return 'conditioner';
    if (part.includes('toner')) return 'toner';
    if (part.includes('mask')) return 'mask';
    if (part.includes('lotion') && part.includes('body')) return 'body lotion';
    if (part.includes('lotion')) return 'lotion';
    if (part.includes('lip')) return 'lip care';
    if (part.includes('foundation')) return 'foundation';
    if (part.includes('shower') || part.includes('body wash')) return 'body wash';
    if (part.includes('oil') && part.includes('face')) return 'facial oil';
    if (part.includes('exfoliat') || part.includes('scrub')) return 'exfoliant';
  }
  // Fallback: use the first category cleaned up
  return parts[0].slice(0, 50) || null;
}

async function fetchCategory(category: string, page: number): Promise<OBFProduct[]> {
  const url = buildUrl(category, page);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Glowfy/1.0 (skincare-agent; contact@glowfy.dev)' },
    });

    if (!response.ok) {
      console.warn(`[seed-db] HTTP ${response.status} for ${category} page ${page}, skipping.`);
      return [];
    }

    const data = (await response.json()) as OBFSearchResponse;
    return data.products || [];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[seed-db] Failed to fetch ${category} page ${page}: ${msg}`);
    return [];
  }
}

async function main() {
  console.log('[seed-db] Starting Open Beauty Facts data import...');
  console.log(
    `[seed-db] Fetching from ${CATEGORIES.length} categories, ${PAGES_PER_CATEGORY} pages each.`,
  );

  const db = getDb();

  // Make script idempotent — clear existing data
  const existing = db.query<ProductRow, []>('SELECT COUNT(*) as count FROM products').get();
  if (existing && existing.count > 0) {
    console.log(`[seed-db] Clearing ${existing.count} existing products for fresh seed.`);
    db.run('DELETE FROM products');
  }

  const insert = db.prepare(
    'INSERT INTO products (name, brand, ingredients, category) VALUES ($name, $brand, $ingredients, $category)',
  );

  let totalInserted = 0;
  let totalFetched = 0;
  let totalSkipped = 0;
  const seenNames = new Set<string>();

  for (const category of CATEGORIES) {
    let categoryCount = 0;

    for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
      const products = await fetchCategory(category, page);
      totalFetched += products.length;

      if (products.length === 0) break; // No more pages

      const batch = db.transaction(() => {
        let batchCount = 0;
        for (const product of products) {
          // Must have a name and ingredients
          const name = product.product_name?.trim();
          const ingredients = (product.ingredients_text_en || product.ingredients_text)?.trim();

          if (!name || !ingredients || ingredients.length < 10) {
            totalSkipped++;
            continue;
          }

          // Deduplicate by name
          const key = name.toLowerCase();
          if (seenNames.has(key)) {
            totalSkipped++;
            continue;
          }
          seenNames.add(key);

          const brand = product.brands?.trim() || null;
          const cat = normalizeCategory(product.categories);

          insert.run({
            $name: name,
            $brand: brand,
            $ingredients: ingredients,
            $category: cat,
          });
          batchCount++;
        }
        return batchCount;
      });

      const inserted = batch() as number;
      categoryCount += inserted;
      totalInserted += inserted;
    }

    console.log(`[seed-db]   ${category}: +${categoryCount} products`);
  }

  console.log(`[seed-db] --- Import Summary ---`);
  console.log(`[seed-db]   Total fetched from API: ${totalFetched}`);
  console.log(`[seed-db]   Skipped (no ingredients/duplicates): ${totalSkipped}`);
  console.log(`[seed-db]   Inserted into DB: ${totalInserted}`);

  const verify = db.query<ProductRow, []>('SELECT COUNT(*) as count FROM products').get();
  console.log(`[seed-db]   Verified in DB: ${verify?.count ?? 0} products`);
  console.log(`[seed-db] Done. Database at: data/cosmetics.db`);

  db.close();
}

main().catch((err) => {
  console.error('[seed-db] Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
