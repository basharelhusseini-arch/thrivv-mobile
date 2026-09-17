'use client';
import {useEffect,useState} from 'react';
import type {workoutProgress} from '@/lib/manual-workouts';
export function useWorkoutProgress(memberId:string,revision=0,before?:string,exclude?:string){
 const key=[memberId,revision,before,exclude].join(':');
 const [state,setState]=useState<{key:string;progress:ReturnType<typeof workoutProgress>;error:string}>({key:'',progress:[],error:''});
 useEffect(()=>{
  const controller=new AbortController();
  const query=new URLSearchParams({expectedUserId:memberId});if(before)query.set('before',before);if(exclude)query.set('exclude',exclude);
  fetch(`/api/workouts/progress?${query}`,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async r=>{if(!r.ok)throw new Error();return r.json();})
   .then(data=>{if(!controller.signal.aborted)setState({key,progress:data.progress||[],error:''});})
   .catch(()=>{if(!controller.signal.aborted)setState({key,progress:[],error:'Workout progress unavailable. Please retry.'});});
  return()=>controller.abort();
 },[memberId,before,exclude,key]);
 return state.key===key?state:{progress:[],error:''};
}
