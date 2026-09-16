'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Ticket } from 'lucide-react';
import { receiptExpired, safePartnerUrl, type RewardReceipt } from '@/lib/rewards/catalog';

export default function RewardVoucher({ receipt }: { receipt: RewardReceipt }) {
  const [copyMessage, setCopyMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const expired = receiptExpired(receipt, now);
  const offer = receipt.offer_snapshot || {};
  const usable = receipt.status === 'issued' && !!receipt.discount_code && !expired;
  const url = safePartnerUrl(offer.website_url);
  async function copyCode() {
    try { await navigator.clipboard.writeText(receipt.discount_code!); setCopyMessage('Code copied'); }
    catch { setCopyMessage('Press and hold the code to copy it.'); }
  }
  return <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 font-semibold text-white"><Ticket size={18} className="text-thrivv-gold-400" />{offer.name || receipt.reward_offers?.name || receipt.offer_id}</h2>
        {offer.partner_name && <p className="mt-1 text-sm text-thrivv-text-secondary">{offer.partner_name}</p>}
        <p className="mt-2 text-xs text-thrivv-text-muted">{new Date(receipt.created_at).toLocaleDateString()} · {receipt.points} points redeemed</p></div>
      <span className="rounded-full border border-thrivv-gold-500/20 px-3 py-1 text-xs capitalize text-thrivv-gold-400">{receipt.status === 'issued' ? expired ? 'Expired' : 'Ready to use' : receipt.status.replaceAll('_', ' ')}</span>
    </div>
    {usable ? <div className="mt-5 space-y-3 rounded-xl border border-thrivv-gold-500/30 bg-thrivv-gold-500/5 p-4">
      <p className="text-xs uppercase tracking-widest text-thrivv-text-secondary">Your discount code</p>
      <code className="block select-all break-all text-2xl font-semibold tracking-wider text-thrivv-gold-400">{receipt.discount_code}</code>
      <button type="button" onClick={() => void copyCode()} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm"><Copy size={16} />Copy code</button>
      {copyMessage && <p role="status" className="text-sm">{copyMessage}</p>}
      {offer.instructions && <p className="whitespace-pre-wrap text-sm text-thrivv-text-secondary">{offer.instructions}</p>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-thrivv-gold-400 underline">Shop with {offer.partner_name || 'partner'}</a>}
      <p className="text-xs text-thrivv-text-muted">Keep your code private. The partner validates it at checkout.</p>
    </div> : <p className="mt-4 text-sm text-thrivv-text-secondary">{expired && receipt.status === 'issued' ? 'This discount code has expired.' : receipt.status === 'pending' ? 'This earlier redemption is awaiting partner confirmation. Contact support with your reference.' : receipt.status === 'fulfilled' ? 'This reward has been fulfilled.' : receipt.status === 'cancelled' ? 'This redemption was cancelled. Check Point history for any balance adjustment.' : 'Contact support for redemption instructions.'}</p>}
    {receipt.expires_at && <p className="mt-3 text-xs text-thrivv-text-muted">Valid until {new Date(receipt.expires_at).toLocaleString()}</p>}
    {offer.terms && <details className="mt-3 text-sm text-thrivv-text-secondary"><summary className="cursor-pointer">Offer terms</summary><p className="mt-2 whitespace-pre-wrap">{offer.terms}</p></details>}
    <p className="mt-4 break-all text-xs text-thrivv-text-muted">Reference: {receipt.id}</p>
    <Link href="/member/account/support" className="mt-3 inline-block text-sm text-thrivv-gold-400 underline">Help with this reward</Link>
  </article>;
}
