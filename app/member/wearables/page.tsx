'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Watch, Activity, CheckCircle, Apple, Bluetooth } from 'lucide-react';
import PageHeader from '@/components/MemberPageHeader';

interface WearableConnection {
  type: 'whoop' | 'garmin' | 'apple_health';
  connected: boolean;
  lastSynced?: string;
}

export default function WearablesPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<WearableConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    const storedMemberId = localStorage.getItem('memberId');
    if (!storedMemberId) {
      router.push('/member/login');
      return;
    }
    setMemberId(storedMemberId);
    fetchConnections(storedMemberId);
  }, [router]);

  const fetchConnections = async (id: string) => {
    try {
      // Simulate fetching connections - in production, call actual API
      const whoopResponse = await fetch(`/api/whoop/connection?memberId=${id}`);
      const whoopData = whoopResponse.ok ? await whoopResponse.json() : null;
      
      setConnections([
        {
          type: 'whoop',
          connected: whoopData?.connected || false,
          lastSynced: whoopData?.lastSyncedAt
        },
        {
          type: 'garmin',
          connected: false, // Placeholder
          lastSynced: undefined
        },
        {
          type: 'apple_health',
          connected: false, // Placeholder
          lastSynced: undefined
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type: string) => {
    if (type === 'whoop') {
      router.push('/member/whoop');
      return;
    }
    
    // Placeholder for other integrations
    alert(`${type === 'garmin' ? 'Garmin' : 'Apple Health'} integration coming soon! This will connect to ${type === 'garmin' ? 'Garmin Connect' : 'Apple HealthKit'} to sync your fitness data.`);
  };

  const wearables = [
    {
      id: 'whoop',
      name: 'WHOOP',
      description: 'Track recovery, strain, and sleep quality',
      icon: Activity,
      color: 'from-red-500 to-pink-500',
      features: [
        'Recovery Score',
        'Strain Tracking',
        'Sleep Analysis',
        'HRV Monitoring'
      ]
    },
    {
      id: 'garmin',
      name: 'Garmin',
      description: 'Connect Garmin devices and Garmin Connect',
      icon: Watch,
      color: 'from-blue-500 to-cyan-500',
      features: [
        'Activity Tracking',
        'Heart Rate Monitoring',
        'GPS Workouts',
        'Body Battery'
      ]
    },
    {
      id: 'apple_health',
      name: 'Apple Health',
      description: 'Sync data from Apple Health app',
      icon: Apple,
      color: 'from-gray-600 to-gray-800',
      features: [
        'Activity Rings',
        'Workouts',
        'Heart Rate',
        'Step Count'
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Bluetooth className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading wearables
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="member-future space-y-10" data-section="wearables">
      <PageHeader
        section="wearables"
        eyebrow="Wearables"
        title="Your effort. Connected."
        subtitle="Connect WHOOP to bring your recorded training and recovery into Thrivv. More wearable integrations are coming."
      />

      <main>
        {/* Benefits Section */}
        <div className="dark-card p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Bluetooth className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Why Connect Your Wearable?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                <div>
                  <span className="text-green-400 font-semibold">✓</span> Workout data in one place
                </div>
                <div>
                  <span className="text-green-400 font-semibold">✓</span> Understand your Health Score
                </div>
                <div>
                  <span className="text-green-400 font-semibold">✓</span> Personalized insights
                </div>
                <div>
                  <span className="text-green-400 font-semibold">✓</span> Track recovery
                </div>
                <div>
                  <span className="text-green-400 font-semibold">✓</span> Optimize training
                </div>
                <div>
                  <span className="text-green-400 font-semibold">✓</span> See your recorded activity
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wearable Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {wearables.map((wearable) => {
            const connection = connections.find(c => c.type === wearable.id);
            const isConnected = connection?.connected || false;
            const Icon = wearable.icon;

            return (
              <div
                key={wearable.id}
                className="dark-card overflow-hidden"
              >
                {/* Header with gradient */}
                <div className={`p-6 bg-gradient-to-r ${wearable.color} relative`}>
                  <div className="relative z-10">
                    <Icon className="w-12 h-12 text-white mb-3" />
                    <h3 className="text-xl font-bold text-white">{wearable.name}</h3>
                    <p className="text-white/80 text-sm mt-1">{wearable.description}</p>
                  </div>
                  {isConnected && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Features:</h4>
                  <ul className="space-y-2 mb-6">
                    {wearable.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Connection Status */}
                  {isConnected ? (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-500">
                        Last synced: {connection?.lastSynced ? new Date(connection.lastSynced).toLocaleString() : 'Never'}
                      </div>
                      <button
                        onClick={() => handleConnect(wearable.id)}
                        className="w-full px-4 py-2 bg-gray-800/50 text-white rounded-lg hover:bg-gray-700/50 transition-all border border-gray-700/50"
                      >
                        Manage Connection
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(wearable.id)}
                      className={`w-full px-4 py-2 bg-gradient-to-r ${wearable.color} text-white rounded-lg hover:opacity-90 transition-all font-semibold shadow-lg`}
                    >
                      Connect {wearable.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="dark-card p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-3">Need Help?</h3>
          <div className="text-sm text-gray-400 space-y-2">
            <p>• You can connect multiple wearables at once to sync all your data</p>
            <p>• Data syncs automatically every hour when connected</p>
            <p>• Your connected devices contribute to your Health Score</p>
            <p>• Disconnect anytime from the device settings page</p>
          </div>
        </div>
      </main>
    </div>
  );
}
