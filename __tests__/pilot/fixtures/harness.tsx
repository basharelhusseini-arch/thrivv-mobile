// Synthetic browser rehearsal only. Never imported by application routes.
import React from 'react';
import {createRoot} from 'react-dom/client';
import MainLayout from '@/components/MainLayout';
import Dashboard from '@/app/member/dashboard/page';
import Reminders from '@/app/member/notifications/page';
import LogWorkout from '@/app/member/workouts/log/page';
import LoggedWorkoutHistory from '@/components/LoggedWorkoutHistory';
import GymPilotAnalytics from '@/components/GymPilotAnalytics';
import AdminRewards from '@/components/AdminRewards';
import GymWorkoutVerification from '@/components/GymWorkoutVerification';
import Rewards from '@/app/member/rewards/page';
const memberId='11111111-1111-4111-8111-111111111111';
const path=location.pathname;
const body=path==='/member/workouts/log'?<LogWorkout/>:path==='/member/workouts'?<LoggedWorkoutHistory memberId={memberId}/>:path==='/member/notifications'?<Reminders/>:path==='/admin/gyms'?<AdminRewards/>:path.startsWith('/gym/')?<GymPilotAnalytics gymId="22222222-2222-4222-8222-222222222222"/>:path==='/member/scan-workout'?<GymWorkoutVerification scanner/>:path==='/member/rewards'?<Rewards/>:<Dashboard/>;
createRoot(document.getElementById('root')!).render(<MainLayout serverIdentity={{status:'authenticated',userId:memberId}}>{body}</MainLayout>);
