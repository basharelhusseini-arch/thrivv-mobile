import GymAccessPage from '../_components/GymAccessPage';
import GymMembers from '../_components/GymMembers';
export const dynamic = 'force-dynamic';
export default async function GymMembersPage(props: { params: Promise<{ gym_id: string }> }) {
  const params = await props.params;
  return <GymAccessPage gymId={params.gym_id} section="members" title="Members on Thrivv" description="Your connected members, their joining dates and their latest verified workout at this gym."><GymMembers gymId={params.gym_id} /></GymAccessPage>;
}
