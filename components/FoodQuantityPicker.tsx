'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { addFoodPortionToToday } from '@/lib/nutrition-log';
import { completeNutrition, formatNutrient, scaleFood, type BrowserFood, type FoodNutrition, type LoggedFoodPortion } from '@/lib/food-portions';

export default function FoodQuantityPicker({ food }: { food: BrowserFood }) {
  const [quantity, setQuantity] = useState(food.basis === '100g' ? '100' : '1');
  const [unit, setUnit] = useState<LoggedFoodPortion['unit']>(food.basis === '100g' ? 'g' : 'serving');
  const [status, setStatus] = useState<'idle' | 'saving' | 'added'>('idle');
  const [error, setError] = useState('');
  const saving = useRef(false);
  const submissionId = useRef<string>();
  let nutrition: FoodNutrition | undefined;
  try { nutrition = scaleFood(food, Number(quantity), unit); } catch { /* Invalid input remains editable. */ }

  const add = async () => {
    if (saving.current || status === 'added' || !nutrition) return;
    saving.current = true;
    setStatus('saving');
    setError('');
    try {
      const memberId = localStorage.getItem('memberId');
      if (!memberId) throw new Error('Please sign in to add food to your log.');
      submissionId.current ??= crypto.randomUUID();
      await addFoodPortionToToday(memberId, food, Number(quantity), unit, submissionId.current);
      setStatus('added');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Please try again.');
      setStatus('idle');
    } finally { saving.current = false; }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-thrivv-gold-500/20 pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-thrivv-text-secondary">
          Quantity
          <input aria-label={`Quantity for ${food.name}`} type="number" min="0.01" max="10000" step="any"
            value={quantity} onChange={event => setQuantity(event.target.value)} disabled={status !== 'idle'}
            className="input-premium block w-28 mt-1 px-3 py-2" />
        </label>
        <label className="text-sm text-thrivv-text-secondary">
          Unit
          <select aria-label={`Unit for ${food.name}`} value={unit} disabled={status !== 'idle'}
            onChange={event => { setUnit(event.target.value as typeof unit); setQuantity(event.target.value === 'g' ? '100' : '1'); }}
            className="input-premium block max-w-full mt-1 px-3 py-2">
            {food.basis === 'serving' ? <option value="serving">Servings</option> : <option value="g">Grams</option>}
            {food.portion && <option value="portion">{food.portion.label} ({food.portion.grams} g)</option>}
          </select>
        </label>
        <button type="button" onClick={add} disabled={!nutrition || status !== 'idle'} className="btn-primary px-4 py-2 disabled:opacity-50">
          {status === 'added' ? 'Added to today' : status === 'saving' ? 'Adding…' : 'Add to today'}
        </button>
      </div>
      {nutrition ? <p className="text-sm text-thrivv-text-secondary">
        Selected quantity: {formatNutrient(nutrition.calories)} kcal · Protein {formatNutrient(nutrition.protein_g)} g · Carbs {formatNutrient(nutrition.carbs_g)} g · Fat {formatNutrient(nutrition.fat_g)} g
      </p> : <p className="text-sm text-thrivv-text-secondary">{completeNutrition(food.nutrition) ? 'Enter a quantity greater than 0 and no more than 10,000.' : 'Nutrition data is incomplete. Logging is unavailable for this item.'}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {status === 'added' && <div role="status" className="flex flex-wrap gap-4 text-sm text-thrivv-gold-500">
        <Link href="/member/nutrition" className="underline">View food log</Link>
        <button type="button" className="underline" onClick={() => { submissionId.current = undefined; setStatus('idle'); }}>Add another portion</button>
      </div>}
    </div>
  );
}
