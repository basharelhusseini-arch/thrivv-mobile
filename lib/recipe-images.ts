/**
 * Centralized Recipe Image System — single source of truth.
 *
 * All Unsplash photo IDs here have been verified to return HTTP 200.
 * Resolution order for getRecipeImage():
 *   1. Exact canonical slug match  (RECIPE_IMAGE_MAP)
 *   2. Keyword match on name + description + ingredients + tags
 *   3. Neutral food fallback (never blank, never broken)
 */

const BASE   = 'https://images.unsplash.com/photo-';
const PARAMS = '?w=900&h=600&auto=format&fit=crop&q=80';

function url(id: string) {
  return `${BASE}${id}${PARAMS}`;
}

// ---------------------------------------------------------------------------
// Verified photo IDs (all confirmed HTTP 200)
// ---------------------------------------------------------------------------
export const IMAGE_IDS = {
  // Seafood
  salmon:       '1467003909585-2f8a72700288',  // salmon + asparagus plate
  shrimpPasta:  '1565557623262-b51c2513a641',  // shrimp pasta bowl
  fishPlate:    '1559847844-5315695dadae',      // tuna / white fish plate
  whiteFish:    '1519708227418-c8fd9a32b7a2',  // baked white fish fillet

  // Chicken / poultry
  chickenBowl:  '1762631383846-6bead15b9796',  // grilled chicken rice bowl
  chickenWrap:  '1752095809096-f09d22c466c5',  // chicken wrap / burrito

  // Asian / teriyaki / stir-fry
  asianBowl:    '1732988978816-ce0c78c79f4c',  // teriyaki chicken noodle bowl

  // Beef / pork / steak
  steakMeat:    '1775481391371-fab83ed296e9',  // sliced grilled steak plate
  burger:       '1551183053-bf91a1d81141',      // burger patty

  // Pasta / Italian
  pasta:        '1621996346565-e3dbc646d9a9',  // pasta with marinara / pesto

  // Hearty stews / chili
  chili:        '1574672280600-4accfa5b6f98',  // chili / hearty stew bowl
  lentilStew:   '1588137378633-dea1336ce1e2',  // lentil & vegetable stew

  // Vegetarian
  curry:        '1455619452474-d2be8b1e70cd',  // chickpea / coconut curry
  sweetPotato:  '1543352634-a1c51d9f1fa7',     // sweet potato kale bowl
  mushroom:     '1506976785307-8732e854ad03',  // stuffed portobello / mushroom
  grainBowl:    '1623428187442-b633f414aedc',  // quinoa grain salad bowl

  // Breakfast
  pancakes:     '1488477181946-6428a0291777',  // protein pancakes / french toast
  eggs:         '1525351326368-efbb5cb6814d',  // scrambled eggs / egg bowl
  eggBake:      '1517673132405-a56a62b18caf',  // baked egg muffins
  smoothieBowl: '1654923064926-be7e64267a31',  // acai smoothie bowl with berries
} as const;

// ---------------------------------------------------------------------------
// Deterministic per-recipe map  (canonical slug → image ID)
// This is the authoritative source — update here to change any recipe image.
// ---------------------------------------------------------------------------
export const RECIPE_IMAGE_MAP: Record<string, string> = {
  // === CHICKEN ===
  'grilled-chicken-quinoa-bowl':     IMAGE_IDS.chickenBowl,
  'buffalo-chicken-lettuce-wraps':   IMAGE_IDS.chickenBowl,
  'chicken-pesto-wrap':              IMAGE_IDS.chickenWrap,
  'teriyaki-chicken-rice-bowl':      IMAGE_IDS.asianBowl,
  'mediterranean-chicken-bowl':      IMAGE_IDS.chickenBowl,
  'honey-mustard-chicken-veggies':   IMAGE_IDS.chickenBowl,
  'chicken-fajita-bowl':             IMAGE_IDS.asianBowl,
  'chicken-veggie-sheet-pan':        IMAGE_IDS.chickenWrap,
  'asian-chicken-lettuce-cups':      IMAGE_IDS.asianBowl,

  // === SEAFOOD ===
  'salmon-asparagus-plate':          IMAGE_IDS.salmon,
  'shrimp-cauliflower-rice':         IMAGE_IDS.shrimpPasta,
  'cajun-shrimp-pasta-bowl':         IMAGE_IDS.shrimpPasta,
  'tuna-cucumber-boats':             IMAGE_IDS.fishPlate,
  'tuna-avocado-toast':              IMAGE_IDS.salmon,
  'baked-cod-lemon-herbs':           IMAGE_IDS.whiteFish,
  'almond-crusted-tilapia':          IMAGE_IDS.whiteFish,
  'seared-tuna-sesame':              IMAGE_IDS.salmon,

  // === BEEF / PORK / BISON ===
  'steak-mushroom-butter':           IMAGE_IDS.steakMeat,
  'beef-burrito-bowl':               IMAGE_IDS.chili,
  'bison-burger-sweet-potato-fries': IMAGE_IDS.burger,
  'pork-chop-green-beans':           IMAGE_IDS.steakMeat,

  // === TURKEY ===
  'turkey-meatball-marinara':        IMAGE_IDS.pasta,
  'turkey-cheese-quesadilla':        IMAGE_IDS.chickenWrap,
  'turkey-chili-bowl':               IMAGE_IDS.chili,
  'turkey-cucumber-bites':           IMAGE_IDS.grainBowl,   // light/fresh appetizer

  // === PASTA ===
  'pesto-chicken-pasta':             IMAGE_IDS.pasta,

  // === VEGETARIAN / VEGAN ===
  'chickpea-spinach-curry':          IMAGE_IDS.curry,
  'black-bean-sweet-potato-bowl':    IMAGE_IDS.sweetPotato,
  'caprese-stuffed-portobello':      IMAGE_IDS.mushroom,
  'lentil-veggie-stew':              IMAGE_IDS.lentilStew,
  'greek-quinoa-salad':              IMAGE_IDS.grainBowl,
  'thai-peanut-tofu-bowl':           IMAGE_IDS.asianBowl,
  'moroccan-chickpea-couscous':      IMAGE_IDS.curry,
  'coconut-curry-lentils':           IMAGE_IDS.curry,
  'baked-sweet-potato-black-bean':   IMAGE_IDS.sweetPotato,
  'veggie-egg-fried-rice':           IMAGE_IDS.asianBowl,

  // === EGGS / BREAKFAST ===
  'egg-avocado-spinach':             IMAGE_IDS.eggs,
  'spinach-feta-egg-muffins':        IMAGE_IDS.eggBake,
  'breakfast-burrito-bowl':          IMAGE_IDS.eggs,
  'greek-yogurt-protein-pancakes':   IMAGE_IDS.pancakes,
  'protein-french-toast':            IMAGE_IDS.pancakes,
  'protein-smoothie-bowl':           IMAGE_IDS.smoothieBowl,
  'overnight-oats-pb-banana':        IMAGE_IDS.smoothieBowl,
  'apple-cinnamon-quinoa':           IMAGE_IDS.smoothieBowl,
  'cottage-cheese-berry-bowl':       IMAGE_IDS.smoothieBowl,

  // === SNACKS ===
  'protein-energy-balls':            IMAGE_IDS.grainBowl,
  'greek-yogurt-parfait':            IMAGE_IDS.smoothieBowl,
  'apple-almond-butter':             IMAGE_IDS.smoothieBowl,
  'edamame-sea-salt':                IMAGE_IDS.asianBowl,
  'protein-chia-pudding':            IMAGE_IDS.smoothieBowl,
};

// ---------------------------------------------------------------------------
// Keyword fallback for custom / unknown recipes
// More specific patterns come first to prevent wrong-category collisions.
// ---------------------------------------------------------------------------
const KEYWORD_IMAGE_MAP: Array<[RegExp, string]> = [
  // Sweet potato — must precede generic veg/bowl patterns
  [/sweet potato|yam/i,                                         IMAGE_IDS.sweetPotato],

  // Breakfast oats / porridge — must precede seafood to avoid "salmon" fallback
  [/overnight oats|porridge|oatmeal|\boats\b|chia pudding|breakfast quinoa/i, IMAGE_IDS.smoothieBowl],

  // Smoothie / yogurt / berry bowls
  [/smoothie|acai|parfait|yogurt|cottage cheese/i,              IMAGE_IDS.smoothieBowl],

  // Seafood — specific before generic
  [/salmon|halibut|omega.?3/i,                                  IMAGE_IDS.salmon],
  [/shrimp|prawn/i,                                             IMAGE_IDS.shrimpPasta],
  [/\btuna\b/i,                                                 IMAGE_IDS.fishPlate],
  [/cod|tilapia|sea.?bass|white fish|mahi/i,                    IMAGE_IDS.whiteFish],
  [/fish|seafood|lobster|crab|scallop/i,                        IMAGE_IDS.salmon],

  // Beef / steak — specific before generic
  [/ribeye|sirloin|steak|bison|wagyu/i,                         IMAGE_IDS.steakMeat],
  [/burger|patty/i,                                             IMAGE_IDS.burger],
  [/beef|ground beef|chuck|brisket/i,                           IMAGE_IDS.chili],

  // Pork
  [/pork|ham|bacon|prosciutto|chorizo/i,                        IMAGE_IDS.steakMeat],

  // Chicken
  [/chicken|poultry|rotisserie/i,                               IMAGE_IDS.chickenBowl],
  [/turkey/i,                                                   IMAGE_IDS.chili],

  // Tofu / plant protein
  [/tofu|tempeh|seitan/i,                                       IMAGE_IDS.asianBowl],

  // Curry / spiced dishes
  [/curry|masala|tikka|dahl|dal|korma/i,                        IMAGE_IDS.curry],
  [/chili|chilli|stew|soup/i,                                   IMAGE_IDS.chili],

  // Pasta / noodles
  [/pasta|spaghetti|penne|linguine|fusilli|noodle|ramen|pesto|marinara/i, IMAGE_IDS.pasta],

  // Wraps / flatbread / quesadilla
  [/quesadilla|wrap|burrito|tortilla|taco/i,                    IMAGE_IDS.chickenWrap],

  // Salad / cucumber / fresh bowls — after seafood to prevent wrong salmon match
  [/salad|slaw|coleslaw|cucumber/i,                             IMAGE_IDS.grainBowl],

  // Mushroom
  [/mushroom|portobello/i,                                      IMAGE_IDS.mushroom],

  // Lentils / legumes
  [/lentil|chickpea|hummus/i,                                   IMAGE_IDS.lentilStew],

  // Eggs
  [/egg|omelette|frittata|quiche|scramble/i,                    IMAGE_IDS.eggs],

  // Breakfast items
  [/pancake|waffle|crepe|french toast|\btoast\b/i,              IMAGE_IDS.pancakes],

  // Rice / grain / Asian
  [/\brice\b|fried rice|grain bowl|teriyaki|asian|stir.?fry/i,  IMAGE_IDS.asianBowl],

  // Mediterranean
  [/mediterranean|greek|falafel|tzatziki|couscous/i,            IMAGE_IDS.curry],
];

// ---------------------------------------------------------------------------
// Public types & API
// ---------------------------------------------------------------------------
export interface RecipeLike {
  id?: string;
  name: string;
  description?: string;
  ingredients?: { item: string }[];
  tags?: string[];
}

export type ImageMatchType = 'exact' | 'keyword' | 'fallback';

/**
 * Resolve the best image for any recipe.
 *
 * Returns imageUrl, imageId, and matchType for optional debug logging.
 */
export function getRecipeImage(recipe: RecipeLike): {
  imageUrl: string;
  imageId: string;
  matchType: ImageMatchType;
} {
  // 1. Exact slug match
  if (recipe.id && RECIPE_IMAGE_MAP[recipe.id]) {
    const id = RECIPE_IMAGE_MAP[recipe.id];
    return { imageUrl: url(id), imageId: id, matchType: 'exact' };
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
      return { imageUrl: url(imageId), imageId, matchType: 'keyword' };
    }
  }

  // 3. Neutral fallback — warm, generic food bowl
  const fallbackId = IMAGE_IDS.curry;
  return { imageUrl: url(fallbackId), imageId: fallbackId, matchType: 'fallback' };
}

/** Stable fallback URL for onError handlers — guaranteed 200. */
export const FALLBACK_IMAGE_URL = url(IMAGE_IDS.curry);
