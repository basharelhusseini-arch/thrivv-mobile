'use client';
import {useEffect,useState} from 'react';
export default function WorkoutRestTimer(){
 const [duration,setDuration]=useState(90);const [ends,setEnds]=useState<number|null>(null);const [left,setLeft]=useState<number|null>(null);
 useEffect(()=>{if(ends===null)return;const tick=()=>{const remaining=Math.max(0,Math.ceil((ends-Date.now())/1000));setLeft(remaining);if(!remaining)setEnds(null);};tick();const timer=setInterval(tick,250);return()=>clearInterval(timer);},[ends]);
 return <details className="rounded-lg border border-white/10 p-4"><summary className="cursor-pointer text-sm">Rest timer (optional)</summary><div className="mt-3 flex flex-wrap items-center gap-3"><label>Rest <select aria-label="Rest duration" className="rounded bg-black p-2" value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[30,60,90,120,180].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label><button type="button" className="underline" onClick={()=>{setLeft(duration);setEnds(Date.now()+duration*1000);}}>{ends?'Restart':'Start'}</button><button type="button" className="underline" onClick={()=>{setEnds(null);setLeft(null);}}>Clear</button><span role="status">{left===null?'':left===0?'Rest complete':`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`}</span></div></details>;
}
