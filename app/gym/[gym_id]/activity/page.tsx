import GymAccessPage from '../_components/GymAccessPage';
import GymActivity from '../_components/GymActivity';
export const dynamic = 'force-dynamic';
export default function GymActivityPage({ params }: { params: { gym_id: string } }) {
  return <GymAccessPage gymId={params.gym_id} section="activity" title="Verified activity" description="See who verified a workout with your gym’s rotating QR and the reward status for their day."><GymActivity gymId={params.gym_id} /></GymAccessPage>;
}
