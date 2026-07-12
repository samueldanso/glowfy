/**
 * Seed script: creates data/cosmetics.db and inserts 20 sample products.
 * Run with: bun run src/data/seed-db.ts
 */

import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'cosmetics.db');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  brand      TEXT,
  ingredients TEXT,
  category   TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
`;

const SAMPLE_PRODUCTS = [
  {
    name: 'Daily Hydrating Gel Moisturizer',
    brand: 'ClearSkin Labs',
    category: 'moisturizer',
    ingredients:
      'Water, Glycerin, Sodium Hyaluronate, Niacinamide, Panthenol, Xanthan Gum, Phenoxyethanol, Carbomer, Sodium Hydroxide, Allantoin, Centella Asiatica Extract, Tocopherol',
  },
  {
    name: 'Brightening Vitamin C Serum',
    brand: 'LuminaLab',
    category: 'serum',
    ingredients:
      'Water, Ascorbic Acid, Glycerin, Ferulic Acid, Tocopherol, Sodium Hyaluronate, Panthenol, Triethanolamine, Sodium Benzoate, Potassium Sorbate',
  },
  {
    name: 'Retinol Night Cream',
    brand: 'AgeLess Apothecary',
    category: 'night cream',
    ingredients:
      'Water, Caprylic/Capric Triglyceride, Cetyl Alcohol, Glycerin, Retinol, Squalane, Cetearyl Alcohol, Glyceryl Stearate, Phenoxyethanol, Tocopheryl Acetate, Allantoin, Sodium Hyaluronate',
  },
  {
    name: 'Mineral SPF 50 Sunscreen',
    brand: 'SolarShield',
    category: 'sunscreen',
    ingredients:
      'Zinc Oxide 22%, Water, Caprylic/Capric Triglyceride, Glycerin, Xanthan Gum, Dimethicone, Cetyl Alcohol, Phenoxyethanol, Tocopherol, Allantoin',
  },
  {
    name: 'Salicylic Acid Acne Cleanser',
    brand: 'ClearPore Co.',
    category: 'cleanser',
    ingredients:
      'Water, Salicylic Acid, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, Niacinamide, Panthenol, Sodium Benzoate, Citric Acid, Sodium Chloride',
  },
  {
    name: 'Barrier Repair Ceramide Cream',
    brand: 'SkinBarrier Rx',
    category: 'moisturizer',
    ingredients:
      'Water, Caprylic/Capric Triglyceride, Ceramide NP, Ceramide AP, Ceramide EOP, Cholesterol, Glycerin, Petrolatum, Cetearyl Alcohol, Dimethicone, Phenoxyethanol, Sodium Hyaluronate, Niacinamide',
  },
  {
    name: 'Gentle Foaming Face Wash',
    brand: 'SoftCleanse',
    category: 'cleanser',
    ingredients:
      'Water, Decyl Glucoside, Glycerin, Panthenol, Allantoin, Xanthan Gum, Citric Acid, Sodium Benzoate, Potassium Sorbate',
  },
  {
    name: 'Azelaic Acid Brightening Cream',
    brand: 'GlowRx',
    category: 'treatment',
    ingredients:
      'Water, Azelaic Acid, Glycerin, Cetyl Alcohol, Squalane, Niacinamide, Allantoin, Panthenol, Carbomer, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin',
  },
  {
    name: 'Hydrating Rose Hip Face Oil',
    brand: 'PureBloom Beauty',
    category: 'facial oil',
    ingredients:
      'Rosa Canina Fruit Oil, Argania Spinosa Kernel Oil, Sclerocarya Birrea Seed Oil, Tocopherol',
  },
  {
    name: 'Chemical Exfoliating Toner',
    brand: 'AlphaGlow',
    category: 'toner',
    ingredients:
      'Water, Glycolic Acid, Lactic Acid, Glycerin, Panthenol, Sodium Hydroxide, Allantoin, Niacinamide, Sodium Benzoate',
  },
  {
    name: 'Collagen Peptide Eye Cream',
    brand: 'EyeRevive',
    category: 'eye cream',
    ingredients:
      'Water, Glycerin, Matrixyl, Palmitoyl Tripeptide-1, Adenosine, Caffeine, Sodium Hyaluronate, Dimethicone, Cetyl Alcohol, Phenoxyethanol, Panthenol',
  },
  {
    name: 'Niacinamide + Zinc Sebum Control Serum',
    brand: 'MattiFy Labs',
    category: 'serum',
    ingredients:
      'Water, Niacinamide, Zinc PCA, Glycerin, Sodium Hyaluronate, Panthenol, Allantoin, Carbomer, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin',
  },
  {
    name: 'Sensitive Skin Moisturizer',
    brand: 'CalmDerm',
    category: 'moisturizer',
    ingredients:
      'Water, Glycerin, Butylene Glycol, Centella Asiatica Extract, Panthenol, Allantoin, Xanthan Gum, Sodium Hyaluronate, Potassium Sorbate, Sodium Benzoate, Citric Acid',
  },
  {
    name: 'Hydrating Sheet Mask',
    brand: 'GlowLeaf',
    category: 'mask',
    ingredients:
      'Water, Glycerin, Sodium Hyaluronate Crosspolymer, Panthenol, Niacinamide, Allantoin, Sodium PCA, Betaine, Adenosine, Sodium Benzoate',
  },
  {
    name: 'SPF 30 Daily Moisturizer',
    brand: 'EveryDay Defense',
    category: 'moisturizer with SPF',
    ingredients:
      'Water, Ethylhexyl Methoxycinnamate, Titanium Dioxide, Glycerin, Dimethicone, Cetyl Alcohol, Niacinamide, Sodium Hyaluronate, Phenoxyethanol, Tocopheryl Acetate, Allantoin',
  },
  {
    name: 'Benzoyl Peroxide Spot Treatment',
    brand: 'ClearSpot Rx',
    category: 'spot treatment',
    ingredients: 'Benzoyl Peroxide, Water, Carbomer, Sodium Hydroxide, Glycerin, Allantoin',
  },
  {
    name: 'Antioxidant Vitamin C + E Serum',
    brand: 'RadianceRx',
    category: 'serum',
    ingredients:
      'Water, Ascorbic Acid, Tocopherol, Ferulic Acid, Resveratrol, Glycerin, Sodium Hyaluronate, Panthenol, Citric Acid, Sodium Benzoate',
  },
  {
    name: 'Deep Cleansing Clay Mask',
    brand: 'PureClay',
    category: 'mask',
    ingredients:
      'Water, Kaolin, Bentonite, Glycerin, Zinc Oxide, Allantoin, Panthenol, Sodium Benzoate, Potassium Sorbate, Citric Acid',
  },
  {
    name: 'Overnight Renewal Sleeping Mask',
    brand: 'NightBloom',
    category: 'sleeping mask',
    ingredients:
      'Water, Glycerin, Squalane, Sodium Hyaluronate, Bakuchiol, Ceramide NP, Niacinamide, Panthenol, Centella Asiatica Extract, Adenosine, Xanthan Gum, Phenoxyethanol, Tocopherol',
  },
  {
    name: 'Hydrating Micellar Water Cleanser',
    brand: 'MicellaClean',
    category: 'cleanser',
    ingredients:
      'Water, Glycerin, Polysorbate 20, Panthenol, Allantoin, Sodium Benzoate, Citric Acid',
  },
];

interface ProductRow {
  count: number;
}

function main() {
  console.log('[seed-db] Creating data directory at:', DB_DIR);

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH, { create: true });
  db.run('PRAGMA journal_mode = WAL');
  db.exec(SCHEMA_SQL);

  console.log('[seed-db] Schema created/verified.');

  // Make script idempotent — clear existing data
  const existing = db.query<ProductRow, []>('SELECT COUNT(*) as count FROM products').get();
  if (existing && existing.count > 0) {
    console.log(`[seed-db] Clearing ${existing.count} existing products for fresh seed.`);
    db.run('DELETE FROM products');
  }

  const insert = db.prepare(
    'INSERT INTO products (name, brand, ingredients, category) VALUES ($name, $brand, $ingredients, $category)',
  );

  const insertMany = db.transaction(() => {
    let count = 0;
    for (const product of SAMPLE_PRODUCTS) {
      insert.run({
        $name: product.name,
        $brand: product.brand,
        $ingredients: product.ingredients,
        $category: product.category,
      });
      count++;
    }
    return count;
  });

  const inserted = insertMany() as number;
  console.log(`[seed-db] Inserted ${inserted} sample products into ${DB_PATH}`);

  const verify = db.query<ProductRow, []>('SELECT COUNT(*) as count FROM products').get();
  console.log(`[seed-db] Verified: ${verify?.count ?? 0} products in DB. Done.`);

  db.close();
}

main();
