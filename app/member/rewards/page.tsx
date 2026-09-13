'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, Star, Gift, TrendingUp, Zap, Award, DollarSign, Users, Dumbbell, UtensilsCrossed, Lock, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import GymWorkoutVerification, { type VerificationStatus } from '@/components/GymWorkoutVerification';
import PageHeader from '@/components/MemberPageHeader';

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
  const [daily, setDaily] = useState<VerificationStatus | null>(null);
  const [rewardError, setRewardError] = useState('');
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<{id:string; kind:string; amount:number; score_date:string|null; created_at:string}[]>([]);
  const [activeOffers, setActiveOffers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
  const [riskCheckInProgress, setRiskCheckInProgress] = useState(false);
  
  const redemptionRequests = useRef<Record<string, string>>({});

  const fetchHealthScore = useCallback(async (id: string) => {
    try {
      setRewardError('');
      // Fetch actual reward points from API
      const rewardsResponse = await fetch('/api/rewards/points');
      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json();
        setPoints(rewardsData.points);
        setDaily(rewardsData.daily);
        setTransactions(rewardsData.transactions || []);
        setActiveOffers(Object.fromEntries((rewardsData.offers || []).map((o: {id: string; points: number}) => [o.id, Number(o.points)])));
        setRedeemedRewards((rewardsData.redemptions || []).map((r: { offer_id: string }) => r.offer_id));
      }

      if (!rewardsResponse.ok) { setRewardError('Rewards are unavailable. Your balance could not be loaded.'); setActiveOffers({}); }
    } catch (error) {
      setRewardError('Rewards are unavailable. Please reload to retry.');
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
    if (points < reward.points || reward.redeemed) return;
    
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
        subtitle={daily?.rewardsEnabled ? 'View your earned points and explore available rewards.' : 'View your points balance. Daily gym-verified rewards are not activated yet.'}
      />

      <main>
        {rewardError && <p role="alert" className="text-amber-300 mb-4">{rewardError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="dark-card p-6"><p className="text-4xl font-bold">{rewardError ? '—' : points}</p><p className="text-gray-400">Available spendable points</p></div>
          <div className="dark-card p-6"><p className="text-4xl font-bold">{daily?.score ?? '—'}</p><p className="text-gray-400">Health Score /110</p></div>
          <div className="dark-card p-6"><p className="text-4xl font-bold text-thrivv-gold-400">{daily?.creditedPoints ?? '—'}</p><p className="text-gray-400">Today’s credited points</p>
            <p className="text-sm text-gray-400 mt-2">Estimated: {daily?.estimatedPoints ?? '—'} · {daily?.rewardStatus.replaceAll('_', ' ') ?? 'Unavailable'}</p></div>
        </div>
        <GymWorkoutVerification />
        <div className="dark-card p-6 my-8 space-y-3">
          <h3 className="text-lg font-semibold">How to earn points</h3>
          <p className="text-gray-400">Once activated, sync your workout, then scan your gym’s changing QR within two hours of finishing. The highest-scoring workout supplying your daily training score must be verified.</p>
          <p className="text-gray-400">An eligible complete Health Score earns the same number of points: 43.5/110 earns 43.5 points, up to 110 each day. Incomplete scores are estimates. Later verified score changes adjust the existing award.</p>
          <p className="text-gray-400">Training /80 + WHOOP Recovery /20 + habits /10. No food contribution or reward multiplier. Weekly rankings continue to use Health Scores.</p>
          {daily?.rewardStatus === 'review_required' && <p className="text-amber-300">A score correction needs support review. Redemptions are paused until it is resolved.</p>}
        </div>

        <div className="dark-card p-6 mb-8 space-y-3"><h3 className="text-lg font-semibold">Recent point transactions</h3>
          {rewardError ? <p className="text-gray-400">Transaction history unavailable.</p> : transactions.length ? <ul className="divide-y divide-gray-800">{transactions.map(t => <li key={t.id} className="py-3 flex flex-wrap justify-between gap-2 text-sm"><span>{t.kind.replaceAll('_',' ')} · {t.score_date || new Date(t.created_at).toLocaleDateString()}</span><span>{Number(t.amount)>0?'+':''}{t.amount} points</span></li>)}</ul> : <p className="text-gray-400">No recorded transactions yet.</p>}
          <p className="text-xs text-gray-500">Latest 30 records. Opening balances preserve earlier account balances; they are not new gym earnings.</p>
        </div>
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
                      {available ? `Need ${reward.points - points} more points` : 'Coming soon'}
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
            Follow a training plan appropriate to your recovery. Do not train harder simply to earn points; only activated, eligible daily awards enter your spendable balance.
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
