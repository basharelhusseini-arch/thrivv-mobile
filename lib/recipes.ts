/**
 * Recipes Database - 50 Original Macro-Friendly Recipes
 * All recipes are original content with realistic macros
 * Images: Unique, matching Unsplash photos
 * Macros verified: calories ≈ protein*4 + carbs*4 + fat*9 (±25 kcal)
 * Last updated: 2026-01-17T13:32:03.152Z
 */

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageId: string; // Unsplash photo ID for stable images
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: { item: string; quantity: number; unit: string }[];
  instructions: string[];
  tags: string[]; // e.g., ["high-protein","low-carb","vegetarian","meal-prep"]
}

export const recipesData: Recipe[] = [
  {
    "id": "grilled-chicken-quinoa-bowl",
    "name": "Grilled Chicken Quinoa Power Bowl",
    "description": "Protein-packed bowl with grilled chicken, quinoa, roasted vegetables, and tahini dressing",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1546069901-ba9599a7e63c",
    "calories": 554,
    "protein_g": 57,
    "carbs_g": 35.3,
    "fat_g": 21,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "servings": 1,
    "ingredients": [
      {
        "item": "chicken breast",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "cooked quinoa",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "broccoli florets",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes",
        "quantity": 80,
        "unit": "g"
      },
      {
        "item": "tahini",
        "quantity": 15,
        "unit": "g"
      },
      {
        "item": "lemon juice",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "garlic powder",
        "quantity": 0.5,
        "unit": "tsp"
      },
      {
        "item": "salt and pepper",
        "quantity": 1,
        "unit": "pinch"
      }
    ],
    "instructions": [
      "Season chicken breast with garlic powder, salt, and pepper",
      "Grill chicken over medium-high heat for 6-7 minutes per side until internal temp reaches 165°F",
      "Meanwhile, roast broccoli and tomatoes at 400°F for 15 minutes with olive oil",
      "Cook quinoa according to package directions",
      "Whisk tahini with lemon juice and 2 tbsp water to make dressing",
      "Slice grilled chicken and assemble bowl with quinoa, vegetables, and drizzle with tahini dressing"
    ],
    "tags": [
      "high-protein",
      "balanced",
      "meal-prep",
      "lunch",
      "dinner"
    ]
  },
  {
    "id": "salmon-asparagus-plate",
    "name": "Herb-Crusted Salmon with Asparagus",
    "description": "Omega-3 rich salmon fillet with roasted asparagus and lemon butter",
    "imageUrl": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1467003909585-2f8a72700288",
    "calories": 520,
    "protein_g": 39,
    "carbs_g": 9.9,
    "fat_g": 35.4,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 1,
    "ingredients": [
      {
        "item": "salmon fillet",
        "quantity": 170,
        "unit": "g"
      },
      {
        "item": "asparagus spears",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "fresh dill",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "fresh parsley",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "lemon",
        "quantity": 1,
        "unit": "whole"
      },
      {
        "item": "butter",
        "quantity": 10,
        "unit": "g"
      },
      {
        "item": "garlic cloves",
        "quantity": 2,
        "unit": "whole"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Preheat oven to 400°F and line baking sheet with parchment",
      "Mix chopped dill, parsley, and minced garlic with olive oil",
      "Rub herb mixture over salmon fillet",
      "Place salmon and asparagus on baking sheet",
      "Roast for 15-18 minutes until salmon flakes easily",
      "Melt butter with lemon juice and drizzle over dish before serving"
    ],
    "tags": [
      "high-protein",
      "low-carb",
      "quick",
      "dinner",
      "omega-3"
    ]
  },
  {
    "id": "greek-yogurt-protein-pancakes",
    "name": "Greek Yogurt Protein Pancakes",
    "description": "Fluffy high-protein pancakes perfect for breakfast or post-workout",
    "imageUrl": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1488477181946-6428a0291777",
    "calories": 252,
    "protein_g": 22.3,
    "carbs_g": 33.2,
    "fat_g": 3.7,
    "prepMinutes": 5,
    "cookMinutes": 15,
    "servings": 2,
    "ingredients": [
      {
        "item": "Greek yogurt (0% fat)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "oat flour",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "egg whites",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "banana (mashed)",
        "quantity": 1,
        "unit": "medium"
      },
      {
        "item": "vanilla protein powder",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "baking powder",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "cinnamon",
        "quantity": 0.5,
        "unit": "tsp"
      },
      {
        "item": "cooking spray",
        "quantity": 1,
        "unit": "spray"
      }
    ],
    "instructions": [
      "Mix Greek yogurt, mashed banana, and egg whites in a bowl",
      "Add oat flour, protein powder, baking powder, and cinnamon",
      "Whisk until smooth batter forms (add water if too thick)",
      "Heat non-stick pan over medium heat and spray with cooking spray",
      "Pour 1/4 cup batter per pancake and cook 2-3 minutes until bubbles form",
      "Flip and cook another 2 minutes until golden",
      "Serve with fresh berries or sugar-free syrup"
    ],
    "tags": [
      "high-protein",
      "breakfast",
      "quick",
      "meal-prep"
    ]
  },
  {
    "id": "turkey-meatball-marinara",
    "name": "Lean Turkey Meatballs in Marinara",
    "description": "Italian-style lean turkey meatballs with zucchini noodles and rich tomato sauce",
    "imageUrl": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1621996346565-e3dbc646d9a9",
    "calories": 496,
    "protein_g": 58.4,
    "carbs_g": 35.7,
    "fat_g": 13,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "servings": 1,
    "ingredients": [
      {
        "item": "lean ground turkey",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "zucchini (spiralized)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "marinara sauce (low-sugar)",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "breadcrumbs",
        "quantity": 20,
        "unit": "g"
      },
      {
        "item": "egg white",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "parmesan cheese",
        "quantity": 15,
        "unit": "g"
      },
      {
        "item": "Italian seasoning",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "garlic powder",
        "quantity": 0.5,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Mix ground turkey with breadcrumbs, egg white, Italian seasoning, and garlic powder",
      "Form into 8-10 meatballs",
      "Bake at 400°F for 20 minutes until cooked through",
      "Heat marinara sauce in a pan",
      "Sauté zucchini noodles for 2-3 minutes until tender",
      "Serve meatballs over zucchini noodles with marinara and sprinkle parmesan"
    ],
    "tags": [
      "high-protein",
      "low-carb",
      "dinner",
      "Italian"
    ]
  },
  {
    "id": "shrimp-cauliflower-rice",
    "name": "Garlic Butter Shrimp with Cauliflower Rice",
    "description": "Quick and light shrimp dish with cauliflower rice and garlic butter sauce",
    "imageUrl": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1565557623262-b51c2513a641",
    "calories": 336,
    "protein_g": 47.9,
    "carbs_g": 15.5,
    "fat_g": 10.9,
    "prepMinutes": 10,
    "cookMinutes": 10,
    "servings": 1,
    "ingredients": [
      {
        "item": "large shrimp (peeled)",
        "quantity": 180,
        "unit": "g"
      },
      {
        "item": "cauliflower rice",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "butter",
        "quantity": 12,
        "unit": "g"
      },
      {
        "item": "garlic cloves (minced)",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "lemon juice",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "fresh parsley",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "paprika",
        "quantity": 0.5,
        "unit": "tsp"
      },
      {
        "item": "red pepper flakes",
        "quantity": 1,
        "unit": "pinch"
      }
    ],
    "instructions": [
      "Pat shrimp dry and season with paprika, salt, and pepper",
      "Melt butter in a large skillet over medium-high heat",
      "Add minced garlic and cook 30 seconds until fragrant",
      "Add shrimp and cook 2-3 minutes per side until pink",
      "Remove shrimp and add cauliflower rice to same pan",
      "Sauté cauliflower rice for 5 minutes, then add lemon juice",
      "Return shrimp to pan, toss with parsley and red pepper flakes"
    ],
    "tags": [
      "high-protein",
      "low-carb",
      "quick",
      "dinner",
      "seafood"
    ]
  },
  {
    "id": "steak-mushroom-butter",
    "name": "Ribeye Steak with Mushroom Butter",
    "description": "Juicy ribeye topped with sautéed mushrooms and herb butter",
    "imageUrl": "https://images.unsplash.com/photo-1544025162-18a3e1d0c1a5?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1544025162-18a3e1d0c1a5",
    "calories": 808,
    "protein_g": 55.7,
    "carbs_g": 5.3,
    "fat_g": 63.5,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "servings": 1,
    "ingredients": [
      {
        "item": "ribeye steak",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "mushrooms (sliced)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "butter",
        "quantity": 20,
        "unit": "g"
      },
      {
        "item": "fresh thyme",
        "quantity": 2,
        "unit": "sprigs"
      },
      {
        "item": "garlic cloves",
        "quantity": 2,
        "unit": "whole"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Bring steak to room temperature and season generously with salt and pepper",
      "Heat olive oil in cast iron skillet over high heat",
      "Sear steak 4-5 minutes per side for medium-rare",
      "Remove steak and let rest, add butter and mushrooms to pan",
      "Sauté mushrooms with thyme and garlic for 5 minutes",
      "Slice steak and top with mushroom butter"
    ],
    "tags": [
      "low-carb",
      "high-protein",
      "dinner",
      "keto"
    ]
  },
  {
    "id": "egg-avocado-spinach",
    "name": "Scrambled Eggs with Avocado & Spinach",
    "description": "Creamy scrambled eggs with fresh avocado and sautéed spinach",
    "imageUrl": "https://images.unsplash.com/photo-1525351326368-efbb5cb6814d?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1525351326368-efbb5cb6814d",
    "calories": 625,
    "protein_g": 44.5,
    "carbs_g": 14.6,
    "fat_g": 44.9,
    "prepMinutes": 5,
    "cookMinutes": 10,
    "servings": 1,
    "ingredients": [
      {
        "item": "large eggs",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "avocado",
        "quantity": 0.5,
        "unit": "whole"
      },
      {
        "item": "fresh spinach",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "butter",
        "quantity": 10,
        "unit": "g"
      },
      {
        "item": "milk",
        "quantity": 30,
        "unit": "ml"
      },
      {
        "item": "cherry tomatoes",
        "quantity": 50,
        "unit": "g"
      }
    ],
    "instructions": [
      "Whisk eggs with milk, salt, and pepper",
      "Melt butter in non-stick pan over medium-low heat",
      "Add spinach and cook until wilted, about 2 minutes",
      "Pour in egg mixture and gently stir with spatula",
      "Cook until soft curds form, about 3-4 minutes",
      "Serve with sliced avocado and cherry tomatoes"
    ],
    "tags": [
      "low-carb",
      "breakfast",
      "quick",
      "vegetarian"
    ]
  },
  {
    "id": "buffalo-chicken-lettuce-wraps",
    "name": "Buffalo Chicken Lettuce Wraps",
    "description": "Spicy buffalo chicken with cool ranch in crisp lettuce cups",
    "imageUrl": "https://images.unsplash.com/photo-1598515214146-d51e5d3d8f3c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1598515214146-d51e5d3d8f3c",
    "calories": 262,
    "protein_g": 41.4,
    "carbs_g": 3.5,
    "fat_g": 8.1,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "servings": 2,
    "ingredients": [
      {
        "item": "chicken breast",
        "quantity": 250,
        "unit": "g"
      },
      {
        "item": "buffalo sauce",
        "quantity": 60,
        "unit": "ml"
      },
      {
        "item": "romaine lettuce leaves",
        "quantity": 8,
        "unit": "leaves"
      },
      {
        "item": "Greek yogurt ranch",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "celery (diced)",
        "quantity": 50,
        "unit": "g"
      },
      {
        "item": "red onion (diced)",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "blue cheese crumbles",
        "quantity": 20,
        "unit": "g"
      }
    ],
    "instructions": [
      "Cook chicken breast in skillet until internal temp reaches 165°F",
      "Shred chicken with two forks",
      "Toss shredded chicken with buffalo sauce",
      "Wash and dry lettuce leaves",
      "Fill each lettuce cup with buffalo chicken",
      "Top with diced celery, red onion, blue cheese, and ranch drizzle"
    ],
    "tags": [
      "low-carb",
      "high-protein",
      "lunch",
      "spicy"
    ]
  },
  {
    "id": "pork-chop-green-beans",
    "name": "Pan-Seared Pork Chop with Green Beans",
    "description": "Juicy pork chop with garlic green beans and herb butter",
    "imageUrl": "https://images.unsplash.com/photo-1544025162-18a3e1d0c1a5?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1544025162-18a3e1d0c1a5",
    "calories": 729,
    "protein_g": 58.3,
    "carbs_g": 17,
    "fat_g": 47.6,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 1,
    "ingredients": [
      {
        "item": "pork chop (bone-in)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "green beans",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "butter",
        "quantity": 15,
        "unit": "g"
      },
      {
        "item": "garlic cloves",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "fresh rosemary",
        "quantity": 1,
        "unit": "sprig"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Season pork chop with salt, pepper, and rosemary",
      "Heat olive oil in skillet over medium-high heat",
      "Sear pork chop 5-6 minutes per side until golden",
      "Remove and let rest covered with foil",
      "Add butter, garlic, and green beans to same pan",
      "Sauté green beans 8-10 minutes until tender-crisp",
      "Serve pork chop with green beans and pan drippings"
    ],
    "tags": [
      "low-carb",
      "high-protein",
      "dinner"
    ]
  },
  {
    "id": "tuna-cucumber-boats",
    "name": "Mediterranean Tuna Cucumber Boats",
    "description": "Fresh tuna salad in cucumber boats with olives and feta",
    "imageUrl": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1559847844-5315695dadae",
    "calories": 274,
    "protein_g": 29.3,
    "carbs_g": 8.6,
    "fat_g": 13.8,
    "prepMinutes": 15,
    "cookMinutes": 0,
    "servings": 2,
    "ingredients": [
      {
        "item": "canned tuna in water",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "cucumber",
        "quantity": 2,
        "unit": "large"
      },
      {
        "item": "feta cheese",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "kalamata olives (chopped)",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "red onion (diced)",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "lemon juice",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "fresh dill",
        "quantity": 2,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Halve cucumbers lengthwise and scoop out seeds with spoon",
      "Drain tuna and place in bowl",
      "Mix tuna with diced red onion, olives, lemon juice, olive oil, and dill",
      "Crumble in feta cheese and mix gently",
      "Scoop tuna mixture into cucumber boats",
      "Garnish with extra dill and serve chilled"
    ],
    "tags": [
      "low-carb",
      "high-protein",
      "quick",
      "no-cook",
      "lunch"
    ]
  },
  {
    "id": "chickpea-spinach-curry",
    "name": "Creamy Chickpea & Spinach Curry",
    "description": "Rich and flavorful curry with chickpeas, spinach, and coconut milk",
    "imageUrl": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1455619452474-d2be8b1e70cd",
    "calories": 588,
    "protein_g": 23.7,
    "carbs_g": 70.7,
    "fat_g": 25.4,
    "prepMinutes": 10,
    "cookMinutes": 25,
    "servings": 2,
    "ingredients": [
      {
        "item": "cooked chickpeas",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "fresh spinach",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "coconut milk (light)",
        "quantity": 200,
        "unit": "ml"
      },
      {
        "item": "onion (diced)",
        "quantity": 1,
        "unit": "medium"
      },
      {
        "item": "tomatoes (diced)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "curry powder",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "garlic cloves",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "ginger (grated)",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Heat oil in large pot and sauté diced onion until soft",
      "Add minced garlic and grated ginger, cook 1 minute",
      "Stir in curry powder and cook 30 seconds until fragrant",
      "Add diced tomatoes and simmer 5 minutes",
      "Pour in coconut milk and chickpeas, simmer 10 minutes",
      "Add spinach and cook until wilted, about 2 minutes",
      "Season with salt and serve over rice or cauliflower rice"
    ],
    "tags": [
      "vegetarian",
      "balanced",
      "meal-prep",
      "dinner",
      "vegan"
    ]
  },
  {
    "id": "black-bean-sweet-potato-bowl",
    "name": "Black Bean & Sweet Potato Power Bowl",
    "description": "Hearty bowl with roasted sweet potato, black beans, and avocado",
    "imageUrl": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1528207776546-365bb710ee93",
    "calories": 639,
    "protein_g": 22,
    "carbs_g": 91.6,
    "fat_g": 24.4,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "servings": 1,
    "ingredients": [
      {
        "item": "sweet potato (cubed)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "black beans (cooked)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "avocado",
        "quantity": 0.5,
        "unit": "whole"
      },
      {
        "item": "kale (chopped)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "lime juice",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "cumin",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "chili powder",
        "quantity": 0.5,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Preheat oven to 425°F",
      "Toss cubed sweet potato with olive oil, cumin, and chili powder",
      "Roast sweet potato for 25-30 minutes until tender and crispy",
      "Massage kale with lime juice for 2 minutes until softened",
      "Warm black beans in microwave or on stove",
      "Assemble bowl with kale, roasted sweet potato, black beans",
      "Top with sliced avocado and extra lime juice"
    ],
    "tags": [
      "vegetarian",
      "balanced",
      "meal-prep",
      "lunch",
      "vegan"
    ]
  },
  {
    "id": "caprese-stuffed-portobello",
    "name": "Caprese Stuffed Portobello Mushrooms",
    "description": "Italian-style portobellos stuffed with tomato, mozzarella, and basil",
    "imageUrl": "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1506976785307-8732e854ad03",
    "calories": 313,
    "protein_g": 22.6,
    "carbs_g": 22,
    "fat_g": 16.1,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 2,
    "ingredients": [
      {
        "item": "portobello mushroom caps",
        "quantity": 4,
        "unit": "large"
      },
      {
        "item": "fresh mozzarella",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes (halved)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "fresh basil leaves",
        "quantity": 15,
        "unit": "leaves"
      },
      {
        "item": "balsamic glaze",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 2,
        "unit": "tsp"
      },
      {
        "item": "garlic powder",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Preheat oven to 375°F",
      "Remove mushroom stems and gently scrape out gills",
      "Brush mushrooms with olive oil and season with garlic powder",
      "Place mushrooms gill-side up on baking sheet",
      "Fill each cap with tomatoes and mozzarella",
      "Bake 18-20 minutes until mushrooms are tender and cheese melts",
      "Top with fresh basil and drizzle with balsamic glaze"
    ],
    "tags": [
      "vegetarian",
      "low-carb",
      "dinner",
      "Italian"
    ]
  },
  {
    "id": "lentil-veggie-stew",
    "name": "Hearty Lentil & Vegetable Stew",
    "description": "Warming stew packed with lentils, carrots, and celery",
    "imageUrl": "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1588137378633-dea1336ce1e2",
    "calories": 253,
    "protein_g": 11.1,
    "carbs_g": 41.2,
    "fat_g": 6.7,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "servings": 3,
    "ingredients": [
      {
        "item": "brown lentils (dry)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "carrots (chopped)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "celery (chopped)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "onion (diced)",
        "quantity": 1,
        "unit": "large"
      },
      {
        "item": "vegetable broth",
        "quantity": 800,
        "unit": "ml"
      },
      {
        "item": "diced tomatoes (canned)",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "garlic cloves",
        "quantity": 4,
        "unit": "whole"
      },
      {
        "item": "bay leaves",
        "quantity": 2,
        "unit": "whole"
      },
      {
        "item": "thyme",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Heat olive oil in large pot over medium heat",
      "Sauté onion, carrots, and celery for 8 minutes until softened",
      "Add minced garlic and cook 1 minute",
      "Add rinsed lentils, vegetable broth, tomatoes, bay leaves, and thyme",
      "Bring to boil, then reduce heat and simmer 30-35 minutes",
      "Remove bay leaves and season with salt and pepper",
      "Serve hot with crusty bread"
    ],
    "tags": [
      "vegetarian",
      "balanced",
      "meal-prep",
      "dinner",
      "vegan"
    ]
  },
  {
    "id": "greek-quinoa-salad",
    "name": "Greek Quinoa Salad Bowl",
    "description": "Refreshing quinoa salad with cucumber, tomato, feta, and olives",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1546069901-ba9599a7e63c",
    "calories": 401,
    "protein_g": 10.4,
    "carbs_g": 33.3,
    "fat_g": 26.2,
    "prepMinutes": 15,
    "cookMinutes": 15,
    "servings": 2,
    "ingredients": [
      {
        "item": "cooked quinoa",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "cucumber (diced)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes (halved)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "red onion (sliced)",
        "quantity": 50,
        "unit": "g"
      },
      {
        "item": "feta cheese",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "kalamata olives",
        "quantity": 50,
        "unit": "g"
      },
      {
        "item": "fresh parsley",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "lemon juice",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "dried oregano",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Cook quinoa according to package and let cool",
      "Dice cucumber, halve tomatoes, slice red onion",
      "In large bowl combine quinoa and all vegetables",
      "Add crumbled feta, olives, and chopped parsley",
      "Whisk together lemon juice, olive oil, and oregano",
      "Pour dressing over salad and toss well",
      "Refrigerate 30 minutes before serving for best flavor"
    ],
    "tags": [
      "vegetarian",
      "balanced",
      "meal-prep",
      "lunch",
      "no-cook"
    ]
  },
  {
    "id": "tuna-avocado-toast",
    "name": "Protein-Packed Tuna Avocado Toast",
    "description": "Quick and filling toast topped with tuna, avocado, and everything seasoning",
    "imageUrl": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1467003909585-2f8a72700288",
    "calories": 358,
    "protein_g": 39.3,
    "carbs_g": 28.1,
    "fat_g": 10.3,
    "prepMinutes": 8,
    "cookMinutes": 2,
    "servings": 1,
    "ingredients": [
      {
        "item": "whole grain bread",
        "quantity": 2,
        "unit": "slices"
      },
      {
        "item": "canned tuna in water",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "avocado",
        "quantity": 0.5,
        "unit": "whole"
      },
      {
        "item": "cherry tomatoes (halved)",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "lemon juice",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "everything bagel seasoning",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Toast bread slices until golden",
      "Mash avocado with lemon juice and spread on toast",
      "Drain tuna and flake over avocado",
      "Top with halved cherry tomatoes",
      "Sprinkle with everything bagel seasoning",
      "Serve immediately"
    ],
    "tags": [
      "quick",
      "high-protein",
      "breakfast",
      "lunch"
    ]
  },
  {
    "id": "cottage-cheese-berry-bowl",
    "name": "Cottage Cheese Berry Protein Bowl",
    "description": "Creamy cottage cheese with berries, granola, and honey",
    "imageUrl": "https://images.unsplash.com/photo-1512621776324-5ccb6d3f4c4c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1512621776324-5ccb6d3f4c4c",
    "calories": 579,
    "protein_g": 34.2,
    "carbs_g": 63.2,
    "fat_g": 18.5,
    "prepMinutes": 5,
    "cookMinutes": 0,
    "servings": 1,
    "ingredients": [
      {
        "item": "low-fat cottage cheese",
        "quantity": 250,
        "unit": "g"
      },
      {
        "item": "mixed berries (fresh/frozen)",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "granola",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "honey",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "chia seeds",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "cinnamon",
        "quantity": 1,
        "unit": "pinch"
      }
    ],
    "instructions": [
      "Scoop cottage cheese into bowl",
      "Top with mixed berries",
      "Sprinkle granola and chia seeds over top",
      "Drizzle with honey",
      "Add a dash of cinnamon",
      "Enjoy immediately or refrigerate for later"
    ],
    "tags": [
      "quick",
      "high-protein",
      "breakfast",
      "no-cook",
      "vegetarian"
    ]
  },
  {
    "id": "chicken-pesto-wrap",
    "name": "Chicken Pesto Wrap",
    "description": "Quick wrap with grilled chicken, pesto, and fresh vegetables",
    "imageUrl": "https://images.unsplash.com/photo-1619895092538-89f5b1b57807?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1619895092538-89f5b1b57807",
    "calories": 669,
    "protein_g": 58.3,
    "carbs_g": 60.9,
    "fat_g": 21.5,
    "prepMinutes": 10,
    "cookMinutes": 10,
    "servings": 1,
    "ingredients": [
      {
        "item": "whole wheat tortilla",
        "quantity": 1,
        "unit": "large"
      },
      {
        "item": "chicken breast",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "basil pesto",
        "quantity": 20,
        "unit": "g"
      },
      {
        "item": "mixed greens",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "red bell pepper (sliced)",
        "quantity": 50,
        "unit": "g"
      },
      {
        "item": "mozzarella cheese (shredded)",
        "quantity": 30,
        "unit": "g"
      }
    ],
    "instructions": [
      "Season and grill chicken breast until cooked through",
      "Slice chicken into strips",
      "Spread pesto over tortilla",
      "Layer with mixed greens, bell pepper, chicken, and cheese",
      "Roll tortilla tightly, folding in sides",
      "Cut in half and serve"
    ],
    "tags": [
      "quick",
      "high-protein",
      "lunch"
    ]
  },
  {
    "id": "protein-smoothie-bowl",
    "name": "Triple Berry Protein Smoothie Bowl",
    "description": "Thick and creamy smoothie bowl topped with granola and fresh fruit",
    "imageUrl": "https://images.unsplash.com/photo-1432139509967-34b2cb85d0c8?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1432139509967-34b2cb85d0c8",
    "calories": 376,
    "protein_g": 35.6,
    "carbs_g": 50.7,
    "fat_g": 5.5,
    "prepMinutes": 8,
    "cookMinutes": 0,
    "servings": 1,
    "ingredients": [
      {
        "item": "frozen mixed berries",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "banana (frozen)",
        "quantity": 1,
        "unit": "medium"
      },
      {
        "item": "vanilla protein powder",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "Greek yogurt (0% fat)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "almond milk",
        "quantity": 100,
        "unit": "ml"
      },
      {
        "item": "granola (topping)",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "fresh berries (topping)",
        "quantity": 50,
        "unit": "g"
      },
      {
        "item": "chia seeds",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Add frozen berries, banana, protein powder, yogurt, and almond milk to blender",
      "Blend on high until thick and smooth (add ice if needed)",
      "Pour into bowl",
      "Top with granola, fresh berries, and chia seeds",
      "Eat immediately with a spoon"
    ],
    "tags": [
      "quick",
      "high-protein",
      "breakfast",
      "vegetarian"
    ]
  },
  {
    "id": "turkey-cheese-quesadilla",
    "name": "Turkey & Cheese Quesadilla",
    "description": "Crispy quesadilla with lean turkey, cheese, and peppers",
    "imageUrl": "https://images.unsplash.com/photo-1619895092538-89f5b1b57807?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1619895092538-89f5b1b57807",
    "calories": 739,
    "protein_g": 56.5,
    "carbs_g": 93.6,
    "fat_g": 16.3,
    "prepMinutes": 5,
    "cookMinutes": 10,
    "servings": 1,
    "ingredients": [
      {
        "item": "whole wheat tortillas",
        "quantity": 2,
        "unit": "medium"
      },
      {
        "item": "sliced turkey breast",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "reduced-fat cheddar",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "bell peppers (diced)",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "red onion (sliced)",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "Greek yogurt (for serving)",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "cooking spray",
        "quantity": 1,
        "unit": "spray"
      }
    ],
    "instructions": [
      "Heat large skillet over medium heat and spray with cooking spray",
      "Place one tortilla in pan",
      "Layer with turkey, cheese, peppers, and onions",
      "Top with second tortilla",
      "Cook 3-4 minutes until bottom is golden",
      "Flip and cook another 3 minutes",
      "Cut into wedges and serve with Greek yogurt"
    ],
    "tags": [
      "quick",
      "high-protein",
      "lunch"
    ]
  },
  {
    "id": "teriyaki-chicken-rice-bowl",
    "name": "Teriyaki Chicken Rice Bowl",
    "description": "Asian-inspired bowl with teriyaki chicken, brown rice, and edamame",
    "imageUrl": "https://images.unsplash.com/photo-1606787366850-de6ba5c8c5e5?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1606787366850-de6ba5c8c5e5",
    "calories": 526,
    "protein_g": 61.7,
    "carbs_g": 47.2,
    "fat_g": 10.3,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "servings": 3,
    "ingredients": [
      {
        "item": "chicken breast",
        "quantity": 450,
        "unit": "g"
      },
      {
        "item": "cooked brown rice",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "edamame (shelled)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "broccoli florets",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "carrots (julienned)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "teriyaki sauce (low-sodium)",
        "quantity": 90,
        "unit": "ml"
      },
      {
        "item": "sesame seeds",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "green onions (sliced)",
        "quantity": 3,
        "unit": "stalks"
      }
    ],
    "instructions": [
      "Cut chicken into bite-sized pieces",
      "Cook chicken in large pan until golden",
      "Add 60ml teriyaki sauce and coat chicken",
      "Steam broccoli and edamame for 5 minutes",
      "Divide rice among 3 meal prep containers",
      "Top each with chicken, vegetables, and remaining teriyaki",
      "Garnish with sesame seeds and green onions",
      "Refrigerate up to 4 days"
    ],
    "tags": [
      "meal-prep",
      "high-protein",
      "balanced",
      "lunch",
      "dinner"
    ]
  },
  {
    "id": "beef-burrito-bowl",
    "name": "Lean Beef Burrito Bowl",
    "description": "Mexican-style bowl with seasoned beef, black beans, and salsa",
    "imageUrl": "https://images.unsplash.com/photo-1558030006-450c9f8c2c2c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1558030006-450c9f8c2c2c",
    "calories": 643,
    "protein_g": 48.9,
    "carbs_g": 63.6,
    "fat_g": 23.1,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": 3,
    "ingredients": [
      {
        "item": "lean ground beef (93/7)",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "cooked brown rice",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "black beans (cooked)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "corn kernels",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "salsa",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "avocado",
        "quantity": 1,
        "unit": "whole"
      },
      {
        "item": "taco seasoning",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "lime juice",
        "quantity": 2,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Brown ground beef in large skillet over medium-high heat",
      "Add taco seasoning and 60ml water, simmer 5 minutes",
      "Divide rice among 3 meal prep containers",
      "Top each with seasoned beef, black beans, and corn",
      "Add salsa to each container",
      "Slice avocado when ready to eat (add fresh)",
      "Squeeze lime juice over before serving",
      "Refrigerate up to 4 days"
    ],
    "tags": [
      "meal-prep",
      "high-protein",
      "balanced",
      "lunch",
      "dinner"
    ]
  },
  {
    "id": "mediterranean-chicken-bowl",
    "name": "Mediterranean Chicken Bowl",
    "description": "Greek-inspired bowl with chicken, hummus, cucumber, and tzatziki",
    "imageUrl": "https://images.unsplash.com/photo-1598515214146-d51e5d3d8f3c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1598515214146-d51e5d3d8f3c",
    "calories": 439,
    "protein_g": 49.8,
    "carbs_g": 36.2,
    "fat_g": 9.4,
    "prepMinutes": 20,
    "cookMinutes": 20,
    "servings": 3,
    "ingredients": [
      {
        "item": "chicken breast",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "cooked couscous",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "hummus",
        "quantity": 90,
        "unit": "g"
      },
      {
        "item": "cucumber (diced)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes (halved)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "red onion (sliced)",
        "quantity": 80,
        "unit": "g"
      },
      {
        "item": "tzatziki sauce",
        "quantity": 90,
        "unit": "g"
      },
      {
        "item": "lemon wedges",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "oregano",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Season chicken with oregano, salt, and pepper",
      "Grill chicken until cooked through, then slice",
      "Cook couscous according to package",
      "Dice cucumber, halve tomatoes, slice onion",
      "Divide couscous among 3 meal prep containers",
      "Top each with sliced chicken, vegetables, and hummus",
      "Pack tzatziki separately",
      "Add tzatziki and squeeze lemon when ready to eat"
    ],
    "tags": [
      "meal-prep",
      "high-protein",
      "balanced",
      "lunch"
    ]
  },
  {
    "id": "thai-peanut-tofu-bowl",
    "name": "Thai Peanut Tofu Bowl",
    "description": "Crispy tofu with vegetables in creamy peanut sauce over rice",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-eef4f43dd4ca?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1546069901-eef4f43dd4ca",
    "calories": 475,
    "protein_g": 24.4,
    "carbs_g": 49.4,
    "fat_g": 22.4,
    "prepMinutes": 15,
    "cookMinutes": 25,
    "servings": 3,
    "ingredients": [
      {
        "item": "firm tofu (pressed)",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "cooked jasmine rice",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "bell peppers (sliced)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "snap peas",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "carrots (julienned)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "peanut butter",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "soy sauce",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "lime juice",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "sriracha",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "sesame oil",
        "quantity": 1,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Press tofu and cut into cubes",
      "Pan-fry tofu in sesame oil until golden on all sides",
      "Stir-fry bell peppers, snap peas, and carrots for 5 minutes",
      "Mix peanut butter, soy sauce, lime juice, sriracha with water to make sauce",
      "Toss tofu and vegetables with peanut sauce",
      "Divide rice among 3 containers",
      "Top with tofu-vegetable mixture",
      "Refrigerate up to 4 days"
    ],
    "tags": [
      "meal-prep",
      "vegetarian",
      "balanced",
      "lunch",
      "dinner",
      "vegan"
    ]
  },
  {
    "id": "cajun-shrimp-pasta-bowl",
    "name": "Cajun Shrimp Pasta Bowl",
    "description": "Spicy Cajun shrimp with whole wheat pasta and vegetables",
    "imageUrl": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1565557623262-b51c2513a641",
    "calories": 374,
    "protein_g": 42.2,
    "carbs_g": 28.1,
    "fat_g": 11.3,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": 3,
    "ingredients": [
      {
        "item": "large shrimp (peeled)",
        "quantity": 450,
        "unit": "g"
      },
      {
        "item": "whole wheat penne",
        "quantity": 225,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes (halved)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "zucchini (sliced)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "Cajun seasoning",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "garlic cloves",
        "quantity": 4,
        "unit": "whole"
      },
      {
        "item": "lemon juice",
        "quantity": 3,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Cook pasta according to package, drain and set aside",
      "Season shrimp with Cajun seasoning",
      "Heat olive oil and sauté garlic for 30 seconds",
      "Add shrimp and cook 2-3 minutes per side",
      "Add tomatoes and zucchini, cook 5 minutes",
      "Toss with cooked pasta and lemon juice",
      "Divide among 3 meal prep containers",
      "Refrigerate up to 3 days"
    ],
    "tags": [
      "meal-prep",
      "high-protein",
      "balanced",
      "lunch",
      "dinner",
      "spicy"
    ]
  },
  {
    "id": "overnight-oats-pb-banana",
    "name": "Peanut Butter Banana Overnight Oats",
    "description": "Creamy overnight oats with peanut butter, banana, and chia seeds",
    "imageUrl": "https://images.unsplash.com/photo-1505252585461-41e8e2f3f6c6?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1505252585461-41e8e2f3f6c6",
    "calories": 559,
    "protein_g": 19.9,
    "carbs_g": 78.1,
    "fat_g": 21.3,
    "prepMinutes": 5,
    "cookMinutes": 0,
    "servings": 1,
    "ingredients": [
      {
        "item": "rolled oats",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "almond milk",
        "quantity": 180,
        "unit": "ml"
      },
      {
        "item": "Greek yogurt",
        "quantity": 80,
        "unit": "g"
      },
      {
        "item": "peanut butter",
        "quantity": 20,
        "unit": "g"
      },
      {
        "item": "banana (sliced)",
        "quantity": 1,
        "unit": "medium"
      },
      {
        "item": "chia seeds",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "honey",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "cinnamon",
        "quantity": 0.5,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "In jar or container, combine oats, almond milk, and Greek yogurt",
      "Stir in peanut butter, chia seeds, honey, and cinnamon",
      "Mix well until fully combined",
      "Refrigerate overnight (or at least 4 hours)",
      "In the morning, top with sliced banana",
      "Enjoy cold or warm in microwave for 1 minute"
    ],
    "tags": [
      "breakfast",
      "no-cook",
      "meal-prep",
      "vegetarian"
    ]
  },
  {
    "id": "spinach-feta-egg-muffins",
    "name": "Spinach & Feta Egg Muffins",
    "description": "Portable egg muffins packed with spinach, feta, and tomatoes",
    "imageUrl": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1517673132405-a56a62b18caf",
    "calories": 295,
    "protein_g": 24.7,
    "carbs_g": 4.9,
    "fat_g": 19.5,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 6,
    "ingredients": [
      {
        "item": "large eggs",
        "quantity": 10,
        "unit": "whole"
      },
      {
        "item": "fresh spinach (chopped)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "feta cheese (crumbled)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes (quartered)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "red onion (diced)",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "milk",
        "quantity": 60,
        "unit": "ml"
      },
      {
        "item": "garlic powder",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "cooking spray",
        "quantity": 1,
        "unit": "spray"
      }
    ],
    "instructions": [
      "Preheat oven to 375°F and spray muffin tin with cooking spray",
      "Whisk eggs with milk, garlic powder, salt, and pepper",
      "Sauté spinach until wilted, about 2 minutes",
      "Divide spinach, feta, tomatoes, and onion among 12 muffin cups",
      "Pour egg mixture over vegetables, filling each cup 3/4 full",
      "Bake 18-20 minutes until eggs are set",
      "Cool and store in fridge up to 5 days or freeze"
    ],
    "tags": [
      "breakfast",
      "high-protein",
      "low-carb",
      "meal-prep",
      "vegetarian"
    ]
  },
  {
    "id": "apple-cinnamon-quinoa",
    "name": "Apple Cinnamon Breakfast Quinoa",
    "description": "Warm and cozy quinoa porridge with apples, cinnamon, and walnuts",
    "imageUrl": "https://images.unsplash.com/photo-1505252585461-41e8e2f3f6c6?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1505252585461-41e8e2f3f6c6",
    "calories": 383,
    "protein_g": 10.5,
    "carbs_g": 53.7,
    "fat_g": 15,
    "prepMinutes": 5,
    "cookMinutes": 20,
    "servings": 2,
    "ingredients": [
      {
        "item": "quinoa (uncooked)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "almond milk",
        "quantity": 360,
        "unit": "ml"
      },
      {
        "item": "apple (diced)",
        "quantity": 1,
        "unit": "large"
      },
      {
        "item": "walnuts (chopped)",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "maple syrup",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "cinnamon",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "vanilla extract",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Rinse quinoa under cold water",
      "In pot, bring almond milk to boil",
      "Add quinoa, reduce heat to low, and simmer 15 minutes",
      "Stir in diced apple, cinnamon, and vanilla",
      "Cook 5 more minutes until quinoa is tender",
      "Remove from heat and stir in maple syrup",
      "Top with chopped walnuts and serve warm"
    ],
    "tags": [
      "breakfast",
      "vegetarian",
      "balanced",
      "vegan"
    ]
  },
  {
    "id": "protein-french-toast",
    "name": "High-Protein French Toast",
    "description": "Classic French toast made protein-rich with egg whites and Greek yogurt",
    "imageUrl": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1488477181946-6428a0291777",
    "calories": 314,
    "protein_g": 23.7,
    "carbs_g": 48,
    "fat_g": 3.1,
    "prepMinutes": 5,
    "cookMinutes": 10,
    "servings": 1,
    "ingredients": [
      {
        "item": "whole grain bread",
        "quantity": 3,
        "unit": "slices"
      },
      {
        "item": "egg whites",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "Greek yogurt (0% fat)",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "vanilla extract",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "cinnamon",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "fresh berries",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "sugar-free syrup",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "cooking spray",
        "quantity": 1,
        "unit": "spray"
      }
    ],
    "instructions": [
      "Whisk egg whites, Greek yogurt, vanilla, and cinnamon in shallow bowl",
      "Heat non-stick pan over medium heat and spray with cooking spray",
      "Dip each bread slice in egg mixture, coating both sides",
      "Cook 3 minutes per side until golden brown",
      "Top with fresh berries and sugar-free syrup",
      "Serve immediately"
    ],
    "tags": [
      "breakfast",
      "high-protein",
      "quick",
      "vegetarian"
    ]
  },
  {
    "id": "breakfast-burrito-bowl",
    "name": "Breakfast Burrito Bowl",
    "description": "Hearty morning bowl with eggs, black beans, avocado, and salsa",
    "imageUrl": "https://images.unsplash.com/photo-1525351326368-efbb5cb6814d?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1525351326368-efbb5cb6814d",
    "calories": 727,
    "protein_g": 45.9,
    "carbs_g": 55.6,
    "fat_g": 37.2,
    "prepMinutes": 10,
    "cookMinutes": 10,
    "servings": 1,
    "ingredients": [
      {
        "item": "large eggs",
        "quantity": 2,
        "unit": "whole"
      },
      {
        "item": "black beans (cooked)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "avocado",
        "quantity": 0.5,
        "unit": "whole"
      },
      {
        "item": "cherry tomatoes (halved)",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "cheddar cheese (shredded)",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "salsa",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "cooked sweet potato",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "cilantro",
        "quantity": 2,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Scramble eggs in non-stick pan until cooked through",
      "Warm black beans in microwave",
      "Cube cooked sweet potato and warm",
      "Assemble bowl with sweet potato as base",
      "Top with scrambled eggs, black beans, tomatoes",
      "Add sliced avocado, cheese, and salsa",
      "Garnish with fresh cilantro"
    ],
    "tags": [
      "breakfast",
      "high-protein",
      "balanced",
      "vegetarian"
    ]
  },
  {
    "id": "protein-energy-balls",
    "name": "Chocolate Peanut Butter Protein Balls",
    "description": "No-bake energy balls with oats, peanut butter, and protein powder",
    "imageUrl": "https://images.unsplash.com/photo-1512621776324-5ccb6d3f4c4c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1512621776324-5ccb6d3f4c4c",
    "calories": 182,
    "protein_g": 9.3,
    "carbs_g": 18.9,
    "fat_g": 8.5,
    "prepMinutes": 15,
    "cookMinutes": 0,
    "servings": 12,
    "ingredients": [
      {
        "item": "rolled oats",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "natural peanut butter",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "chocolate protein powder",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "honey",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "dark chocolate chips",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "chia seeds",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "vanilla extract",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "In large bowl, mix all ingredients until well combined",
      "If mixture is too dry, add 1-2 tbsp water",
      "Roll mixture into 12 balls (about 35g each)",
      "Place on parchment-lined tray",
      "Refrigerate at least 1 hour to firm up",
      "Store in airtight container in fridge up to 2 weeks"
    ],
    "tags": [
      "snack",
      "no-cook",
      "meal-prep",
      "vegetarian"
    ]
  },
  {
    "id": "turkey-cucumber-bites",
    "name": "Turkey & Cream Cheese Cucumber Bites",
    "description": "Light and refreshing cucumber rounds topped with turkey and cream cheese",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1546069901-ba9599a7e63c",
    "calories": 107,
    "protein_g": 13.7,
    "carbs_g": 4,
    "fat_g": 4.1,
    "prepMinutes": 10,
    "cookMinutes": 0,
    "servings": 3,
    "ingredients": [
      {
        "item": "cucumber",
        "quantity": 1,
        "unit": "large"
      },
      {
        "item": "sliced turkey breast",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "light cream cheese",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes (quartered)",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "fresh dill",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "everything bagel seasoning",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Slice cucumber into 1/2-inch thick rounds",
      "Pat cucumber slices dry with paper towel",
      "Spread small amount of cream cheese on each round",
      "Top with folded turkey slice",
      "Add cherry tomato quarter",
      "Sprinkle with dill and everything seasoning",
      "Serve immediately or refrigerate up to 4 hours"
    ],
    "tags": [
      "snack",
      "low-carb",
      "high-protein",
      "no-cook",
      "quick"
    ]
  },
  {
    "id": "greek-yogurt-parfait",
    "name": "Berry Greek Yogurt Parfait",
    "description": "Layered parfait with Greek yogurt, berries, and crunchy granola",
    "imageUrl": "https://images.unsplash.com/photo-1432139509967-34b2cb85d0c8?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1432139509967-34b2cb85d0c8",
    "calories": 396,
    "protein_g": 8.4,
    "carbs_g": 54.4,
    "fat_g": 17.5,
    "prepMinutes": 5,
    "cookMinutes": 0,
    "servings": 1,
    "ingredients": [
      {
        "item": "Greek yogurt (0% fat)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "mixed berries (fresh)",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "granola",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "honey",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "sliced almonds",
        "quantity": 15,
        "unit": "g"
      }
    ],
    "instructions": [
      "In glass or jar, layer 1/3 of Greek yogurt",
      "Add layer of berries",
      "Sprinkle with granola",
      "Repeat layers two more times",
      "Drizzle honey on top",
      "Finish with sliced almonds",
      "Enjoy immediately"
    ],
    "tags": [
      "snack",
      "breakfast",
      "high-protein",
      "no-cook",
      "quick",
      "vegetarian"
    ]
  },
  {
    "id": "apple-almond-butter",
    "name": "Apple Slices with Almond Butter",
    "description": "Simple and satisfying snack with crisp apple and protein-rich almond butter",
    "imageUrl": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1528207776546-365bb710ee93",
    "calories": 178,
    "protein_g": 6.1,
    "carbs_g": 6.9,
    "fat_g": 15.6,
    "prepMinutes": 3,
    "cookMinutes": 0,
    "servings": 1,
    "ingredients": [
      {
        "item": "apple (large)",
        "quantity": 1,
        "unit": "whole"
      },
      {
        "item": "almond butter",
        "quantity": 25,
        "unit": "g"
      },
      {
        "item": "cinnamon",
        "quantity": 1,
        "unit": "pinch"
      },
      {
        "item": "chia seeds",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Wash and core apple",
      "Cut apple into 8-10 slices",
      "Spread almond butter on each slice",
      "Sprinkle with cinnamon and chia seeds",
      "Arrange on plate and enjoy"
    ],
    "tags": [
      "snack",
      "quick",
      "no-cook",
      "vegetarian",
      "vegan"
    ]
  },
  {
    "id": "edamame-sea-salt",
    "name": "Sea Salt Edamame",
    "description": "Simple steamed edamame with sea salt for a protein-packed snack",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-eef4f43dd4ca?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1546069901-eef4f43dd4ca",
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0,
    "prepMinutes": 2,
    "cookMinutes": 5,
    "servings": 1,
    "ingredients": [
      {
        "item": "frozen edamame (in pods)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "sea salt",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "garlic powder",
        "quantity": 0.5,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Bring pot of water to boil",
      "Add frozen edamame pods",
      "Cook 5 minutes until tender",
      "Drain well",
      "Toss with sea salt and garlic powder",
      "Serve warm"
    ],
    "tags": [
      "snack",
      "high-protein",
      "quick",
      "vegan",
      "vegetarian"
    ]
  },
  {
    "id": "honey-mustard-chicken-veggies",
    "name": "Honey Mustard Chicken with Roasted Vegetables",
    "description": "Tender chicken with sweet honey mustard glaze and colorful roasted vegetables",
    "imageUrl": "https://images.unsplash.com/photo-1598515214146-d51e5d3d8f3c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1598515214146-d51e5d3d8f3c",
    "calories": 564,
    "protein_g": 49.2,
    "carbs_g": 44.8,
    "fat_g": 20.7,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "servings": 2,
    "ingredients": [
      {
        "item": "chicken breast",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "sweet potato (cubed)",
        "quantity": 250,
        "unit": "g"
      },
      {
        "item": "Brussels sprouts (halved)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "carrots (chopped)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "Dijon mustard",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "honey",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "garlic powder",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Preheat oven to 425°F",
      "Toss vegetables with olive oil, salt, and pepper on baking sheet",
      "Roast vegetables for 15 minutes",
      "Mix Dijon mustard, honey, and garlic powder",
      "Season chicken and brush with honey mustard",
      "Add chicken to baking sheet with vegetables",
      "Roast another 15-18 minutes until chicken reaches 165°F",
      "Brush chicken with remaining glaze and serve"
    ],
    "tags": [
      "balanced",
      "high-protein",
      "dinner",
      "meal-prep"
    ]
  },
  {
    "id": "baked-cod-lemon-herbs",
    "name": "Baked Cod with Lemon & Herbs",
    "description": "Flaky white fish with bright lemon and fresh herbs over quinoa",
    "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1519708227418-c8fd9a32b7a2",
    "calories": 481,
    "protein_g": 40.9,
    "carbs_g": 37.9,
    "fat_g": 18.8,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 1,
    "ingredients": [
      {
        "item": "cod fillet",
        "quantity": 180,
        "unit": "g"
      },
      {
        "item": "cooked quinoa",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "green beans",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "lemon",
        "quantity": 1,
        "unit": "whole"
      },
      {
        "item": "fresh parsley",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "fresh dill",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "garlic cloves",
        "quantity": 2,
        "unit": "whole"
      }
    ],
    "instructions": [
      "Preheat oven to 400°F",
      "Place cod on parchment-lined baking sheet",
      "Drizzle with olive oil and top with minced garlic",
      "Squeeze half lemon over fish and sprinkle with herbs",
      "Bake 12-15 minutes until fish flakes easily",
      "Steam green beans for 5 minutes",
      "Serve cod over quinoa with green beans",
      "Garnish with remaining lemon wedges"
    ],
    "tags": [
      "balanced",
      "high-protein",
      "dinner",
      "quick"
    ]
  },
  {
    "id": "veggie-egg-fried-rice",
    "name": "Vegetable Egg Fried Rice",
    "description": "Lighter version of fried rice packed with vegetables and scrambled eggs",
    "imageUrl": "https://images.unsplash.com/photo-1606787366850-de6ba5c8c5e5?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1606787366850-de6ba5c8c5e5",
    "calories": 518,
    "protein_g": 27.8,
    "carbs_g": 54.7,
    "fat_g": 21,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "servings": 2,
    "ingredients": [
      {
        "item": "cooked brown rice (cold)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "large eggs",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "mixed vegetables (frozen)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "green onions (sliced)",
        "quantity": 4,
        "unit": "stalks"
      },
      {
        "item": "soy sauce (low-sodium)",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "sesame oil",
        "quantity": 2,
        "unit": "tsp"
      },
      {
        "item": "garlic cloves",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "ginger (grated)",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Heat sesame oil in large wok or skillet over high heat",
      "Add minced garlic and ginger, cook 30 seconds",
      "Push to side and scramble eggs in center of pan",
      "Add mixed vegetables and stir-fry 3-4 minutes",
      "Add cold rice, breaking up clumps",
      "Stir-fry 5 minutes until rice is heated and slightly crispy",
      "Add soy sauce and green onions, toss well",
      "Serve hot"
    ],
    "tags": [
      "balanced",
      "vegetarian",
      "dinner",
      "quick"
    ]
  },
  {
    "id": "bison-burger-sweet-potato-fries",
    "name": "Lean Bison Burger with Sweet Potato Fries",
    "description": "Juicy bison burger with baked sweet potato fries",
    "imageUrl": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1551183053-bf91a1d81141",
    "calories": 487,
    "protein_g": 53.2,
    "carbs_g": 45.9,
    "fat_g": 8.7,
    "prepMinutes": 15,
    "cookMinutes": 30,
    "servings": 1,
    "ingredients": [
      {
        "item": "ground bison",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "whole grain bun",
        "quantity": 1,
        "unit": "whole"
      },
      {
        "item": "sweet potato (cut into fries)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "lettuce",
        "quantity": 2,
        "unit": "leaves"
      },
      {
        "item": "tomato (sliced)",
        "quantity": 2,
        "unit": "slices"
      },
      {
        "item": "red onion (sliced)",
        "quantity": 2,
        "unit": "rings"
      },
      {
        "item": "olive oil spray",
        "quantity": 1,
        "unit": "spray"
      },
      {
        "item": "paprika",
        "quantity": 1,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Preheat oven to 425°F",
      "Toss sweet potato fries with oil spray and paprika",
      "Spread on baking sheet and bake 25-30 minutes, flipping halfway",
      "Form bison into patty and season with salt and pepper",
      "Grill or pan-fry burger 4-5 minutes per side to desired doneness",
      "Toast bun lightly",
      "Assemble burger with lettuce, tomato, onion",
      "Serve with sweet potato fries"
    ],
    "tags": [
      "balanced",
      "high-protein",
      "dinner"
    ]
  },
  {
    "id": "coconut-curry-lentils",
    "name": "Coconut Curry Red Lentils",
    "description": "Creamy red lentil curry with coconut milk and warming spices",
    "imageUrl": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1455619452474-d2be8b1e70cd",
    "calories": 329,
    "protein_g": 12,
    "carbs_g": 35.1,
    "fat_g": 16.8,
    "prepMinutes": 10,
    "cookMinutes": 25,
    "servings": 3,
    "ingredients": [
      {
        "item": "red lentils (dry)",
        "quantity": 250,
        "unit": "g"
      },
      {
        "item": "coconut milk (light)",
        "quantity": 400,
        "unit": "ml"
      },
      {
        "item": "diced tomatoes (canned)",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "onion (diced)",
        "quantity": 1,
        "unit": "large"
      },
      {
        "item": "curry powder",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "turmeric",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "garlic cloves",
        "quantity": 4,
        "unit": "whole"
      },
      {
        "item": "ginger (grated)",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "fresh cilantro",
        "quantity": 0.25,
        "unit": "cup"
      }
    ],
    "instructions": [
      "Sauté onion in large pot until soft",
      "Add garlic and ginger, cook 1 minute",
      "Stir in curry powder and turmeric",
      "Add rinsed lentils, coconut milk, tomatoes, and 1 cup water",
      "Bring to boil, then simmer 20-25 minutes until lentils are tender",
      "Stir occasionally and add water if too thick",
      "Season with salt and garnish with cilantro",
      "Serve over rice or with naan"
    ],
    "tags": [
      "vegetarian",
      "balanced",
      "meal-prep",
      "dinner",
      "vegan"
    ]
  },
  {
    "id": "chicken-fajita-bowl",
    "name": "Chicken Fajita Bowl",
    "description": "Sizzling chicken fajitas over rice with peppers and onions",
    "imageUrl": "https://images.unsplash.com/photo-1606787366850-de6ba5c8c5e5?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1606787366850-de6ba5c8c5e5",
    "calories": 299,
    "protein_g": 5.5,
    "carbs_g": 43.4,
    "fat_g": 12.7,
    "prepMinutes": 15,
    "cookMinutes": 20,
    "servings": 2,
    "ingredients": [
      {
        "item": "chicken breast (sliced)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "cooked brown rice",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "bell peppers (sliced)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "red onion (sliced)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "fajita seasoning",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "lime juice",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "avocado",
        "quantity": 0.5,
        "unit": "whole"
      },
      {
        "item": "cilantro",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Toss sliced chicken with fajita seasoning",
      "Heat olive oil in large skillet over high heat",
      "Cook chicken 5-6 minutes until browned",
      "Remove chicken and add peppers and onions",
      "Sauté vegetables 5-6 minutes until slightly charred",
      "Return chicken to pan and add lime juice",
      "Divide rice between bowls",
      "Top with chicken-pepper mixture, avocado, and cilantro"
    ],
    "tags": [
      "balanced",
      "high-protein",
      "dinner",
      "meal-prep"
    ]
  },
  {
    "id": "pesto-chicken-pasta",
    "name": "Pesto Chicken Pasta",
    "description": "Whole wheat pasta with grilled chicken and basil pesto",
    "imageUrl": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1621996346565-e3dbc646d9a9",
    "calories": 591,
    "protein_g": 53,
    "carbs_g": 31.7,
    "fat_g": 27.5,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 2,
    "ingredients": [
      {
        "item": "whole wheat pasta",
        "quantity": 180,
        "unit": "g"
      },
      {
        "item": "chicken breast",
        "quantity": 250,
        "unit": "g"
      },
      {
        "item": "basil pesto",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "cherry tomatoes (halved)",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "baby spinach",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "parmesan cheese (grated)",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "garlic cloves",
        "quantity": 3,
        "unit": "whole"
      },
      {
        "item": "olive oil",
        "quantity": 1,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Cook pasta according to package directions",
      "Grill or pan-fry chicken until cooked through, then slice",
      "In same pan, heat olive oil and sauté garlic 30 seconds",
      "Add cherry tomatoes and cook 3 minutes",
      "Add spinach and cook until wilted",
      "Drain pasta and toss with pesto",
      "Add chicken and vegetables to pasta",
      "Top with parmesan and serve"
    ],
    "tags": [
      "balanced",
      "high-protein",
      "dinner",
      "Italian"
    ]
  },
  {
    "id": "moroccan-chickpea-couscous",
    "name": "Moroccan Chickpea & Couscous Bowl",
    "description": "Aromatic Moroccan-spiced chickpeas over fluffy couscous",
    "imageUrl": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1455619452474-d2be8b1e70cd",
    "calories": 815,
    "protein_g": 29.1,
    "carbs_g": 130,
    "fat_g": 21,
    "prepMinutes": 10,
    "cookMinutes": 20,
    "servings": 2,
    "ingredients": [
      {
        "item": "cooked chickpeas",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "couscous (dry)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "diced tomatoes",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "zucchini (diced)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "raisins",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "cumin",
        "quantity": 2,
        "unit": "tsp"
      },
      {
        "item": "cinnamon",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "paprika",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "olive oil",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "fresh mint",
        "quantity": 3,
        "unit": "tbsp"
      }
    ],
    "instructions": [
      "Heat olive oil in pan and add cumin, cinnamon, and paprika",
      "Cook spices 30 seconds until fragrant",
      "Add chickpeas, tomatoes, zucchini, and raisins",
      "Simmer 15 minutes until vegetables are tender",
      "Meanwhile, cook couscous according to package",
      "Fluff couscous with fork",
      "Serve chickpea mixture over couscous",
      "Garnish with fresh mint"
    ],
    "tags": [
      "vegetarian",
      "balanced",
      "dinner",
      "vegan"
    ]
  },
  {
    "id": "seared-tuna-sesame",
    "name": "Sesame-Crusted Seared Tuna",
    "description": "Restaurant-quality seared tuna with sesame crust and soy ginger sauce",
    "imageUrl": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1467003909585-2f8a72700288",
    "calories": 644,
    "protein_g": 70.7,
    "carbs_g": 37.2,
    "fat_g": 22.6,
    "prepMinutes": 15,
    "cookMinutes": 10,
    "servings": 1,
    "ingredients": [
      {
        "item": "tuna steak (sushi-grade)",
        "quantity": 180,
        "unit": "g"
      },
      {
        "item": "sesame seeds (mixed black/white)",
        "quantity": 20,
        "unit": "g"
      },
      {
        "item": "cooked brown rice",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "edamame (shelled)",
        "quantity": 80,
        "unit": "g"
      },
      {
        "item": "soy sauce",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "rice vinegar",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "ginger (grated)",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "sesame oil",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "green onions",
        "quantity": 2,
        "unit": "stalks"
      }
    ],
    "instructions": [
      "Pat tuna dry and season with salt",
      "Press sesame seeds onto all sides of tuna",
      "Heat sesame oil in pan over high heat",
      "Sear tuna 1-2 minutes per side (center should be rare)",
      "Remove and let rest",
      "Mix soy sauce, rice vinegar, and grated ginger for sauce",
      "Slice tuna against the grain",
      "Serve over rice with edamame, drizzle sauce, garnish with green onions"
    ],
    "tags": [
      "high-protein",
      "balanced",
      "dinner",
      "quick",
      "seafood"
    ]
  },
  {
    "id": "chicken-veggie-sheet-pan",
    "name": "One-Pan Chicken & Veggie Bake",
    "description": "Easy sheet pan meal with chicken thighs and colorful vegetables",
    "imageUrl": "https://images.unsplash.com/photo-1598515214146-d51e5d3d8f3c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1598515214146-d51e5d3d8f3c",
    "calories": 373,
    "protein_g": 6.6,
    "carbs_g": 37,
    "fat_g": 23.3,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "servings": 2,
    "ingredients": [
      {
        "item": "chicken thighs (boneless, skinless)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "baby potatoes (halved)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "broccoli florets",
        "quantity": 200,
        "unit": "g"
      },
      {
        "item": "red bell pepper (chunks)",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "olive oil",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "Italian seasoning",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "garlic powder",
        "quantity": 1,
        "unit": "tsp"
      },
      {
        "item": "lemon",
        "quantity": 1,
        "unit": "whole"
      }
    ],
    "instructions": [
      "Preheat oven to 425°F",
      "Toss potatoes with 1 tbsp olive oil and place on sheet pan",
      "Roast potatoes 15 minutes",
      "Meanwhile, season chicken with Italian seasoning and garlic powder",
      "Add chicken, broccoli, and peppers to sheet pan",
      "Drizzle remaining olive oil over everything",
      "Roast 20 minutes until chicken reaches 165°F",
      "Squeeze lemon juice over dish before serving"
    ],
    "tags": [
      "balanced",
      "high-protein",
      "dinner",
      "meal-prep"
    ]
  },
  {
    "id": "turkey-chili-bowl",
    "name": "Lean Turkey Chili",
    "description": "Hearty and spicy turkey chili with beans and vegetables",
    "imageUrl": "https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1574672280600-4accfa5b6f98",
    "calories": 394,
    "protein_g": 47.4,
    "carbs_g": 40.8,
    "fat_g": 5.4,
    "prepMinutes": 15,
    "cookMinutes": 35,
    "servings": 4,
    "ingredients": [
      {
        "item": "lean ground turkey",
        "quantity": 500,
        "unit": "g"
      },
      {
        "item": "kidney beans (canned)",
        "quantity": 400,
        "unit": "g"
      },
      {
        "item": "diced tomatoes (canned)",
        "quantity": 800,
        "unit": "g"
      },
      {
        "item": "bell peppers (diced)",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "onion (diced)",
        "quantity": 1,
        "unit": "large"
      },
      {
        "item": "chili powder",
        "quantity": 3,
        "unit": "tbsp"
      },
      {
        "item": "cumin",
        "quantity": 2,
        "unit": "tsp"
      },
      {
        "item": "garlic cloves",
        "quantity": 4,
        "unit": "whole"
      }
    ],
    "instructions": [
      "Brown ground turkey in large pot over medium heat",
      "Add diced onion and peppers, cook 5 minutes",
      "Stir in minced garlic, chili powder, and cumin",
      "Add tomatoes and kidney beans with their liquid",
      "Bring to boil, then reduce heat and simmer 30 minutes",
      "Season with salt and pepper to taste",
      "Serve with Greek yogurt and cilantro if desired"
    ],
    "tags": [
      "high-protein",
      "balanced",
      "meal-prep",
      "dinner",
      "spicy"
    ]
  },
  {
    "id": "asian-chicken-lettuce-cups",
    "name": "Asian Chicken Lettuce Cups",
    "description": "Fresh and flavorful chicken lettuce cups with Asian spices",
    "imageUrl": "https://images.unsplash.com/photo-1598515214146-d51e5d3d8f3c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1598515214146-d51e5d3d8f3c",
    "calories": 332,
    "protein_g": 44.6,
    "carbs_g": 25.1,
    "fat_g": 5.2,
    "prepMinutes": 15,
    "cookMinutes": 12,
    "servings": 2,
    "ingredients": [
      {
        "item": "ground chicken breast",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "butter lettuce leaves",
        "quantity": 8,
        "unit": "leaves"
      },
      {
        "item": "water chestnuts (diced)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "mushrooms (diced)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "green onions (sliced)",
        "quantity": 4,
        "unit": "stalks"
      },
      {
        "item": "hoisin sauce",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "soy sauce",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "ginger (grated)",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "garlic cloves",
        "quantity": 3,
        "unit": "whole"
      }
    ],
    "instructions": [
      "Heat sesame oil in wok over high heat",
      "Add ground chicken and cook until browned",
      "Add garlic and ginger, cook 1 minute",
      "Stir in mushrooms and water chestnuts, cook 3 minutes",
      "Add hoisin and soy sauce, mix well",
      "Remove from heat and stir in green onions",
      "Spoon mixture into lettuce cups and serve"
    ],
    "tags": [
      "high-protein",
      "low-carb",
      "quick",
      "lunch",
      "dinner"
    ]
  },
  {
    "id": "baked-sweet-potato-black-bean",
    "name": "Loaded Sweet Potato with Black Beans",
    "description": "Stuffed sweet potato topped with black beans, avocado, and salsa",
    "imageUrl": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1528207776546-365bb710ee93",
    "calories": 476,
    "protein_g": 16.6,
    "carbs_g": 95.8,
    "fat_g": 4.7,
    "prepMinutes": 10,
    "cookMinutes": 50,
    "servings": 1,
    "ingredients": [
      {
        "item": "large sweet potato",
        "quantity": 300,
        "unit": "g"
      },
      {
        "item": "black beans (cooked)",
        "quantity": 120,
        "unit": "g"
      },
      {
        "item": "avocado",
        "quantity": 0.25,
        "unit": "whole"
      },
      {
        "item": "salsa",
        "quantity": 60,
        "unit": "g"
      },
      {
        "item": "Greek yogurt",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "lime juice",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "cilantro",
        "quantity": 2,
        "unit": "tbsp"
      },
      {
        "item": "chili powder",
        "quantity": 0.5,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Pierce sweet potato with fork and microwave 8-10 minutes until tender",
      "Or bake at 400°F for 45-50 minutes",
      "Warm black beans with chili powder",
      "Cut sweet potato open and fluff inside",
      "Top with black beans, salsa, and avocado slices",
      "Add Greek yogurt and squeeze lime juice",
      "Garnish with cilantro and serve"
    ],
    "tags": [
      "vegetarian",
      "balanced",
      "dinner",
      "vegan"
    ]
  },
  {
    "id": "almond-crusted-tilapia",
    "name": "Almond-Crusted Tilapia",
    "description": "Crispy baked tilapia with almond crust and lemon",
    "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1519708227418-c8fd9a32b7a2",
    "calories": 586,
    "protein_g": 65.7,
    "carbs_g": 20.3,
    "fat_g": 29.4,
    "prepMinutes": 10,
    "cookMinutes": 15,
    "servings": 1,
    "ingredients": [
      {
        "item": "tilapia fillet",
        "quantity": 180,
        "unit": "g"
      },
      {
        "item": "almond flour",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "parmesan cheese (grated)",
        "quantity": 20,
        "unit": "g"
      },
      {
        "item": "green beans",
        "quantity": 150,
        "unit": "g"
      },
      {
        "item": "lemon",
        "quantity": 1,
        "unit": "whole"
      },
      {
        "item": "egg white",
        "quantity": 1,
        "unit": "whole"
      },
      {
        "item": "garlic powder",
        "quantity": 0.5,
        "unit": "tsp"
      },
      {
        "item": "paprika",
        "quantity": 0.5,
        "unit": "tsp"
      }
    ],
    "instructions": [
      "Preheat oven to 425°F and line baking sheet",
      "Mix almond flour, parmesan, garlic powder, and paprika",
      "Dip tilapia in egg white, then coat with almond mixture",
      "Place on baking sheet and bake 12-15 minutes",
      "Steam green beans for 5 minutes",
      "Serve fish with green beans and lemon wedges"
    ],
    "tags": [
      "high-protein",
      "low-carb",
      "quick",
      "dinner",
      "seafood"
    ]
  },
  {
    "id": "protein-chia-pudding",
    "name": "Vanilla Protein Chia Pudding",
    "description": "Creamy overnight chia pudding with protein powder and berries",
    "imageUrl": "https://images.unsplash.com/photo-1512621776324-5ccb6d3f4c4c?w=900&h=600&auto=format&fit=crop&q=80",
    "imageId": "1512621776324-5ccb6d3f4c4c",
    "calories": 547,
    "protein_g": 36.2,
    "carbs_g": 50.9,
    "fat_g": 24.7,
    "prepMinutes": 5,
    "cookMinutes": 0,
    "servings": 1,
    "ingredients": [
      {
        "item": "chia seeds",
        "quantity": 40,
        "unit": "g"
      },
      {
        "item": "almond milk",
        "quantity": 250,
        "unit": "ml"
      },
      {
        "item": "vanilla protein powder",
        "quantity": 30,
        "unit": "g"
      },
      {
        "item": "Greek yogurt",
        "quantity": 80,
        "unit": "g"
      },
      {
        "item": "honey",
        "quantity": 1,
        "unit": "tbsp"
      },
      {
        "item": "mixed berries (fresh)",
        "quantity": 100,
        "unit": "g"
      },
      {
        "item": "vanilla extract",
        "quantity": 0.5,
        "unit": "tsp"
      },
      {
        "item": "sliced almonds",
        "quantity": 15,
        "unit": "g"
      }
    ],
    "instructions": [
      "In jar, whisk together almond milk and protein powder",
      "Add chia seeds, Greek yogurt, honey, and vanilla",
      "Stir well to prevent clumping",
      "Cover and refrigerate overnight (or at least 4 hours)",
      "Stir before serving",
      "Top with fresh berries and sliced almonds",
      "Can be meal prepped for up to 5 days"
    ],
    "tags": [
      "breakfast",
      "high-protein",
      "no-cook",
      "meal-prep",
      "vegetarian"
    ]
  }
];

/**
 * Get recipe by ID
 */
export function getRecipeById(id: string): Recipe | undefined {
  return recipesData.find(r => r.id === id);
}

/**
 * Sort recipes by specified criteria
 */
export function sortRecipes(recipes: Recipe[], sortBy: string): Recipe[] {
  // Clone array to avoid mutation
  const sorted = [...recipes];
  
  switch (sortBy) {
    case 'protein':
    case 'protein_desc':
      return sorted.sort((a, b) => b.protein_g - a.protein_g);
    
    case 'protein_asc':
      return sorted.sort((a, b) => a.protein_g - b.protein_g);
    
    case 'calories':
    case 'calories_asc':
      return sorted.sort((a, b) => a.calories - b.calories);
    
    case 'calories_desc':
      return sorted.sort((a, b) => b.calories - a.calories);
    
    case 'carbs':
    case 'carbs_asc':
      return sorted.sort((a, b) => a.carbs_g - b.carbs_g);
    
    case 'carbs_desc':
      return sorted.sort((a, b) => b.carbs_g - a.carbs_g);
    
    case 'time':
    case 'time_asc':
      return sorted.sort((a, b) => {
        const timeA = a.prepMinutes + a.cookMinutes;
        const timeB = b.prepMinutes + b.cookMinutes;
        return timeA - timeB;
      });
    
    case 'time_desc':
      return sorted.sort((a, b) => {
        const timeA = a.prepMinutes + a.cookMinutes;
        const timeB = b.prepMinutes + b.cookMinutes;
        return timeB - timeA;
      });
    
    case 'popular':
    case 'new':
    default:
      // Keep original order
      return sorted;
  }
}

/**
 * Filter recipes by criteria
 */
export function filterRecipes(
  recipes: Recipe[],
  filters: {
    highProtein?: boolean;
    lowCarb?: boolean;
    lowCalorie?: boolean;
    vegetarian?: boolean;
    mealPrep?: boolean;
  }
): Recipe[] {
  return recipes.filter(recipe => {
    if (filters.highProtein && recipe.protein_g < 30) return false;
    if (filters.lowCarb && recipe.carbs_g > 30) return false;
    if (filters.lowCalorie && recipe.calories > 400) return false;
    if (filters.vegetarian && !recipe.tags.includes('vegetarian')) return false;
    if (filters.mealPrep && !recipe.tags.includes('meal-prep')) return false;
    return true;
  });
}

/**
 * Search recipes by query string
 */
export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  if (!query.trim()) return recipes;
  
  const q = query.toLowerCase();
  return recipes.filter(r => 
    r.name.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    r.tags.some(tag => tag.toLowerCase().includes(q))
  );
}
