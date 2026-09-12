'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, Star, Gift, TrendingUp, Zap, Award, DollarSign, Users, Dumbbell, UtensilsCrossed, Lock, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import PageHeader from '@/components/MemberPageHeader';
import { formatRewardPoints } from '@/lib/rewards/daily';

interface RewardSummary {
  points: number;
  deficit: number;
  healthScore: number | null;
  complete: boolean;
  enabled: boolean;
  activationDate: string | null;
  timezone: string;
  earnedSinceActivation: number;
  today: { status: string; amount: number | null };
  history: { date: string; amount: number; timezone: string }[];
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  category: 'classes' | 'trainers' | 'restaurants' | 'brands';
  icon: any;
  discount: string;
  color: string;
  redeemed: boolean;
}

export default function RewardsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [activeOffers, setActiveOffers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
  const [riskCheckInProgress, setRiskCheckInProgress] = useState(false);
  
  const redemptionRequests = useRef<Record<string, string>>({});

  const fetchHealthScore = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/rewards/points', { cache: 'no-store' });
      if (!response.ok) throw new Error('Reward balance is unavailable. Please try again shortly.');
      const data = await response.json();
      setSummary(data);
      setPoints(data.points);
      setActiveOffers(Object.fromEntries((data.offers || []).map((o: { id: string; points: number }) => [o.id, Number(o.points)])));
      setRedeemedRewards((data.redemptions || []).map((r: { offer_id: string }) => r.offer_id));
      setBalanceError(null);
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Unable to read reward balance.');
      setSummary(null);
      setActiveOffers({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedMemberId = localStorage.getItem('memberId');
    if (!storedMemberId) {
      router.push('/member/login');
      return;
    }
    setMemberId(storedMemberId);
    fetchHealthScore(storedMemberId);
  }, [router, fetchHealthScore]);

  const handleRedeem = async (reward: Reward) => {
    if (!summary || balanceError || points < reward.points || reward.redeemed || riskCheckInProgress) return;
    
    if (!confirm(`Redeem ${reward.name} for ${reward.points} points?`)) return;

    setRiskCheckInProgress(true);
    const requestId = redemptionRequests.current[reward.id] ||= crypto.randomUUID();
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: reward.id, requestId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setRedeemedRewards(previous => [...previous, reward.id]);
      if (memberId) await fetchHealthScore(memberId);
      alert(`Redemption recorded. Reference: ${result.redemption.id}. Partner fulfillment is pending.`);
    } catch (error) { alert(error instanceof Error ? error.message : 'Unable to redeem. Please retry.'); }
    finally { setRiskCheckInProgress(false); }
  };

  const rewards: Reward[] = [
    // Classes Rewards
    {
      id: 'class_10',
      name: '10% Off Classes',
      description: 'Get 10% discount on all group fitness classes for 1 month',
      points: 250,
      category: 'classes',
      icon: Dumbbell,
      discount: '10% OFF',
      color: 'from-blue-500 to-cyan-500',
      redeemed: redeemedRewards.includes('class_10')
    },
    {
      id: 'class_20',
      name: '20% Off Classes',
      description: 'Get 20% discount on all group fitness classes for 1 month',
      points: 500,
      category: 'classes',
      icon: Dumbbell,
      discount: '20% OFF',
      color: 'from-blue-600 to-cyan-600',
      redeemed: redeemedRewards.includes('class_20')
    },
    {
      id: 'class_free',
      name: '3 Free Classes',
      description: 'Get 3 complimentary group fitness classes of your choice',
      points: 750,
      category: 'classes',
      icon: Gift,
      discount: 'FREE',
      color: 'from-blue-700 to-cyan-700',
      redeemed: redeemedRewards.includes('class_free')
    },

    // Premium Trainers
    {
      id: 'trainer_bronze',
      name: 'Bronze Trainer Access',
      description: 'Unlock 1 session with premium certified trainers',
      points: 400,
      category: 'trainers',
      icon: Award,
      discount: '1 SESSION',
      color: 'from-thrivv-gold-500 to-amber-500',
      redeemed: redeemedRewards.includes('trainer_bronze')
    },
    {
      id: 'trainer_silver',
      name: 'Silver Trainer Access',
      description: 'Unlock 3 sessions with elite performance coaches',
      points: 800,
      category: 'trainers',
      icon: Award,
      discount: '3 SESSIONS',
      color: 'from-gray-400 to-gray-600',
      redeemed: redeemedRewards.includes('trainer_silver')
    },
    {
      id: 'trainer_gold',
      name: 'Gold Trainer Access',
      description: 'Get unlimited access to all premium trainers for 1 month',
      points: 1500,
      category: 'trainers',
      icon: Trophy,
      discount: 'UNLIMITED',
      color: 'bg-thrivv-gold-500',
      redeemed: redeemedRewards.includes('trainer_gold')
    },

    // Restaurants
    {
      id: 'food_15',
      name: 'Healthy Eats - 15% Off',
      description: '15% discount at partner healthy restaurants',
      points: 300,
      category: 'restaurants',
      icon: UtensilsCrossed,
      discount: '15% OFF',
      color: 'from-green-500 to-emerald-500',
      redeemed: redeemedRewards.includes('food_15')
    },
    {
      id: 'food_25',
      name: 'Nutrition Partners - 25% Off',
      description: '25% discount at all nutrition partner locations',
      points: 600,
      category: 'restaurants',
      icon: UtensilsCrossed,
      discount: '25% OFF',
      color: 'from-green-600 to-emerald-600',
      redeemed: redeemedRewards.includes('food_25')
    },
    {
      id: 'food_meal',
      name: 'Free Meal Plan',
      description: 'Get a complimentary custom meal plan from our nutritionist',
      points: 900,
      category: 'restaurants',
      icon: Gift,
      discount: 'FREE',
      color: 'from-green-700 to-emerald-700',
      redeemed: redeemedRewards.includes('food_meal')
    },

    // Fitness Brands
    {
      id: 'brand_10',
      name: 'Fitness Gear - 10% Off',
      description: '10% discount at partner fitness equipment stores',
      points: 200,
      category: 'brands',
      icon: Star,
      discount: '10% OFF',
      color: 'from-purple-500 to-pink-500',
      redeemed: redeemedRewards.includes('brand_10')
    },
    {
      id: 'brand_20',
      name: 'Athletic Wear - 20% Off',
      description: '20% discount on athletic apparel and accessories',
      points: 450,
      category: 'brands',
      icon: Star,
      discount: '20% OFF',
      color: 'from-purple-600 to-pink-600',
      redeemed: redeemedRewards.includes('brand_20')
    },
    {
      id: 'brand_free',
      name: 'Free Fitness Bundle',
      description: 'Free fitness accessories bundle (resistance bands, yoga mat, water bottle)',
      points: 1000,
      category: 'brands',
      icon: Gift,
      discount: 'FREE',
      color: 'from-purple-700 to-pink-700',
      redeemed: redeemedRewards.includes('brand_free')
    },
  ];

  const categories = [
    { id: 'classes', name: 'Classes', icon: Dumbbell, color: 'text-blue-400' },
    { id: 'trainers', name: 'Trainers', icon: Award, color: 'text-thrivv-gold-400' },
    { id: 'restaurants', name: 'Restaurants', icon: UtensilsCrossed, color: 'text-green-400' },
    { id: 'brands', name: 'Brands', icon: Star, color: 'text-purple-400' },
  ];

  const getPointsToNextTier = () => {
    if (points < 250) return 250 - points;
    if (points < 500) return 500 - points;
    if (points < 1000) return 1000 - points;
    if (points < 1500) return 1500 - points;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Trophy className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading rewards
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="member-future space-y-10" data-section="rewards">
      <PageHeader
        section="rewards"
        eyebrow="Rewards"
        title="Explore your rewards."
        subtitle={summary?.enabled ? 'Earn daily points from your verified Health Score and explore available rewards.' : 'View your points balance and explore available rewards. Daily Health Score rewards are not active yet.'}
      />

      <main>
        {balanceError && <div role="alert" className="dark-card p-5 mb-6 text-thrivv-gold-400">
          {balanceError} <button className="underline ml-2" onClick={() => memberId && fetchHealthScore(memberId)}>Retry</button>
        </div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[
            ['Available Points', summary?.points],
            ['Health Score /110', summary?.healthScore],
            [summary?.today.status === 'credited' ? 'Today’s credited points' : 'Today’s estimated points', summary?.today.amount],
            ['Earned since activation', summary?.earnedSinceActivation],
          ].map(([label, value]) => <div key={String(label)} className="dark-card p-6">
            <Trophy className="w-6 h-6 text-thrivv-gold-400 mb-4" />
            <div className="text-4xl font-bold text-thrivv-gold-400 mb-2">{formatRewardPoints(value as number | null | undefined)}</div>
            <div className="text-sm text-gray-400">{label}</div>
          </div>)}
        </div>
        {summary && <div className="dark-card p-6 mb-8 space-y-3 text-sm text-gray-300">
          <h3 className="text-lg font-semibold text-white">Daily Health Score rewards</h3>
          <p>One eligible Health Score point earns one redeemable point, up to 110 per day. Training /80 + Recovery /20 + Habits /10. Nutrition and confidence multipliers do not contribute.</p>
          <p>Today’s estimate is not yet spendable. A complete day is credited after 02:00 the following day in {summary.timezone}, once a successful WHOOP sync verifies the full day. Missing data stays pending.</p>
          <p>{summary.enabled ? `Rewards apply from ${summary.activationDate}.` : 'Daily rewards are not active. Existing available points remain separate.'}</p>
          {summary.today.status === 'pending' && <p className="text-thrivv-gold-400">Today’s reward is pending verified score data.</p>}
          {summary.deficit > 0 && <p className="text-thrivv-gold-400">A score correction left {formatRewardPoints(summary.deficit)} points to offset. Future earnings reduce this amount before becoming spendable. No payment is required.</p>}
          <p>Verified rest days can earn recovery and recorded habit points. You do not need to train harder to chase points.</p>
        </div>}
        {Boolean(summary?.history.length) && <div className="dark-card p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Recent credited days</h3>
          <ul className="space-y-3">{summary!.history.map(day => <li key={day.date} className="flex flex-wrap justify-between gap-2 text-sm text-gray-300">
            <span>{day.date} · {day.timezone}</span><span>{formatRewardPoints(day.amount)} points</span>
          </li>)}</ul>
          <p className="text-xs text-gray-400 mt-4">Amounts include score corrections. Earlier history and existing balances are preserved.</p>
        </div>}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg transition-all border border-gray-700/50 whitespace-nowrap flex items-center"
              >
                <Icon className={`w-4 h-4 mr-2 ${cat.color}`} />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((listedReward) => {
            const available = Object.prototype.hasOwnProperty.call(activeOffers, listedReward.id);
            const reward = { ...listedReward, points: activeOffers[listedReward.id] ?? listedReward.points };
            const Icon = reward.icon;
            const canAfford = available && points >= reward.points;
            const isRedeemed = reward.redeemed;

            return (
              <div
                key={reward.id}
                className={`dark-card overflow-hidden ${!canAfford && !isRedeemed ? 'opacity-60' : ''}`}
              >
                {/* Header */}
                <div className={`p-4 bg-gradient-to-r ${reward.color} relative`}>
                  <div className="absolute top-2 right-2">
                    <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold">
                      {reward.discount}
                    </div>
                  </div>
                  <Icon className="w-10 h-10 text-white mb-2" />
                  <h3 className="text-lg font-bold text-white">{reward.name}</h3>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-sm text-gray-400 mb-4">{reward.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-thrivv-gold-400">
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      <span className="font-bold">{reward.points}</span>
                      <span className="text-xs text-gray-500 ml-1">points</span>
                    </div>
                  </div>

                  {isRedeemed ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Redeemed
                    </button>
                  ) : canAfford ? (
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={riskCheckInProgress}
                      className={`w-full px-4 py-2 bg-gradient-to-r ${reward.color} text-white rounded-lg hover:opacity-90 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {riskCheckInProgress ? (
                        <span className="flex items-center justify-center">
                          <Shield className="w-4 h-4 mr-2 animate-pulse" />
                          Checking Security...
                        </span>
                      ) : (
                        'Redeem Now'
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-800/50 text-gray-500 rounded-lg border border-gray-700/50 flex items-center justify-center cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {available ? `Need ${formatRewardPoints(reward.points - points)} more points` : 'Coming soon'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro Tip */}
        <div className="dark-card p-6 mt-8 border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-white mb-2">💡 Pro Tip</h3>
          <p className="text-gray-400 text-sm">
            Earn points from eligible daily Health Scores. Available offers and partner fulfillment are managed separately.
          </p>
        </div>

        {/* Security Notice */}
        <div className="dark-card p-4 mt-6 border border-thrivv-gold-500/30 bg-thrivv-gold-500/5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-thrivv-gold-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-thrivv-gold-400">Security Protected</span> - Points and redemptions are recorded securely in your account.
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}
