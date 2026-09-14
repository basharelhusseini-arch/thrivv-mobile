'use client';

import { MouseEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { portalWorkspaceUrl } from '@/lib/gym-routing';

/** Explicit authenticated handoff before a full navigation to another host. */
export default function WorkspaceLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const [hostname, setHostname] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef(false);
  useEffect(() => { setHostname(window.location.hostname); }, []);
  async function navigate(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true; setPending(true); setError('');
    try {
      const response = await fetch('/api/auth/workspace', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destination: href }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || 'Unable to switch workspaces. Please retry.');
      const target = portalWorkspaceUrl(window.location.hostname, href);
      if (result.destination !== target) throw new Error('Unable to switch workspaces. Please retry.');
      window.location.assign(target);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to switch workspaces. Please retry.');
      pendingRef.current = false; setPending(false);
    }
  }
  return <div className="min-w-0"><a href={portalWorkspaceUrl(hostname, href)} onClick={navigate} aria-disabled={pending || undefined} aria-busy={pending || undefined} className={className}>{children}{pending && <span role="status" className="ml-2 text-xs text-thrivv-text-muted">Opening…</span>}</a>{error && <p role="alert" className="px-3 pb-2 text-xs text-red-400">{error}</p>}</div>;
}
