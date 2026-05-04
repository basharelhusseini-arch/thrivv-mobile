'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Mail, Calendar, DollarSign, User, LogOut, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface Notification {
  id: string;
  memberId: string;
  type: 'class_reminder' | 'class_cancelled' | 'payment_receipt' | 'membership_expiring' | 'welcome';
  subject: string;
  body: string;
  sent: boolean;
  sentAt?: string;
  createdAt: string;
}

export default function MemberNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const memberId = localStorage.getItem('memberId');
    if (!memberId) {
      router.push('/member/login');
      return;
    }

    fetchNotifications(memberId);
  }, [router]);

  const fetchNotifications = async (memberId: string) => {
    try {
      const response = await fetch(`/api/member/notifications?memberId=${memberId}`);
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberName');
    router.push('/member/login');
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'class_reminder':
      case 'class_cancelled':
        return <Calendar className="w-4 h-4 text-thrivv-gold-500" />;
      case 'payment_receipt':
        return <DollarSign className="w-4 h-4 text-thrivv-neon-green" />;
      case 'membership_expiring':
        return <User className="w-4 h-4 text-thrivv-gold-400" />;
      default:
        return <Mail className="w-4 h-4 text-thrivv-text-secondary" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Bell className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading notifications
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle="Class reminders, payment receipts, and updates from your gym."
        action={
          <button
            onClick={handleLogout}
            className="btn-ghost px-4 py-2 inline-flex items-center gap-2 text-sm hover:text-red-400 hover:border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        }
      />

      <main className="max-w-4xl">
        <div className="premium-card overflow-hidden">
          <div className="p-6">
            {notifications.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 mx-auto mb-4 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-thrivv-gold-500" />
                </div>
                <p className="text-thrivv-text-primary text-base font-medium mb-1">
                  No notifications
                </p>
                <p className="text-thrivv-text-muted text-sm">
                  You&apos;re all caught up.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-xl bg-thrivv-bg-card/50 border border-thrivv-gold-500/10 p-4 hover:border-thrivv-gold-500/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="icon-badge w-9 h-9 inline-flex items-center justify-center shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-thrivv-text-primary">
                              {notification.subject}
                            </h3>
                            <p className="mt-1 text-sm text-thrivv-text-secondary leading-relaxed">
                              {notification.body}
                            </p>
                            <p className="mt-2 text-[11px] text-thrivv-text-muted">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {notification.sent && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-thrivv-neon-green bg-thrivv-neon-green/10 border border-thrivv-neon-green/20 px-2 py-0.5 rounded-md shrink-0">
                              <CheckCircle className="w-3 h-3" />
                              Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
