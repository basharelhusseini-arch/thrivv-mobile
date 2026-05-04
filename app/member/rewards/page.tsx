'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, Star, Gift, TrendingUp, Zap, Award, DollarSign, Users, Dumbbell, UtensilsCrossed, Lock, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { useTypingFeatures } from '@/hooks/useTypingFeatures';
import PageHeader from '@/components/PageHeader';

interface HealthScore {
  total: number;
  workoutScore: number;
  dietScore: number;
  habitScore: number;
  sleepScore: number;
}

interface ConfidenceData {
  score: number;
  level: string;
  multiplier: number;
  totalRewardsScore: number;
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
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [confidenceData, setConfidenceData] = useState<ConfidenceData | null>(null);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [pendingReward, setPendingReward] = useState<Reward | null>(null);
  const [riskCheckInProgress, setRiskCheckInProgress] = useState(false);
  
  const typingFeatures = useTypingFeatures();

  const fetchHealthScore = useCallback(async (id: string) => {
    try {
      // Fetch actual reward points from API
      const rewardsResponse = await fetch('/api/rewards/points');
      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json();
        setPoints(rewardsData.points);
      }

      // Fetch health score for display
      const response = await fetch('/api/health/summary');
      let fetchedHealthScore = 0;
      if (response.ok) {
        const healthData = await response.json();
        fetchedHealthScore = healthData.score || 0;
        setHealthScore({
          total: healthData.score,
          workoutScore: healthData.components.training,
          dietScore: healthData.components.diet,
          habitScore: healthData.components.habits,
          sleepScore: healthData.components.sleep,
        });
      }

      // Fetch confidence score
      const confidenceResponse = await fetch('/api/health/confidence-score');
      if (confidenceResponse.ok) {
        const confData = await confidenceResponse.json();
        const healthTotal = fetchedHealthScore;
        const multiplier = 1 + ((confData.score - 30) / 100) * 0.25;
        const totalRewards = Math.round(healthTotal * multiplier);
        
        setConfidenceData({
          score: confData.score,
          level: confData.level,
          multiplier: multiplier,
          totalRewardsScore: totalRewards
        });
      }
    } catch (error) {
      console.error('Failed to fetch health score:', error);
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

    try {
      // Call risk scoring API
      const typingData = typingFeatures.getFeatures();
      
      const riskResponse = await fetch('/api/risk/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': memberId || '', // Pass user ID in header
        },
        body: JSON.stringify({
          eventType: 'reward_redeem',
          typingFeatures: typingData || undefined,
        }),
      });

      if (!riskResponse.ok) {
        throw new Error('Risk check failed');
      }

      const riskData = await riskResponse.json();
      console.log('🔒 Risk check:', riskData);

      // Handle different risk actions
      switch (riskData.action) {
        case 'allow':
          // Proceed with redemption
          setPoints(points - reward.points);
          setRedeemedRewards([...redeemedRewards, reward.id]);
          alert(`🎉 Success! ${reward.name} has been added to your account. Check your email for details.`);
          typingFeatures.reset();
          break;

        case 'step_up':
          // Show step-up authentication modal
          setPendingReward(reward);
          setShowStepUpModal(true);
          break;

        case 'hold':
          // Hold for review
          alert(`⏸️ Redemption on Hold\n\nYour redemption request is being reviewed for security. We'll email you within 24 hours.\n\nReason: ${riskData.reasons.join(', ')}`);
          break;

        case 'block':
          // Block redemption
          alert(`🚫 Redemption Blocked\n\nThis redemption was blocked for security reasons. Please contact support if you believe this is an error.\n\nReference: ${riskData.deviceId.slice(0, 8)}`);
          break;

        default:
          throw new Error('Unknown risk action');
      }
    } catch (error) {
      console.error('Risk check error:', error);
      alert('Security check failed. Please try again or contact support.');
    } finally {
      setRiskCheckInProgress(false);
    }
  };

  const handleStepUpVerify = () => {
    // In production, this would trigger email verification or re-authentication
    // For now, simulate verification and complete the redemption
    if (pendingReward) {
      setPoints(points - pendingReward.points);
      setRedeemedRewards([...redeemedRewards, pendingReward.id]);
      alert(`🎉 Verified! ${pendingReward.name} has been added to your account.`);
      setShowStepUpModal(false);
      setPendingReward(null);
      typingFeatures.reset();
    }
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
    <div className="space-y-10">
      <PageHeader
        eyebrow="Rewards"
        title="Rewards Marketplace"
        subtitle="Your Health Score earns points. Redeem them for gear, supplements, and gym perks."
      />

      <main>
        {/* Points Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Points */}
          <div className="dark-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-thrivv-gold-500/20 rounded-xl">
                <Trophy className="w-6 h-6 text-thrivv-gold-400" />
              </div>
              <Zap className="w-5 h-5 text-thrivv-gold-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-1">{points}</div>
            <div className="text-sm text-gray-400">Available Points</div>
          </div>

          {/* Total Rewards Score */}
          <div className="dark-card p-6 border border-thrivv-gold-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-thrivv-gold-500/20 to-thrivv-gold-500/20 rounded-xl">
                <Trophy className="w-6 h-6 text-thrivv-gold-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-thrivv-gold-400 mb-1">
              {confidenceData?.totalRewardsScore || healthScore?.total || 0}
            </div>
            <div className="text-sm text-gray-400">Total Rewards Score</div>
            {confidenceData && (
              <div className="text-xs text-thrivv-gold-500 mt-2">
                {healthScore?.total} × {confidenceData.multiplier.toFixed(2)}x
              </div>
            )}
          </div>

          {/* Base Health Score */}
          <div className="dark-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{healthScore?.total || 0}</div>
            <div className="text-sm text-gray-400">Base Health Score</div>
          </div>

          {/* Confidence Boost */}
          <div className="dark-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {confidenceData ? `+${Math.round(((confidenceData.score - 30) / 100) * 25)}%` : '+0%'}
            </div>
            <div className="text-sm text-gray-400">Confidence Boost</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="dark-card p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-thrivv-gold-400" />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              <div className="text-2xl font-bold text-blue-400 mb-2">Step 1</div>
              <div className="text-gray-300 mb-2">Build Health Score</div>
              <div className="text-xs text-gray-500">
                Train, eat well, sleep<br/>
                Score 0-110 points
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 border border-yellow-700/50 border-2">
              <div className="text-2xl font-bold text-thrivv-gold-400 mb-2">Step 2</div>
              <div className="text-gray-300 mb-2">Boost with Confidence</div>
              <div className="text-xs text-gray-500">
                Connect wearable<br/>
                Get 0-25% boost
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              <div className="text-2xl font-bold text-green-400 mb-2">Result</div>
              <div className="text-gray-300 mb-2">Total Rewards Score</div>
              <div className="text-xs text-gray-500">
                Health × Confidence<br/>
                Max 137 points
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              <div className="text-2xl font-bold text-purple-400 mb-2">Points</div>
              <div className="text-gray-300 mb-2">Earn Rewards</div>
              <div className="text-xs text-gray-500">
                Total 50 → 1 pt<br/>
                Total 110 → 25 pts
              </div>
            </div>
          </div>
          <div className="bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 rounded-lg p-3 text-xs text-yellow-300">
            <strong>💡 Pro Tip:</strong> Higher confidence = more reward points! Connect a wearable or maintain consistent logging to boost your multiplier up to 1.25x
          </div>
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
          {rewards.map((reward) => {
            const Icon = reward.icon;
            const canAfford = points >= reward.points;
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
                      Need {reward.points - points} more points
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
            Maintain a health score above 80 to earn bonus points! Connect your wearable for automatic tracking and bonus points.
          </p>
        </div>

        {/* Security Notice */}
        <div className="dark-card p-4 mt-6 border border-thrivv-gold-500/30 bg-thrivv-gold-500/5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-thrivv-gold-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-thrivv-gold-400">Security Protected</span> - All redemptions are monitored for fraud prevention to protect your account.
            </div>
          </div>
        </div>
      </main>

      {/* Step-Up Authentication Modal */}
      {showStepUpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark-card max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-thrivv-gold-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-thrivv-gold-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Additional Verification Required</h3>
                <p className="text-sm text-gray-400">Security check for high-value redemption</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700/50">
              <p className="text-sm text-gray-300 mb-3">
                For your security, we need to verify this redemption. This helps protect your account from unauthorized access.
              </p>
              <div className="text-xs text-gray-500">
                <strong className="text-gray-400">Redeeming:</strong> {pendingReward?.name}
                <br />
                <strong className="text-gray-400">Points:</strong> {pendingReward?.points}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStepUpModal(false);
                  setPendingReward(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStepUpVerify}
                className="flex-1 px-4 py-2 bg-thrivv-gold-500 text-white rounded-lg hover:opacity-90 transition-all font-semibold"
              >
                Verify & Redeem
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              In production, this would send a verification email or require re-authentication.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
