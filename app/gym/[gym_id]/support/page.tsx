import GymAccessPage from '../_components/GymAccessPage';
import SupportInbox from '@/components/SupportInbox';
export const dynamic = 'force-dynamic';
export default function GymSupportPage({ params }: { params: { gym_id: string } }) {
  return <GymAccessPage gymId={params.gym_id} section="support" title="Here to help" description="Ask a question and keep track of replies from the Thrivv team."><SupportInbox /></GymAccessPage>;
}
