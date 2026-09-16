import { Lightbulb } from 'lucide-react';
import { getExerciseById } from '@/lib/exercises';

const generalTips = [
  'Use a controlled movement and a comfortable range of motion.',
  'Choose a load you can move with consistent form.',
  'Stop if you feel pain and ask a qualified coach to check your technique.',
];

export default function WorkoutCoachingTips({ exerciseId }: { exerciseId?: string }) {
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-thrivv-gold-400">
        <Lightbulb size={15} aria-hidden="true" />
        {exercise ? 'Coaching tips' : 'General coaching tips'}
      </h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-thrivv-text-secondary">
        {(exercise?.tips.length ? exercise.tips : generalTips).map(tip => <li key={tip}>{tip}</li>)}
      </ul>
    </div>
  );
}
