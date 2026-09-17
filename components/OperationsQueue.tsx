'use client';
import {useEffect,useState} from 'react';
import {readJson,useAction,buttonClass} from './SupportInbox';
type Issue={id:string;priority:number;kind:string;title:string;tab:string;target:string;observed:string};
export default function OperationsQueue(){
 const [offset,setOffset]=useState(0);const [data,setData]=useState<{issues:Issue[];total:number;alertsConfigured:boolean}|null>(null);const [error,setError]=useState('');const action=useAction();
 async function load(){try{setData(await readJson(`/api/admin/attention?offset=${offset}`));setError('');}catch{setError('Attention queue unavailable. Please retry.');}}
 useEffect(()=>{void load();const timer=setInterval(()=>{if(!document.hidden)void load();},60000);return()=>clearInterval(timer);},[offset]); // eslint-disable-line react-hooks/exhaustive-deps
 return <section className="premium-card space-y-4 p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">Needs attention {data?`(${data.total})`:''}</h2><button className={buttonClass} onClick={()=>void load()}>Refresh</button></div><p className="text-xs text-thrivv-text-muted">Urgent failures first, then oldest issues. Resolved issues leave this queue automatically.</p>
 {error&&<p role="alert">{error}</p>}{data&&!data.alertsConfigured&&<p className="text-sm text-amber-200">Email alerts need configuration. The queue is available here.</p>}
 {data?.issues.map(row=><article key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"><div><p className="text-sm">P{row.priority} · {row.title}</p><p className="text-xs text-thrivv-text-muted">{new Date(row.observed).toLocaleString()}</p></div>{row.kind==='sync'?<button disabled={action.busy} className={buttonClass} onClick={()=>action.run('/api/admin/operations',{userId:row.target,reason:'Reviewed paused sync in attention queue'},load)}>Retry sync</button>:row.kind==='error'?<span className="break-all text-xs text-thrivv-text-muted">Reference: {row.target.slice(0,12)}</span>:<a className="text-sm underline" href={`/admin/gyms?tab=${encodeURIComponent(row.tab)}`}>Review</a>}</article>)}
 {data?.total===0&&<p>No issues need attention.</p>}{action.message&&<p role="status">{action.message}</p>}
 {data&&data.total>50&&<div className="flex gap-4"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</button><span>{offset+1}–{Math.min(offset+50,data.total)}</span><button disabled={offset+50>=data.total} onClick={()=>setOffset(offset+50)}>Next</button></div>}
 </section>;
}
