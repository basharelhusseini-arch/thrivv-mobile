'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Target, TrendingUp, LogOut, Dumbbell, Plus, Sparkles } from 'lucide-react';
import { WorkoutPlan } from '@/types';
import PageHeader from '@/components/PageHeader';

export default function MemberWorkoutsPage() {
  const router = useRouter();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('memberId');
    if (!id) {
      router.push('/member/login');
      return;
    }
    setMemberId(id);
    fetchWorkoutPlans(id);
  }, [router]);

  const fetchWorkoutPlans = async (memberId: string) => {
    try {
      const response = await fetch(`/api/workout-plans?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkoutPlans(data);
      }
    } catch (error) {
      console.error('Failed to fetch workout plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberName');
    router.push('/member/login');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Dumbbell className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading workouts
          </span>
        </div>
      </div>
    );
  }

  const activePlans = workoutPlans.filter(p => p.status === 'active');
  const completedPlans = workoutPlans.filter(p => p.status === 'completed');

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Training"
        title="My Workouts"
        subtitle="Personalised plans built around your goals, equipment, and recovery."
        action={
          <Link
            href="/workouts/new"
            className="flex items-center btn-primary px-6 py-3"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate New Plan
          </Link>
        }
      />

      <main className="space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrivv-text-secondary text-sm">Total Plans</p>
                <p className="mt-2 text-3xl font-semibold text-thrivv-text-primary">{workoutPlans.length}</p>
              </div>
              <div className="icon-badge">
                <Dumbbell className="w-6 h-6 text-thrivv-gold-500" />
              </div>
            </div>
          </div>
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrivv-text-secondary text-sm">Active Plans</p>
                <p className="mt-2 text-3xl font-semibold text-thrivv-text-primary">{activePlans.length}</p>
              </div>
              <div className="icon-badge">
                <TrendingUp className="w-6 h-6 text-thrivv-neon-green" />
              </div>
            </div>
          </div>
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrivv-text-secondary text-sm">Completed</p>
                <p className="mt-2 text-3xl font-semibold text-thrivv-text-primary">{completedPlans.length}</p>
              </div>
              <div className="icon-badge">
                <Target className="w-6 h-6 text-thrivv-gold-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Workout Plans List */}
        {workoutPlans.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <div className="icon-badge w-20 h-20 mx-auto mb-6">
              <Dumbbell className="w-10 h-10 text-thrivv-gold-500" />
            </div>
            <h3 className="text-2xl font-semibold text-thrivv-text-primary mb-2">No workout plans yet</h3>
            <p className="text-thrivv-text-secondary mb-8">Generate your first AI-powered workout plan</p>
            <Link
              href="/workouts/new"
              className="inline-flex items-center btn-primary px-6 py-3"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Workout Plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workoutPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/workouts/${plan.id}`}
                className="premium-card p-6 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-thrivv-text-primary mb-1">{plan.name}</h3>
                    <p className="text-sm text-thrivv-text-secondary line-clamp-2">{plan.description}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-lg ${
                    plan.status === 'active' ? 'success-badge' :
                    plan.status === 'completed' ? 'bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20' :
                    'bg-thrivv-bg-card text-thrivv-text-muted border border-thrivv-gold-500/10'
                  }`}>
                    {plan.status}
                  </span>
                </div>
                <div className="space-y-3 mb-4 text-sm text-thrivv-text-secondary">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                    <span className="capitalize">{plan.goal.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                    Difficulty: <span className="capitalize ml-1">{plan.difficulty}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                    {plan.duration} weeks • {plan.frequency}x/week
                  </div>
                </div>
                <div className="flex items-center text-thrivv-gold-500 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  View Details →
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
