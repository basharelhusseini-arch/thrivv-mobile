'use client';
import { useEffect, useState } from 'react';
import { readJson, useAction, buttonClass } from '@/components/SupportInbox';
type Status = {due:number; paused:number; running:number; oldestDue:string|null; failures:{id:string;sync_attempts:number;last_sync_error:string}[]};
export default function SyncOperations() {
  const [data,setData]=useState<Status|null>(null);const [error,setError]=useState(''); const action=useAction();
  async function load(){try{setData(await readJson('/api/admin/operations'));setError('');}catch{setError('Sync operations unavailable.');}}
  useEffect(()=>{void load();},[]);
  return <section className="premium-card space-y-3 p-5"><div className="flex justify-between gap-3"><h3 className="text-lg font-semibold">Background sync</h3><button className={buttonClass} onClick={()=>void load()}>Refresh</button></div>
    {error && <p role="alert">{error}</p>}{data && <><p>{data.due} waiting · {data.running} processing · {data.paused} paused after repeated failures</p><p className="text-xs text-thrivv-text-muted">Oldest waiting: {data.oldestDue ? new Date(data.oldestDue).toLocaleString() : 'None'}. Three imports run concurrently, with bounded retries.</p>
    {data.failures.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"><p className="break-all text-xs">{row.id} · {row.sync_attempts} attempts · {row.last_sync_error || 'Worker interrupted'}</p><button disabled={action.busy} className={buttonClass} onClick={()=>action.run('/api/admin/operations',{userId:row.id,reason:'Operator requested retry after reviewing stalled import'},load)}>Queue retry</button></div>)}</>}
    {action.message && <p role="status">{action.message}</p>}
  </section>;
}
