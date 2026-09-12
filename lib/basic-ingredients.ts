import type { BrowserFood } from '@/lib/food-portions';

/** USDA FoodData Central, SR Legacy (April 2018), verified 2026-09-12.
 * Source: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
 * Public domain / CC0. All values per 100 g edible portion: energy kcal; macros g.
 * Nutrient IDs: 1008 energy, 1003 protein, 1005 carbohydrate, 1004 total lipid.
 * Egg weights come from the corresponding USDA foodPortions large / amount=1.
 * This reviewed snapshot needs no API key or runtime network access.
 */
export const basicIngredients: (BrowserFood & { fdcId: number; sourceDescription: string })[] = [
  {
    "id": "usda-171077",
    "name": "Chicken breast — raw, skinless, boneless",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 120,
      "protein_g": 22.5,
      "carbs_g": 0.0,
      "fat_g": 2.62
    },
    "fdcId": 171077,
    "sourceDescription": "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171077/nutrients"
  },
  {
    "id": "usda-171477",
    "name": "Chicken breast — cooked, roasted, meat only",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 165,
      "protein_g": 31.0,
      "carbs_g": 0.0,
      "fat_g": 3.57
    },
    "fdcId": 171477,
    "sourceDescription": "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171477/nutrients"
  },
  {
    "id": "usda-171287",
    "name": "Whole egg — raw",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 143,
      "protein_g": 12.6,
      "carbs_g": 0.72,
      "fat_g": 9.51
    },
    "fdcId": 171287,
    "sourceDescription": "Egg, whole, raw, fresh",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171287/nutrients",
    "portion": {
      "label": "1 large egg",
      "grams": 50.0
    }
  },
  {
    "id": "usda-172183",
    "name": "Egg white — raw",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 52.0,
      "protein_g": 10.9,
      "carbs_g": 0.73,
      "fat_g": 0.17
    },
    "fdcId": 172183,
    "sourceDescription": "Egg, white, raw, fresh",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/172183/nutrients",
    "portion": {
      "label": "1 large egg white",
      "grams": 33.0
    }
  },
  {
    "id": "usda-168878",
    "name": "White rice — cooked, long-grain",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 130,
      "protein_g": 2.69,
      "carbs_g": 28.2,
      "fat_g": 0.28
    },
    "fdcId": 168878,
    "sourceDescription": "Rice, white, long-grain, regular, enriched, cooked",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/168878/nutrients"
  },
  {
    "id": "usda-168877",
    "name": "White rice — raw, dry, long-grain",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 365,
      "protein_g": 7.13,
      "carbs_g": 80.0,
      "fat_g": 0.66
    },
    "fdcId": 168877,
    "sourceDescription": "Rice, white, long-grain, regular, raw, enriched",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/168877/nutrients"
  },
  {
    "id": "usda-169704",
    "name": "Brown rice — cooked, long-grain",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 123,
      "protein_g": 2.74,
      "carbs_g": 25.6,
      "fat_g": 0.97
    },
    "fdcId": 169704,
    "sourceDescription": "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/169704/nutrients"
  },
  {
    "id": "usda-169705",
    "name": "Oats — dry",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 389,
      "protein_g": 16.9,
      "carbs_g": 66.3,
      "fat_g": 6.9
    },
    "fdcId": 169705,
    "sourceDescription": "Oats (Includes foods for USDA's Food Distribution Program)",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/169705/nutrients"
  },
  {
    "id": "usda-170440",
    "name": "Potato — cooked, boiled, peeled, no salt",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 86.0,
      "protein_g": 1.71,
      "carbs_g": 20.0,
      "fat_g": 0.1
    },
    "fdcId": 170440,
    "sourceDescription": "Potatoes, boiled, cooked without skin, flesh, without salt",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/170440/nutrients"
  },
  {
    "id": "usda-168483",
    "name": "Sweet potato — cooked, baked flesh, no salt",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 90.0,
      "protein_g": 2.01,
      "carbs_g": 20.7,
      "fat_g": 0.15
    },
    "fdcId": 168483,
    "sourceDescription": "Sweet potato, cooked, baked in skin, flesh, without salt",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/168483/nutrients"
  },
  {
    "id": "usda-175168",
    "name": "Salmon — cooked, Atlantic farmed, dry heat",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 206,
      "protein_g": 22.1,
      "carbs_g": 0.0,
      "fat_g": 12.4
    },
    "fdcId": 175168,
    "sourceDescription": "Fish, salmon, Atlantic, farmed, cooked, dry heat",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/175168/nutrients"
  },
  {
    "id": "usda-171986",
    "name": "Tuna — canned in water, drained, no salt",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 116,
      "protein_g": 25.5,
      "carbs_g": 0.0,
      "fat_g": 0.82
    },
    "fdcId": 171986,
    "sourceDescription": "Fish, tuna, light, canned in water, without salt, drained solids",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171986/nutrients"
  },
  {
    "id": "usda-171792",
    "name": "Lean beef — cooked, pan-broiled, 95% lean",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 164,
      "protein_g": 25.8,
      "carbs_g": 0.0,
      "fat_g": 5.94
    },
    "fdcId": 171792,
    "sourceDescription": "Beef, ground, 95% lean meat / 5% fat, patty, cooked, pan-broiled",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171792/nutrients"
  },
  {
    "id": "usda-170894",
    "name": "Greek yogurt — plain, nonfat",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 59.0,
      "protein_g": 10.2,
      "carbs_g": 3.6,
      "fat_g": 0.39
    },
    "fdcId": 170894,
    "sourceDescription": "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/170894/nutrients"
  },
  {
    "id": "usda-171267",
    "name": "Milk — 2% fat, with vitamins A and D",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 50.0,
      "protein_g": 3.3,
      "carbs_g": 4.8,
      "fat_g": 1.98
    },
    "fdcId": 171267,
    "sourceDescription": "Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171267/nutrients"
  },
  {
    "id": "usda-172688",
    "name": "Whole-wheat bread — commercially prepared",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 252,
      "protein_g": 12.4,
      "carbs_g": 42.7,
      "fat_g": 3.5
    },
    "fdcId": 172688,
    "sourceDescription": "Bread, whole-wheat, commercially prepared",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/172688/nutrients"
  },
  {
    "id": "usda-171413",
    "name": "Olive oil",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 884,
      "protein_g": 0.0,
      "carbs_g": 0.0,
      "fat_g": 100
    },
    "fdcId": 171413,
    "sourceDescription": "Oil, olive, salad or cooking",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171413/nutrients"
  },
  {
    "id": "usda-173944",
    "name": "Banana — raw, peeled",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 89.0,
      "protein_g": 1.09,
      "carbs_g": 22.8,
      "fat_g": 0.33
    },
    "fdcId": 173944,
    "sourceDescription": "Bananas, raw",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/173944/nutrients"
  },
  {
    "id": "usda-171688",
    "name": "Apple — raw, with skin",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 52.0,
      "protein_g": 0.26,
      "carbs_g": 13.8,
      "fat_g": 0.17
    },
    "fdcId": 171688,
    "sourceDescription": "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/171688/nutrients"
  },
  {
    "id": "usda-170379",
    "name": "Broccoli — raw",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 34.0,
      "protein_g": 2.82,
      "carbs_g": 6.64,
      "fat_g": 0.37
    },
    "fdcId": 170379,
    "sourceDescription": "Broccoli, raw",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/170379/nutrients"
  },
  {
    "id": "usda-170393",
    "name": "Carrot — raw",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 41.0,
      "protein_g": 0.93,
      "carbs_g": 9.58,
      "fat_g": 0.24
    },
    "fdcId": 170393,
    "sourceDescription": "Carrots, raw",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/170393/nutrients"
  },
  {
    "id": "usda-168462",
    "name": "Spinach — raw",
    "kind": "ingredient",
    "basis": "100g",
    "nutrition": {
      "calories": 23.0,
      "protein_g": 2.86,
      "carbs_g": 3.63,
      "fat_g": 0.39
    },
    "fdcId": 168462,
    "sourceDescription": "Spinach, raw",
    "sourceUrl": "https://fdc.nal.usda.gov/food-details/168462/nutrients"
  }
];

export function searchBasicIngredients(query: string) {
  const search = query.trim().toLowerCase().replace(/\begg whites\b/g, 'egg white');
  return basicIngredients.filter(food => `${food.name} ${food.sourceDescription}`.toLowerCase().includes(search));
}
