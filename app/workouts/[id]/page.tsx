'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Target, Calendar, Clock, TrendingUp, Dumbbell, ChevronDown, ChevronUp, CheckCircle2, Wind, Timer, Zap, Activity } from 'lucide-react';
import { WorkoutPlan, Workout, Exercise } from '@/types';
import WorkoutDeleteButton from '@/components/WorkoutDeleteButton';

export default function WorkoutPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(true);
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!planId) return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setPlan(null);
    setWorkouts([]);
    setExpandedExercises(new Set());
    setLoading(true);

    const load = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      return response.ok ? response.json() : null;
    };
    void Promise.allSettled([
      load(`/api/workout-plans/${encodeURIComponent(planId)}`),
      load(`/api/workouts?workoutPlanId=${encodeURIComponent(planId)}`),
      load('/api/exercises'),
    ]).then(([planResult, workoutsResult, exercisesResult]) => {
      if (!active) return;
      if (planResult.status === 'fulfilled' && planResult.value?.id === planId) setPlan(planResult.value);
      if (workoutsResult.status === 'fulfilled' && Array.isArray(workoutsResult.value)) setWorkouts(workoutsResult.value);
      if (exercisesResult.status === 'fulfilled' && Array.isArray(exercisesResult.value)) {
        const exercisesMap: Record<string, Exercise> = {};
        exercisesResult.value.forEach((exercise: Exercise) => { exercisesMap[exercise.id] = exercise; });
        setExercises(exercisesMap);
      }
      setLoadedPlanId(planId);
      setLoading(false);
    }).finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [planId]);

  if (loading || loadedPlanId !== planId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-thrivv-bg-dark">
        <div className="text-center">
          <Activity className="w-12 h-12 text-thrivv-gold-500 mx-auto mb-4 animate-pulse" />
          <p className="text-thrivv-text-secondary">Loading workout plan...</p>
        </div>
      </div>
    );
  }

  if (!plan || plan.id !== planId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-thrivv-bg-dark">
        <div className="premium-card p-12 text-center">
          <Dumbbell className="w-16 h-16 text-thrivv-text-muted mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-thrivv-text-primary mb-2">Workout plan not found</h3>
          <p className="text-thrivv-text-secondary mb-8">This workout plan may have been deleted or doesn&apos;t exist</p>
          <Link
            href="/workouts"
            className="btn-primary px-6 py-3 inline-flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Workouts
          </Link>
        </div>
      </div>
    );
  }

  const completedWorkouts = workouts.filter(w => w.status === 'completed').length;
  const scheduledWorkouts = workouts.filter(w => w.status === 'scheduled').length;

  const toggleExercise = (exerciseKey: string) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseKey)) {
        newSet.delete(exerciseKey);
      } else {
        newSet.add(exerciseKey);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-thrivv-bg-dark">
      {/* Back Link */}
      <div className="mb-8 animate-fade-in-up">
        <Link
          href="/workouts"
          className="inline-flex items-center text-thrivv-text-secondary hover:text-thrivv-gold-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Workouts
        </Link>
      </div>

      {/* Hero Section - Plan Header */}
      <div className="mb-12 animate-fade-in-up">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1 basis-64">
            <h1 className="text-4xl font-semibold text-thrivv-text-primary mb-2">
              {plan.name}
            </h1>
            <p className="text-thrivv-text-secondary mb-6">{plan.description}</p>
            
            {/* Plan Metadata */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center text-sm text-thrivv-text-secondary">
                <Target className="w-4 h-4 mr-1.5 text-thrivv-gold-500" />
                <span className="capitalize">{plan.goal.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center text-sm text-thrivv-text-secondary">
                <TrendingUp className="w-4 h-4 mr-1.5 text-thrivv-gold-500" />
                <span className="capitalize">{plan.difficulty}</span>
              </div>
              <div className="flex items-center text-sm text-thrivv-text-secondary">
                <Calendar className="w-4 h-4 mr-1.5 text-thrivv-gold-500" />
                {plan.duration} weeks
              </div>
              <div className="flex items-center text-sm text-thrivv-text-secondary">
                <Clock className="w-4 h-4 mr-1.5 text-thrivv-gold-500" />
                {plan.frequency}x per week
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 ml-6">
            <span className={`text-xs px-3 py-1 rounded-lg capitalize ${
              plan.status === 'active' ? 'success-badge' :
              plan.status === 'completed' ? 'bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20' :
              'bg-thrivv-bg-card text-thrivv-text-muted border border-thrivv-gold-500/10'
            }`}>
              {plan.status}
            </span>
            <WorkoutDeleteButton key={plan.id} kind="plan" id={plan.id} memberId={plan.memberId} name={plan.name}
              onDeleted={() => router.replace('/member/workouts')} />
          </div>
        </div>
      </div>

      <main className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrivv-text-secondary text-sm">Total Workouts</p>
                <p className="mt-2 text-3xl font-semibold text-thrivv-text-primary">{workouts.length}</p>
              </div>
              <div className="icon-badge">
                <Dumbbell className="w-6 h-6 text-thrivv-gold-500" />
              </div>
            </div>
          </div>
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrivv-text-secondary text-sm">Completed</p>
                <p className="mt-2 text-3xl font-semibold text-thrivv-text-primary">{completedWorkouts}</p>
              </div>
              <div className="icon-badge">
                <CheckCircle2 className="w-6 h-6 text-thrivv-neon-green" />
              </div>
            </div>
          </div>
          <div className="premium-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-thrivv-text-secondary text-sm">Scheduled</p>
                <p className="mt-2 text-3xl font-semibold text-thrivv-text-primary">{scheduledWorkouts}</p>
              </div>
              <div className="icon-badge">
                <Calendar className="w-6 h-6 text-thrivv-gold-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Workouts List Section */}
        <div>
          <h2 className="text-2xl font-semibold text-thrivv-text-primary mb-6">Workouts</h2>
          
          {workouts.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <div className="icon-badge w-20 h-20 mx-auto mb-6">
                <Dumbbell className="w-10 h-10 text-thrivv-gold-500" />
              </div>
              <h3 className="text-2xl font-semibold text-thrivv-text-primary mb-2">No workouts in this plan</h3>
              <p className="text-thrivv-text-secondary">Workouts will appear here once they&apos;re scheduled</p>
            </div>
          ) : (
            <div className="space-y-6">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="premium-card p-6"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-thrivv-text-primary mb-2">{workout.name}</h3>
                      
                      {/* Day Theme & Purpose */}
                      {workout.dayTheme && (
                        <div className="mb-3 bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 rounded-lg p-3">
                          <p className="text-sm font-semibold text-thrivv-gold-500 mb-1">
                            {workout.dayTheme}
                          </p>
                          {workout.purpose && (
                            <p className="text-xs text-thrivv-text-secondary leading-relaxed">
                              {workout.purpose}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-thrivv-text-secondary">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5 text-thrivv-gold-500" />
                          {new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {workout.duration && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1.5 text-thrivv-gold-500" />
                            {workout.duration} min
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-lg capitalize ${
                      workout.status === 'completed' ? 'success-badge' :
                      workout.status === 'in_progress' ? 'bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20' :
                      workout.status === 'skipped' ? 'error-badge' :
                      'bg-thrivv-bg-card text-thrivv-text-muted border border-thrivv-gold-500/10'
                    }`}>
                      {workout.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Warm-up Section */}
                  {workout.warmup && (
                    <div className="mb-6 bg-thrivv-gold-500/5 border border-thrivv-gold-500/20 rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-thrivv-gold-500 mb-4 flex items-center">
                        <Wind className="w-4 h-4 mr-2" />
                        Warm-up Protocol
                      </h4>
                      
                      {/* General Warm-up */}
                      {workout.warmup.general && workout.warmup.general.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-thrivv-text-secondary mb-2">General (5-8 min)</p>
                          <ul className="space-y-1 text-sm text-thrivv-text-primary ml-4">
                            {workout.warmup.general.map((item, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-thrivv-gold-500 mr-2">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Mobility */}
                      {workout.warmup.mobility && workout.warmup.mobility.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-thrivv-text-secondary mb-2">Mobility/Activation (3-6 min)</p>
                          <ul className="space-y-1 text-sm text-thrivv-text-primary ml-4">
                            {workout.warmup.mobility.map((item, i) => (
                              <li key={i} className="flex items-start">
                                <span className="text-thrivv-gold-500 mr-2">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Ramp Sets */}
                      {workout.warmup.rampSets && workout.warmup.rampSets.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-thrivv-text-secondary mb-2">Specific Warm-up Sets</p>
                          <div className="space-y-2">
                            {workout.warmup.rampSets.map((set, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-thrivv-bg-dark rounded-lg p-2">
                                <span className="text-thrivv-text-primary font-medium">
                                  Set {i + 1}: {set.percent1RM === 0 ? 'Bar' : `${set.percent1RM}% × ${set.reps}`}
                                </span>
                                {set.notes && (
                                  <span className="text-xs text-thrivv-text-muted italic">{set.notes}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Week/Session Info */}
                  {(workout.weekNumber || workout.sessionType) && (
                    <div className="flex items-center gap-2 mb-4">
                      {workout.weekNumber && (
                        <span className="text-xs px-2 py-1 bg-thrivv-bg-card text-thrivv-text-secondary border border-thrivv-gold-500/10 rounded">
                          Week {workout.weekNumber}
                        </span>
                      )}
                      {workout.sessionType && (
                        <span className={`text-xs px-2 py-1 rounded capitalize ${
                          workout.sessionType === 'deload' ? 'bg-thrivv-neon-green/10 text-thrivv-neon-green border border-thrivv-neon-green/20' :
                          workout.sessionType === 'strength' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {workout.sessionType}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Exercises */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-thrivv-text-secondary mb-4">Working Sets</h4>
                    {workout.exercises.map((ex, index) => {
                      const exercise = exercises[ex.exerciseId];
                      const exerciseKey = `${workout.id}-${index}`;
                      const isExpanded = expandedExercises.has(exerciseKey);
                      
                      if (!exercise) {
                        return (
                          <div key={index} className="bg-thrivv-bg-card rounded-xl p-4 border border-thrivv-gold-500/10">
                            <p className="text-sm text-thrivv-text-muted">Exercise data not found</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={index}
                          className="bg-thrivv-bg-card border border-thrivv-gold-500/10 rounded-xl overflow-hidden hover:border-thrivv-gold-500/30 transition-all"
                        >
                          {/* Exercise Header - Always Visible */}
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-lg bg-thrivv-gold-500 text-black flex items-center justify-center font-semibold text-sm">
                                    {index + 1}
                                  </div>
                                  <h5 className="font-semibold text-thrivv-text-primary text-base">{exercise.name}</h5>
                                </div>
                                <p className="text-sm text-thrivv-text-secondary ml-11">{exercise.description}</p>
                              </div>
                              <button
                                onClick={() => toggleExercise(exerciseKey)}
                                className="ml-4 p-2 hover:bg-thrivv-gold-500/10 rounded-lg transition-colors"
                                title={isExpanded ? "Hide details" : "Show details"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-thrivv-text-secondary" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-thrivv-text-secondary" />
                                )}
                              </button>
                            </div>

                            {/* Exercise Prescription */}
                            <div className="ml-11 flex flex-wrap gap-2 text-sm">
                              {ex.isMainLift && (
                                <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-semibold text-xs flex items-center">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Main Lift
                                </span>
                              )}
                              <span className="px-3 py-1 bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20 rounded-lg font-medium">
                                {ex.sets} sets
                              </span>
                              {ex.reps && (
                                <span className="px-3 py-1 bg-thrivv-bg-dark text-thrivv-text-primary border border-thrivv-gold-500/10 rounded-lg font-medium">
                                  {ex.reps} reps
                                </span>
                              )}
                              {ex.duration && (
                                <span className="px-3 py-1 bg-thrivv-bg-dark text-thrivv-text-primary border border-thrivv-gold-500/10 rounded-lg font-medium">
                                  {ex.duration}s hold
                                </span>
                              )}
                              {ex.percent1RM && (
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg font-semibold">
                                  @ {ex.percent1RM}% 1RM
                                </span>
                              )}
                              {ex.rpe && (
                                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg font-semibold">
                                  RPE {ex.rpe}
                                </span>
                              )}
                              {ex.tempo && (
                                <span className="px-3 py-1 bg-thrivv-bg-dark text-thrivv-text-secondary border border-thrivv-gold-500/10 rounded-lg font-medium flex items-center">
                                  <Timer className="w-3 h-3 mr-1" />
                                  {ex.tempo}
                                </span>
                              )}
                              {ex.weight && (
                                <span className="px-3 py-1 bg-thrivv-gold-500/10 text-thrivv-gold-500 border border-thrivv-gold-500/20 rounded-lg font-medium">
                                  {ex.weight} lbs
                                </span>
                              )}
                              <span className="px-3 py-1 bg-thrivv-bg-dark text-thrivv-text-secondary border border-thrivv-gold-500/10 rounded-lg font-medium">
                                Rest: {ex.restSeconds}s
                              </span>
                              <span className="px-3 py-1 bg-thrivv-bg-dark text-thrivv-text-muted border border-thrivv-gold-500/10 rounded-lg capitalize text-xs">
                                {exercise.difficulty}
                              </span>
                              <span className="px-3 py-1 bg-thrivv-neon-green/10 text-thrivv-neon-green border border-thrivv-neon-green/20 rounded-lg capitalize text-xs">
                                {exercise.equipment.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Expandable Details */}
                            {isExpanded && (
                              <div className="mt-6 ml-11 space-y-6 animate-fade-in-up">
                                {/* Coaching Cues */}
                                {ex.coachingCues && ex.coachingCues.length > 0 && (
                                  <div className="bg-thrivv-gold-500/5 border border-thrivv-gold-500/20 rounded-lg p-4">
                                    <h6 className="font-semibold text-thrivv-gold-500 mb-2 flex items-center gap-2">
                                      <Target className="w-4 h-4" />
                                      Focus Points
                                    </h6>
                                    <ul className="space-y-1">
                                      {ex.coachingCues.map((cue, i) => (
                                        <li key={i} className="text-sm text-thrivv-text-primary flex items-start">
                                          <span className="text-thrivv-gold-500 mr-2">→</span>
                                          {cue}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Instructions */}
                                <div>
                                  <h6 className="font-semibold text-thrivv-text-primary mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-thrivv-gold-500" />
                                    How to Perform
                                  </h6>
                                  <ol className="space-y-2">
                                    {exercise.instructions.map((instruction, i) => (
                                      <li key={i} className="text-sm text-thrivv-text-secondary leading-relaxed">
                                        <span className="font-semibold text-thrivv-gold-500 mr-2">{i + 1}.</span>
                                        {instruction}
                                      </li>
                                    ))}
                                  </ol>
                                </div>

                                {/* Coaching Tips */}
                                <div className="bg-thrivv-gold-500/5 border border-thrivv-gold-500/20 rounded-xl p-4">
                                  <h6 className="font-semibold text-thrivv-text-primary mb-3 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-thrivv-gold-500" />
                                    Coaching Tips
                                  </h6>
                                  <ul className="space-y-2">
                                    {exercise.tips.map((tip, i) => (
                                      <li key={i} className="text-sm text-thrivv-text-secondary leading-relaxed flex items-start gap-2">
                                        <span className="text-thrivv-gold-500 mt-0.5">▪</span>
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Additional Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Breathing */}
                                  <div className="bg-thrivv-bg-dark border border-thrivv-gold-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Wind className="w-5 h-5 text-thrivv-gold-500" />
                                      <h6 className="font-semibold text-thrivv-text-primary text-sm">Breathing</h6>
                                    </div>
                                    <p className="text-sm text-thrivv-text-secondary leading-relaxed">{exercise.breathing}</p>
                                  </div>

                                  {/* Tempo */}
                                  <div className="bg-thrivv-bg-dark border border-thrivv-gold-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Timer className="w-5 h-5 text-thrivv-gold-500" />
                                      <h6 className="font-semibold text-thrivv-text-primary text-sm">Tempo</h6>
                                    </div>
                                    <p className="text-sm text-thrivv-text-secondary leading-relaxed">{exercise.tempo}</p>
                                  </div>

                                  {/* Rest Recommendation */}
                                  <div className="bg-thrivv-bg-dark border border-thrivv-gold-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Clock className="w-5 h-5 text-thrivv-gold-500" />
                                      <h6 className="font-semibold text-thrivv-text-primary text-sm">Rest Time</h6>
                                    </div>
                                    <p className="text-sm text-thrivv-text-secondary leading-relaxed">{exercise.rest}</p>
                                  </div>
                                </div>

                                {/* Muscle Groups */}
                                <div>
                                  <h6 className="font-semibold text-thrivv-text-primary mb-3 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-thrivv-gold-500" />
                                    Target Muscles
                                  </h6>
                                  <div className="flex flex-wrap gap-2">
                                    {exercise.muscleGroups.map((muscle, i) => (
                                      <span
                                        key={i}
                                        className="px-3 py-1 bg-thrivv-gold-500/10 text-thrivv-gold-500 text-sm rounded-lg border border-thrivv-gold-500/20 capitalize font-medium"
                                      >
                                        {muscle}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Recommended Sets/Reps by Level */}
                                <div>
                                  <h6 className="font-semibold text-thrivv-text-primary mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-thrivv-gold-500" />
                                    Programming Guide
                                  </h6>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="bg-thrivv-neon-green/10 border border-thrivv-neon-green/20 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-thrivv-neon-green uppercase mb-1">Beginner</p>
                                      <p className="text-sm font-medium text-thrivv-text-primary">
                                        {exercise.recommendedSets.beginner.sets} sets × {exercise.recommendedSets.beginner.reps || exercise.recommendedSets.beginner.duration}
                                      </p>
                                    </div>
                                    <div className="bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-thrivv-gold-500 uppercase mb-1">Intermediate</p>
                                      <p className="text-sm font-medium text-thrivv-text-primary">
                                        {exercise.recommendedSets.intermediate.sets} sets × {exercise.recommendedSets.intermediate.reps || exercise.recommendedSets.intermediate.duration}
                                      </p>
                                    </div>
                                    <div className="bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-thrivv-gold-500 uppercase mb-1">Advanced</p>
                                      <p className="text-sm font-medium text-thrivv-text-primary">
                                        {exercise.recommendedSets.advanced.sets} sets × {exercise.recommendedSets.advanced.reps || exercise.recommendedSets.advanced.duration}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Show Details Button (when collapsed) */}
                            {!isExpanded && (
                              <button
                                onClick={() => toggleExercise(exerciseKey)}
                                className="mt-4 ml-11 text-sm text-thrivv-gold-500 hover:text-thrivv-gold-400 font-medium flex items-center gap-1 transition-colors"
                              >
                                <ChevronDown className="w-4 h-4" />
                                Show exercise details
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
