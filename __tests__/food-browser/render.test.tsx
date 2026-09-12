import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MemberRecipesPage from '@/app/member/recipes/page';
import FoodQuantityPicker from '@/components/FoodQuantityPicker';
import { recipesData } from '@/lib/recipes';
import { basicIngredients } from '@/lib/basic-ingredients';
(global as any).React = React;

test('browser renders every existing recipe link, new ingredient category, and no image elements', () => {
  const html = renderToStaticMarkup(<MemberRecipesPage />);
  recipesData.forEach(recipe => expect(html).toContain(`href="/member/recipes/${recipe.id}"`));
  expect(html).toContain('Basic Ingredients');
  expect(html).not.toMatch(/<img|<picture/);
  expect(html).toContain('Per 1 serving');
});

test('ingredient picker defaults to 100g with an explicitly weighted egg alternative', () => {
  const egg = basicIngredients.find(food => food.fdcId === 171287)!;
  const html = renderToStaticMarkup(<FoodQuantityPicker food={egg} />);
  expect(html).toContain('value="100"');
  expect(html).toContain('1 large egg (50 g)');
  expect(html).toContain('143 kcal');
  expect(html).toContain('Add to today');
});
