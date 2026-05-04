'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, Calendar, CreditCard, LogOut, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface MemberData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  joinDate: string;
  membershipId: string | null;
  status: string;
}

interface MembershipData {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
}

export default function MemberProfilePage() {
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const memberId = localStorage.getItem('memberId');
    if (!memberId) {
      router.push('/member/login');
      return;
    }

    fetchMemberData(memberId);
  }, [router]);

  const fetchMemberData = async (memberId: string) => {
    try {
      const memberRes = await fetch(`/api/members/${memberId}`);
      const memberData = await memberRes.json();
      setMember(memberData);

      if (memberData.membershipId) {
        const membershipRes = await fetch(`/api/memberships/${memberData.membershipId}`);
        const membershipData = await membershipRes.json();
        setMembership(membershipData);
      }
    } catch (error) {
      console.error('Failed to fetch member data:', error);
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
            <User className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading profile
          </span>
        </div>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const statusBadge = (status: string) => {
    if (status === 'active') return 'bg-thrivv-neon-green/10 text-thrivv-neon-green border border-thrivv-neon-green/20';
    if (status === 'suspended') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-thrivv-bg-card text-thrivv-text-secondary border border-thrivv-gold-500/10';
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Your personal info and active membership."
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

      <main className="max-w-4xl space-y-6">
        <section className="premium-card p-7">
          <h2 className="text-lg font-semibold text-thrivv-text-primary mb-5">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: User, label: 'Full Name', value: `${member.firstName} ${member.lastName}` },
              { icon: Mail, label: 'Email', value: member.email },
              { icon: Phone, label: 'Phone', value: member.phone || '—' },
              {
                icon: Calendar,
                label: 'Date of Birth',
                value: `${new Date(member.dateOfBirth).toLocaleDateString()} (Age ${calculateAge(member.dateOfBirth)})`,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <div className="icon-badge w-10 h-10 inline-flex items-center justify-center shrink-0">
                  <row.icon className="w-4 h-4 text-thrivv-gold-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-thrivv-text-muted">
                    {row.label}
                  </p>
                  <p className="text-sm text-thrivv-text-primary font-medium mt-1 truncate">
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="premium-card p-7">
          <h2 className="text-lg font-semibold text-thrivv-text-primary mb-5">Membership</h2>
          {membership ? (
            <div className="rounded-xl bg-thrivv-bg-card/60 border border-thrivv-gold-500/15 p-5">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard className="w-4 h-4 text-thrivv-gold-500" />
                    <h3 className="text-lg font-semibold text-thrivv-text-primary truncate">
                      {membership.name}
                    </h3>
                  </div>
                  <p className="text-sm text-thrivv-text-secondary mb-2">
                    {membership.description}
                  </p>
                  <p className="text-2xl font-semibold text-thrivv-gold-500">
                    ${membership.price.toFixed(2)}
                    <span className="text-sm font-normal text-thrivv-text-muted">/month</span>
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-[11px] font-medium rounded-full capitalize ${statusBadge(member.status)}`}
                >
                  {member.status}
                </span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-thrivv-text-muted mb-2.5">
                  Features included
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {membership.features.map((feature, index) => (
                    <li
                      key={index}
                      className="text-sm text-thrivv-text-secondary flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-thrivv-neon-green shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-thrivv-bg-card/60 border border-thrivv-gold-500/10 p-8 text-center">
              <CreditCard className="w-10 h-10 text-thrivv-text-muted mx-auto mb-3" />
              <p className="text-thrivv-text-secondary">No active membership</p>
            </div>
          )}
        </section>

        <section className="premium-card p-7">
          <h2 className="text-lg font-semibold text-thrivv-text-primary mb-5">Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-thrivv-text-muted mb-1">
                Member Since
              </p>
              <p className="text-sm text-thrivv-text-primary font-medium">
                {new Date(member.joinDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-thrivv-text-muted mb-1.5">
                Account Status
              </p>
              <span
                className={`inline-block px-3 py-1 text-[11px] font-medium rounded-full capitalize ${statusBadge(member.status)}`}
              >
                {member.status}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
