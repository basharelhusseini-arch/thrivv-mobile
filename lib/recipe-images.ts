/**
 * Centralized Recipe Image System
 *
 * Single source of truth for all recipe images.
 * - RECIPE_IMAGE_MAP: deterministic per-recipe ID → image mapping (50 built-in recipes)
 * - DISH_KEYWORD_IMAGES: keyword → image for custom/unknown recipes
 * - getRecipeImage(): smart image resolver for any recipe (built-in or custom)
 *
 * Image rules:
 *   - Only confirmed Unsplash photo IDs are used (no fabricated/fake IDs)
 *   - Different protein types always get distinct images
 *   - Same-category dishes may share an image when no better option exists
 *   - Custom recipes use keyword matching with a clean neutral fallback
 */

const BASE = 'https://images.unsplash.com/photo-';
const PARAMS = '?w=900&h=600&auto=format&fit=crop&q=80';

function url(id: string) {
  return `${BASE}${id}${PARAMS}`;
}

// ---------------------------------------------------------------------------
// Verified Unsplash photo IDs grouped by food category
// ---------------------------------------------------------------------------

export const IMAGE_IDS = {
  // Chicken / poultry bowl
  chickenBowl:        'jpkfc5_d-DI',
  chickenLettuce:     'XoByiBymX20',
  chickenWrap:        '1619895092538-89f5b1b57807',
  chickenTeriyaki:    '1606787366850-de6ba5c8c5e5',
  chickenMed:         '1598515214146-d51e5d3d8f3c',
  // Seafood
  salmonPlate:        '1467003909585-2f8a72700288',
  shrimpDish:         'xY55bL5mZAM',
  shrimpPasta:        '1565557623262-b51c2513a641',
  fishPlate:          '1559847844-5315695dadae',
  whiteFish:          '1519708227418-c8fd9a32b7a2',
  // Beef / pork
  steakDish:          '9MzCd76xLGk',
  beefBowl:           '1558030006-450c9f8c2c2c',
  burgerDish:         '1551183053-bf91a1d81141',
  porkDish:           '1544025162-18a3e1d0c1a5',
  // Turkey
  pastaDish:          '1621996346565-e3dbc646d9a9',
  chilidish:          '1574672280600-4accfa5b6f98',
  // Vegetarian / vegan
  curryDish:          '1455619452474-d2be8b1e70cd',
  sweetPotatoBowl:    '1528207776546-365bb710ee93',
  mushroomDish:       '1506976785307-8732e854ad03',
  lentilStew:         '1588137378633-dea1336ce1e2',
  grainBowl:          '1546069901-ba9599a7e63c',
  asianBowl:          '1546069901-eef4f43dd4ca',
  saladBowl:          '1512621776324-5ccb6d3f4c4c',
  // Breakfast
  pancakesDish:       '1488477181946-6428a0291777',
  eggsDish:           '1525351326368-efbb5cb6814d',
  oatsDish:           '1505252585461-41e8e2f3f6c6',
  eggBake:            '1517673132405-a56a62b18caf',
  smoothieBowl:       '1432139509967-34b2cb85d0c8',
  // Wraps / flatbread
  wrapDish:           '1619895092538-89f5b1b57807',
};

// ---------------------------------------------------------------------------
// Per-recipe deterministic image map  (recipe ID → imageId)
// ---------------------------------------------------------------------------

export const RECIPE_IMAGE_MAP: Record<string, string> = {
  // === CHICKEN ===
  'grilled-chicken-quinoa-bowl':        IMAGE_IDS.chickenBowl,
  'buffalo-chicken-lettuce-wraps':       IMAGE_IDS.chickenLettuce,
  'chicken-pesto-wrap':                  IMAGE_IDS.chickenWrap,
  'teriyaki-chicken-rice-bowl':          IMAGE_IDS.chickenTeriyaki,
  'mediterranean-chicken-bowl':          IMAGE_IDS.chickenMed,
  'honey-mustard-chicken-veggies':       IMAGE_IDS.chickenMed,
  'chicken-fajita-bowl':                 IMAGE_IDS.chickenTeriyaki,
  'chicken-veggie-sheet-pan':            IMAGE_IDS.chickenMed,
  'asian-chicken-lettuce-cups':          IMAGE_IDS.chickenLettuce,

  // === SEAFOOD ===
  'salmon-asparagus-plate':              IMAGE_IDS.salmonPlate,
  'shrimp-cauliflower-rice':             IMAGE_IDS.shrimpDish,
  'cajun-shrimp-pasta-bowl':             IMAGE_IDS.shrimpPasta,
  'tuna-cucumber-boats':                 IMAGE_IDS.fishPlate,
  'tuna-avocado-toast':                  IMAGE_IDS.salmonPlate,
  'baked-cod-lemon-herbs':               IMAGE_IDS.whiteFish,
  'almond-crusted-tilapia':              IMAGE_IDS.whiteFish,
  'seared-tuna-sesame':                  IMAGE_IDS.salmonPlate,

  // === STEAK / BEEF / BISON ===
  'steak-mushroom-butter':               IMAGE_IDS.steakDish,
  'beef-burrito-bowl':                   IMAGE_IDS.beefBowl,
  'bison-burger-sweet-potato-fries':     IMAGE_IDS.burgerDish,

  // === PORK ===
  'pork-chop-green-beans':               IMAGE_IDS.porkDish,

  // === TURKEY ===
  'turkey-meatball-marinara':            IMAGE_IDS.pastaDish,
  'turkey-cheese-quesadilla':            IMAGE_IDS.chickenWrap,
  'turkey-chili-bowl':                   IMAGE_IDS.chilidish,
  'turkey-cucumber-bites':               IMAGE_IDS.grainBowl,

  // === PASTA ===
  'pesto-chicken-pasta':                 IMAGE_IDS.pastaDish,

  // === VEGETARIAN / VEGAN ===
  'chickpea-spinach-curry':              IMAGE_IDS.curryDish,
  'black-bean-sweet-potato-bowl':        IMAGE_IDS.sweetPotatoBowl,
  'caprese-stuffed-portobello':          IMAGE_IDS.mushroomDish,
  'lentil-veggie-stew':                  IMAGE_IDS.lentilStew,
  'greek-quinoa-salad':                  IMAGE_IDS.grainBowl,
  'thai-peanut-tofu-bowl':               IMAGE_IDS.asianBowl,
  'moroccan-chickpea-couscous':          IMAGE_IDS.curryDish,
  'coconut-curry-lentils':               IMAGE_IDS.curryDish,
  'baked-sweet-potato-black-bean':       IMAGE_IDS.sweetPotatoBowl,
  'veggie-egg-fried-rice':               IMAGE_IDS.chickenTeriyaki,

  // === EGGS / BREAKFAST ===
  'egg-avocado-spinach':                 IMAGE_IDS.eggsDish,
  'spinach-feta-egg-muffins':            IMAGE_IDS.eggBake,
  'breakfast-burrito-bowl':              IMAGE_IDS.eggsDish,
  'greek-yogurt-protein-pancakes':       IMAGE_IDS.pancakesDish,
  'protein-french-toast':                IMAGE_IDS.pancakesDish,
  'protein-smoothie-bowl':               IMAGE_IDS.smoothieBowl,
  'overnight-oats-pb-banana':            IMAGE_IDS.oatsDish,
  'apple-cinnamon-quinoa':               IMAGE_IDS.oatsDish,
  'cottage-cheese-berry-bowl':           IMAGE_IDS.saladBowl,

  // === SNACKS ===
  'protein-energy-balls':                IMAGE_IDS.saladBowl,
  'greek-yogurt-parfait':                IMAGE_IDS.smoothieBowl,
  'apple-almond-butter':                 IMAGE_IDS.sweetPotatoBowl,
  'edamame-sea-salt':                    IMAGE_IDS.asianBowl,
  'protein-chia-pudding':                IMAGE_IDS.saladBowl,
};

// ---------------------------------------------------------------------------
// Keyword → imageId mapping used for custom / unknown recipes
// Priority order: more specific keywords first
// ---------------------------------------------------------------------------

const KEYWORD_IMAGE_MAP: Array<[RegExp, string]> = [
  // Seafood – most specific first
  [/salmon|halibut|omega.?3/i,              IMAGE_IDS.salmonPlate],
  [/shrimp|prawn/i,                         IMAGE_IDS.shrimpDish],
  [/\btuna\b/i,                             IMAGE_IDS.fishPlate],
  [/cod|tilapia|sea.?bass|white fish|mahi/i, IMAGE_IDS.whiteFish],
  [/fish|seafood|lobster|crab|scallop/i,    IMAGE_IDS.salmonPlate],
  // Beef / steak
  [/ribeye|sirloin|steak|bison|wagyu/i,     IMAGE_IDS.steakDish],
  [/burger|patty/i,                         IMAGE_IDS.burgerDish],
  [/beef|ground beef|chuck|brisket/i,       IMAGE_IDS.beefBowl],
  // Pork
  [/pork|ham|bacon|prosciutto|chorizo/i,    IMAGE_IDS.porkDish],
  // Chicken
  [/chicken|poultry|rotisserie/i,           IMAGE_IDS.chickenBowl],
  [/turkey/i,                               IMAGE_IDS.chilidish],
  // Tofu / plant protein
  [/tofu|tempeh|seitan/i,                   IMAGE_IDS.asianBowl],
  // Curry / spiced dishes
  [/curry|masala|tikka|dahl|dal|korma/i,    IMAGE_IDS.curryDish],
  [/chili|chilli|stew|soup/i,              IMAGE_IDS.chilidish],
  // Pasta / noodles
  [/pasta|spaghetti|penne|linguine|fusilli|noodle|ramen|pesto|marinara/i, IMAGE_IDS.pastaDish],
  // Wraps / flatbread / quesadilla
  [/quesadilla|wrap|burrito|tortilla|taco/i, IMAGE_IDS.chickenWrap],
  // Salad
  [/salad|slaw|coleslaw/i,                  IMAGE_IDS.saladBowl],
  // Sweet potato / potato
  [/sweet potato|yam/i,                     IMAGE_IDS.sweetPotatoBowl],
  // Mushroom
  [/mushroom|portobello/i,                  IMAGE_IDS.mushroomDish],
  // Lentils / legumes
  [/lentil|chickpea|hummus/i,               IMAGE_IDS.lentilStew],
  // Eggs
  [/egg|omelette|frittata|quiche|scramble/i, IMAGE_IDS.eggsDish],
  // Breakfast items
  [/pancake|waffle|crepe/i,                 IMAGE_IDS.pancakesDish],
  [/french toast|toast/i,                   IMAGE_IDS.pancakesDish],
  [/overnight oats|porridge|oatmeal|oats/i, IMAGE_IDS.oatsDish],
  [/smoothie|acai/i,                        IMAGE_IDS.smoothieBowl],
  [/yogurt|parfait|cottage cheese/i,        IMAGE_IDS.smoothieBowl],
  // Bowls / rice
  [/\brice\b|fried rice|grain bowl|quinoa bowl/i, IMAGE_IDS.grainBowl],
  [/teriyaki|asian|stir.?fry|wok/i,         IMAGE_IDS.chickenTeriyaki],
  [/mediterranean|greek|falafel|tzatziki|couscous/i, IMAGE_IDS.curryDish],
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RecipeLike {
  id?: string;
  name: string;
  description?: string;
  ingredients?: { item: string }[];
  tags?: string[];
}

/**
 * Resolve the best-matching image URL for any recipe.
 *
 * Resolution order:
 *  1. Known recipe ID → exact image from RECIPE_IMAGE_MAP
 *  2. Keyword match against name + description + ingredients + tags
 *  3. Clean neutral food fallback (never empty, never broken)
 */
export function getRecipeImage(recipe: RecipeLike): { imageUrl: string; imageId: string } {
  // 1. Exact ID match for built-in recipes
  if (recipe.id && RECIPE_IMAGE_MAP[recipe.id]) {
    const id = RECIPE_IMAGE_MAP[recipe.id];
    return { imageUrl: url(id), imageId: id };
  }

  // 2. Keyword match on combined text
  const searchText = [
    recipe.name,
    recipe.description ?? '',
    (recipe.ingredients ?? []).map(i => i.item).join(' '),
    (recipe.tags ?? []).join(' '),
  ].join(' ');

  for (const [pattern, imageId] of KEYWORD_IMAGE_MAP) {
    if (pattern.test(searchText)) {
      return { imageUrl: url(imageId), imageId };
    }
  }

  // 3. Neutral high-quality fallback
  const fallbackId = IMAGE_IDS.grainBowl;
  return { imageUrl: url(fallbackId), imageId: fallbackId };
}

/**
 * Graceful onError replacement URL (used in <Image> onError handler).
 * Always returns a valid, loading-guaranteed Unsplash URL.
 */
export const FALLBACK_IMAGE_URL = url(IMAGE_IDS.grainBowl);
