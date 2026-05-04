'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Activity, Link as LinkIcon, CheckCircle, XCircle, TrendingUp, Zap, Moon, Heart } from 'lucide-react';
import { WhoopConnection, WhoopData } from '@/types';
import PageHeader from '@/components/PageHeader';

export default function WhoopIntegrationPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<WhoopConnection | null>(null);
  const [whoopData, setWhoopData] = useState<WhoopData[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    const storedMemberId = localStorage.getItem('memberId');
    if (!storedMemberId) {
      router.push('/member/login');
      return;
    }
    setMemberId(storedMemberId);
    fetchConnection(storedMemberId);
    fetchWhoopData(storedMemberId);
  }, [router]);

  const fetchConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/whoop/connection?memberId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setConnection(data.connected ? data : null);
      }
    } catch (error) {
      console.error('Failed to fetch Whoop connection:', error);
    }
  };

  const fetchWhoopData = async (id: string) => {
    try {
      const response = await fetch(`/api/whoop/data?memberId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setWhoopData(data);
      }
    } catch (error) {
      console.error('Failed to fetch Whoop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    // In production, this would redirect to Whoop OAuth
    // For now, show a placeholder message
    alert('Whoop integration: In production, this would redirect to Whoop OAuth to connect your account. This feature requires Whoop API credentials.');
  };

  const handleDisconnect = async () => {
    if (!memberId) return;
    
    if (!confirm('Are you sure you want to disconnect your Whoop account?')) return;

    try {
      const response = await fetch(`/api/whoop/connection?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConnection(null);
        setWhoopData([]);
      } else {
        alert('Failed to disconnect Whoop account');
      }
    } catch (error) {
      console.error('Failed to disconnect Whoop:', error);
      alert('Failed to disconnect Whoop account');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Heart className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading Whoop
          </span>
        </div>
      </div>
    );
  }

  const latestData = whoopData[0];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Wearable"
        title="Whoop Integration"
        subtitle="Connect your Whoop device to track recovery, strain, and sleep automatically. Rolling out."
      />

      <main>
        {!connection ? (
          <div className="premium-card p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 mx-auto mb-5 flex items-center justify-center">
              <Activity className="w-7 h-7 text-thrivv-gold-500" />
            </div>
            <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">
              Connect your Whoop device
            </h3>
            <p className="text-thrivv-text-secondary mb-6 leading-relaxed">
              Connect your Whoop account to automatically sync recovery, strain, and sleep data into your Health Score.
            </p>
            <button
              onClick={handleConnect}
              className="btn-primary px-6 py-3 inline-flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Connect Whoop Account
            </button>
            <p className="text-xs text-thrivv-text-muted mt-4">
              Whoop integration requires API credentials and is currently rolling out.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="premium-card p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="icon-badge inline-flex w-12 h-12 items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 text-thrivv-gold-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-thrivv-text-primary">
                      Whoop Connected
                    </h3>
                    <p className="text-sm text-thrivv-text-secondary truncate">
                      Last synced:{' '}
                      {connection.lastSyncedAt
                        ? new Date(connection.lastSyncedAt).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {latestData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {latestData.recovery !== undefined && (
                  <div className="premium-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-thrivv-neon-green" />
                      <h4 className="font-semibold text-thrivv-text-primary">Recovery</h4>
                    </div>
                    <div className="text-3xl font-semibold text-thrivv-neon-green mb-1">
                      {latestData.recovery}%
                    </div>
                    <p className="text-sm text-thrivv-text-secondary">
                      Today&apos;s recovery score
                    </p>
                  </div>
                )}

                {latestData.strain !== undefined && (
                  <div className="premium-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-thrivv-gold-500" />
                      <h4 className="font-semibold text-thrivv-text-primary">Strain</h4>
                    </div>
                    <div className="text-3xl font-semibold text-thrivv-gold-500 mb-1">
                      {latestData.strain}
                    </div>
                    <p className="text-sm text-thrivv-text-secondary">
                      Today&apos;s strain score
                    </p>
                  </div>
                )}

                {latestData.sleep && (
                  <div className="premium-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Moon className="w-5 h-5 text-thrivv-gold-400" />
                      <h4 className="font-semibold text-thrivv-text-primary">Sleep</h4>
                    </div>
                    <div className="text-3xl font-semibold text-thrivv-text-primary mb-1">
                      {Math.round(latestData.sleep.totalSleep / 60)}h{' '}
                      {latestData.sleep.totalSleep % 60}m
                    </div>
                    <p className="text-sm text-thrivv-text-secondary">
                      Last night&apos;s sleep
                    </p>
                  </div>
                )}
              </div>
            )}

            {!latestData && (
              <div className="premium-card p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 mx-auto mb-4 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-thrivv-gold-500" />
                </div>
                <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">
                  No data available
                </h3>
                <p className="text-thrivv-text-secondary">
                  Your Whoop data will appear here once synced.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
