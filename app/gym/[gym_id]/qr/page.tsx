import GymAccessPage from '../_components/GymAccessPage';
import GymWorkoutQr from '@/components/GymWorkoutQr';
export const dynamic = 'force-dynamic';
export default function GymQrPage({ params }: { params: { gym_id: string } }) {
  return <GymAccessPage gymId={params.gym_id} section="qr" title="Ready when your members are" description="Keep this screen visible at reception. The workout QR refreshes automatically."><GymWorkoutQr gymId={params.gym_id} displayMode /></GymAccessPage>;
}
