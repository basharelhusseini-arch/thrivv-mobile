// Standalone synthetic browser rehearsal. Never imported by app routes.
import React from 'react';
import {createRoot} from 'react-dom/client';
import MainLayout from '@/components/MainLayout';
import Home from '@/app/member/dashboard/page';
import Rewards from '@/app/member/rewards/page';
import Workouts from '@/app/member/workouts/page';
import Checkin from '@/app/member/checkin/page';
import Bookings from '@/app/member/bookings/page';
import GymDashboard from '@/app/gym/[gym_id]/dashboard/_components/GymDashboardView';
import GymWorkoutQr from '@/components/GymWorkoutQr';
const gym={id:'22222222-2222-4222-8222-222222222222',name:'Synthetic gym',owner_email:'gym@example.test',pilot_start_date:null,pilot_member_count:0,created_at:'2026-09-01'};
const data={gym,pilot_week_number:null,date_range:{from:'2026-09-08',to:'2026-09-14'},totals:{total_members:28,pilot_member_count:0,active_this_week:16,active_this_week_pct:57,active_prev_week:14},activity_definition:'Daily check-ins are recorded app activity, separate from verified gym workouts.',unknown_membership_dates:0,earned_points:{status:'available',value:940,reason:'Points credited at this gym'},verified_scans:{status:'available',total:48,last_seven_days:21,reason:'Accepted QR verifications'},verified_visitors:{value:18,status:'available'},week4_retention:null,streak_leaderboard:[],daily_checkins_30d:[],recent_activity:[],viewer:{is_admin:true,is_owner:false}};
const path=location.pathname;
const Page=path==='/member/rewards'?Rewards:path==='/member/workouts'?Workouts:path==='/member/checkin'?Checkin:path==='/member/bookings'?Bookings:Home;
createRoot(document.getElementById('root')!).render(<MainLayout serverIdentity={{status:"authenticated",userId:"11111111-1111-4111-8111-111111111111"}}>{path.endsWith('/qr')?<GymWorkoutQr gymId={gym.id} displayMode/>:path.startsWith('/gym/')?<GymDashboard data={data}/>:<Page/>}</MainLayout>);
