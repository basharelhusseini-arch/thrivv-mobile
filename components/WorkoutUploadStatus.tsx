'use client';
import { useTranslation } from '@/lib/i18n/client';

import {useEffect, useState} from 'react';
import {discardQueuedWorkout, flushWorkoutQueue, queuedWorkouts, type QueuedWorkout} from '@/lib/workout-upload-queue';
export default function WorkoutUploadStatus({memberId}:{memberId:string}) {
  const { t, locale } = useTranslation();
  const [rows,setRows]=useState<QueuedWorkout[]>([]);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    let busy=false;
    const sync=async()=>{
      if(busy) return; busy=true;
      try {
        const count=await flushWorkoutQueue(memberId,controller.signal);
        if(controller.signal.aborted) return;
        setRows(queuedWorkouts(memberId));
        if(count) setNotice(`${count} ${count===1?'workout':'workouts'} synced.`);
      } catch { if(!controller.signal.aborted) setNotice('Device storage is unavailable. Keep your workout open until it is saved.'); }
      finally {busy=false;}
    };
    const wake=()=>void sync();
    void sync();
    window.addEventListener('online',wake);window.addEventListener('thrivv:upload-queue',wake);window.addEventListener('storage',wake);
    const timer=setInterval(wake,30000);
    return ()=>{controller.abort();clearInterval(timer);window.removeEventListener('online',wake);window.removeEventListener('thrivv:upload-queue',wake);window.removeEventListener('storage',wake);};
  },[memberId]);
  if(!rows.length&&!notice) return null;
  return <aside className="mb-5 rounded-xl border border-white/10 p-4 text-sm" aria-label={t("Workout sync status")}>
    <p role="status">{rows.length?t("{0} workouts saved on this device · waiting to sync", { 0: rows.length }):notice}</p>
    {rows.map(row=><div key={row.payload.requestId} className="mt-2"><span>{row.payload.name} · {row.error || t("Will upload while Thrivv is open and connected.")}</span>{row.error&&<button className="ms-3 underline" onClick={()=>{if(window.confirm('Remove this upload from this device? Check your saved history first.')) discardQueuedWorkout(memberId,row.payload.requestId);}}>{t("Remove from queue")}</button>}</div>)}
    {rows.length>0&&<button className="mt-2 underline" onClick={()=>window.dispatchEvent(new Event('thrivv:upload-queue'))}>{t("Retry sync")}</button>}
  </aside>;
}
