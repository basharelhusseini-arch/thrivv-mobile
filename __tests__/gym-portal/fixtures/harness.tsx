// Browser-only synthetic harness. Not an application route or production build entry.
import React from 'react';
import { createRoot } from 'react-dom/client';
import MainLayout from '@/components/MainLayout';
import Login from '@/app/member/login/page';
import GymWorkoutQr from '@/components/GymWorkoutQr';
import GymJoinCode from '@/components/GymJoinCode';
const gym = '00000000-0000-4000-8000-000000000001';
createRoot(document.getElementById('root')!).render(
  <MainLayout serverIdentity={{status:"authenticated",userId:"synthetic"}}>{location.pathname === '/member/login' ? <Login /> : <>
    <h1>Synthetic gym</h1><GymJoinCode gymId={gym} /><GymWorkoutQr gymId={gym} />
  </>}</MainLayout>
);
