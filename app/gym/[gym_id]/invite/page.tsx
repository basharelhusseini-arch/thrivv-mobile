import GymAccessPage from '../_components/GymAccessPage';
import GymJoinCode from '@/components/GymJoinCode';
import GymInvitation from '../dashboard/_components/GymInvitation';
export const dynamic = 'force-dynamic';
export default function GymInvitePage({ params }: { params: { gym_id: string } }) {
  return <GymAccessPage gymId={params.gym_id} section="invite" title="Invite your members" description="Share a joining code or invitation link. Members join your gym from their own Thrivv account.">
    <div className="grid gap-5 xl:grid-cols-2"><section className="dark-card p-6 space-y-4"><h2 className="text-xl font-semibold">Share a joining code</h2><GymJoinCode gymId={params.gym_id} /></section><GymInvitation gymId={params.gym_id} /></div>
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><h2 className="font-medium">A simple start</h2><ol className="mt-3 grid gap-3 text-sm text-thrivv-text-secondary sm:grid-cols-3"><li><span className="text-thrivv-gold-500">01.</span> Share the code with your members.</li><li><span className="text-thrivv-gold-500">02.</span> They join your gym in Thrivv.</li><li><span className="text-thrivv-gold-500">03.</span> Display the workout QR at reception.</li></ol></section>
  </GymAccessPage>;
}
