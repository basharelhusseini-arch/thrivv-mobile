'use client';
import {useEffect} from 'react';
import {useClientSession,LOGOUT_EVENT} from '@/lib/client-session';
import {sendNativeReminders} from '@/lib/native-reminders';
import {isNativeApp} from '@/lib/mobile-app';
export default function NativeReminderSync(){
 const {user}=useClientSession();
 useEffect(()=>{
  if(!isNativeApp(navigator.userAgent))return;
  let active=true;let pending=false;let generation=0;
  async function refresh(){if(!user?.id || document.hidden || pending)return;pending=true;const current=generation;
   try{const r=await fetch(`/api/member/notifications?memberId=${user.id}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(r.ok){const d=await r.json();if(active && current===generation)sendNativeReminders(d.scheduled);}}
   catch{/* Retry on next foreground; the member's saved preferences remain authoritative. */}finally{pending=false;}}
  const clear=()=>{generation++;sendNativeReminders([]);};
  void refresh();document.addEventListener('visibilitychange',refresh);window.addEventListener('thrivv:workouts-synced',refresh);window.addEventListener('thrivv:reminders-changed',refresh);window.addEventListener(LOGOUT_EVENT,clear);
  return()=>{active=false;generation++;document.removeEventListener('visibilitychange',refresh);window.removeEventListener('thrivv:workouts-synced',refresh);window.removeEventListener('thrivv:reminders-changed',refresh);window.removeEventListener(LOGOUT_EVENT,clear);};
 },[user?.id]);return null;
}
