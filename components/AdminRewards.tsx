'use client';
import { useEffect, useRef, useState } from 'react';
import { REWARD_TIERS, type RewardCategory, type RewardOffer } from '@/lib/rewards/catalog';
import { readJson, useAction, inputClass, buttonClass } from '@/components/SupportInbox';
import RewardOperations from '@/components/RewardOperations';
export default function AdminRewards() {
  const [offers, setOffers] = useState<RewardOffer[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function reload() { const d = await readJson('/api/admin/rewards'); setOffers(d.offers); setError(''); }
  useEffect(() => { reload().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <section className="space-y-6">
    <h2 className="text-2xl font-semibold">Partner rewards</h2>
    <p className="text-sm text-thrivv-text-secondary">Create an offer, load unique discount codes supplied by the partner, then activate it. Codes must already work in the partner’s checkout or be accepted by their staff. Each code is assigned once; the partner enforces single use at purchase.</p>
    {error && <p role="alert">{error} <button className="underline" onClick={() => reload().catch(e => setError(e.message))}>Retry</button></p>}
    <RewardOperations />
    <CreateOffer done={reload} />
    {loading ? <p>Loading offers…</p> : <div className="grid gap-4 lg:grid-cols-2">{offers.map(offer => <ManageOffer key={offer.id} offer={offer} done={reload} />)}{!offers.length && !error && <p>No partner offers yet.</p>}</div>}
  </section>;
}
function CreateOffer({ done }: { done: () => Promise<void> }) {
  const action = useAction(); const form = useRef<HTMLFormElement>(null); const id = useRef<string>();
  const [category, setCategory] = useState<RewardCategory>('restaurant');
  const tier = REWARD_TIERS[category];
  const [gyms, setGyms] = useState<{id: string; name: string}[]>([]);
  const [gymError, setGymError] = useState('');
  useEffect(() => { readJson('/api/admin/rewards/branches').then(d => setGyms(d.gyms)).catch(() => setGymError('Branches unavailable. Retry before creating a branch-specific offer.')); }, []);
  return <form ref={form} className="premium-card space-y-4 p-5" onSubmit={e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    id.current ||= crypto.randomUUID();
    action.run('/api/admin/rewards', { action: 'create', offerId: id.current, name: f.get('name'), partner_name: f.get('partner_name'), category,
      gym_id: f.get('gym_id'), location_label: f.get('location_label'), terms: f.get('terms'), instructions: f.get('instructions'), website_url: f.get('website_url'), expires_at: new Date(String(f.get('expires_at'))).toISOString(), reason: f.get('reason') }, async () => { await done(); form.current?.reset(); id.current = undefined; });
  }}>
    <h3 className="text-lg font-semibold">Create an offer</h3>
    <fieldset disabled={action.busy} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2"><label>Partner name<input name="partner_name" required minLength={2} maxLength={120} className={inputClass} /></label><label>Offer title<input name="name" required minLength={3} maxLength={120} placeholder="10% off selected protein products" className={inputClass} /></label></div>
      <label className="block">Category<select className={inputClass} value={category} onChange={e => setCategory(e.target.value as RewardCategory)}>{Object.entries(REWARD_TIERS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <p className="text-sm text-thrivv-gold-400">{tier.points} points → {tier.discount}% off · One redemption per member</p>
      {gymError && <p role="alert">{gymError}</p>}
      <label className="block">Branch eligibility<select name="gym_id" className={inputClass}><option value="">All branches</option>{gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label className="block">Where it can be used<input name="location_label" maxLength={200} placeholder="Online, or the participating partner location" className={inputClass} /></label>
      <label className="block">Terms<textarea name="terms" required minLength={3} maxLength={2000} placeholder="Eligible products, minimum spend, exclusions and any restrictions" className={inputClass} /></label>
      <label className="block">How to use the code<textarea name="instructions" required minLength={3} maxLength={2000} placeholder="Enter your code at checkout, or show it to staff before paying." className={inputClass} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label>Partner website (optional)<input name="website_url" type="url" placeholder="https://" maxLength={2000} className={inputClass} /></label><label>Code expiry (your local time)<input name="expires_at" type="datetime-local" required className={inputClass} /></label></div>
      <label className="block">Reason for this setup<input name="reason" required minLength={3} maxLength={500} className={inputClass} /></label>
      <button className={buttonClass}>Save inactive offer</button>
    </fieldset>
    {action.message && <p role="status">{action.message}</p>}
  </form>;
}
function ManageOffer({ offer, done }: { offer: RewardOffer; done: () => Promise<void> }) {
  const action = useAction(); const [codes, setCodes] = useState(''); const [reason, setReason] = useState(''); const [approved, setApproved] = useState(false);
  return <article className="premium-card space-y-4 p-5">
    <h3 className="font-semibold">{offer.name}</h3><p className="text-sm">{offer.partner_name} · {offer.points} points · {offer.active ? 'Active' : 'Inactive'}</p>
    <p className="text-sm text-thrivv-gold-400">{offer.remaining || 0} unassigned codes</p>
    {offer.lowStock && <p role="status" className="text-sm text-amber-200">Low code stock — contact the partner before this offer runs out.</p>}
    <p className="text-xs">{offer.location_label || "All participating locations"}</p>
    <p className="text-xs">Expires: {offer.expires_at ? new Date(offer.expires_at).toLocaleString() : 'Not configured'}</p>
    <p className="whitespace-pre-wrap text-sm text-thrivv-text-secondary">{offer.terms}</p>
    <label className="block text-sm">Reason for change<input value={reason} onChange={e => setReason(e.target.value)} minLength={3} maxLength={500} className={inputClass} disabled={action.busy} /></label>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); action.run('/api/admin/rewards', { action: 'codes', offerId: offer.id, codes: codes.split(/\r?\n/).map(c => c.trim()).filter(Boolean), reason }, async () => { await done(); setCodes(''); }); }}>
      <label className="block text-sm">Partner-issued codes (one per line, up to 100)<textarea rows={4} value={codes} onChange={e => setCodes(e.target.value)} required className={inputClass} disabled={action.busy} autoComplete="off" spellCheck={false} /></label>
      <button disabled={action.busy || reason.trim().length < 3} className={buttonClass}>Add codes</button>
    </form>
    {!offer.active && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />The partner approved these terms and codes, including the expiry and single-use checkout restriction.</label>}
    <button disabled={action.busy || reason.trim().length < 3 || (!offer.active && (!approved || !offer.remaining))} className={buttonClass} onClick={() => action.run('/api/admin/rewards', { action: 'active', offerId: offer.id, active: !offer.active, partnerApproved: approved, reason }, done)}>{offer.active ? 'Pause offer' : 'Activate offer'}</button>
    {action.message && <p role="status">{action.message}</p>}
  </article>;
}
