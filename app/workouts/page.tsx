import { redirect } from 'next/navigation';
export default function LegacyWorkouts() { redirect('/member/workouts?tab=plans'); }
