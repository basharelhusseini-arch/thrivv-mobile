import React from 'react';
import {createRoot} from 'react-dom/client';
import WorkoutLogForm from '@/components/WorkoutLogForm';
import WorkoutUploadStatus from '@/components/WorkoutUploadStatus';
import LoggedWorkoutHistory from '@/components/LoggedWorkoutHistory';
import Dashboard from '@/app/member/dashboard/page';
import OperationsQueue from '@/components/OperationsQueue';
const view=new URLSearchParams(location.search).get('view');
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl space-y-8 p-5 text-white">{view==='dashboard'?<Dashboard/>:view==='operations'?<OperationsQueue/>:<><WorkoutUploadStatus memberId="fixture-member"/><WorkoutLogForm memberId="fixture-member" onSaved={()=>{}}/><LoggedWorkoutHistory memberId="fixture-member"/></>}</main>);
