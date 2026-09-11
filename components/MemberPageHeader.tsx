'use client';

import type { ComponentProps } from 'react';
import { Activity, CalendarDays, Dumbbell, Fingerprint, HeartPulse, Radio, Utensils, Wallet } from 'lucide-react';
import PageHeader from './PageHeader';
export { gradient } from './PageHeader';

const sections = {
  dashboard: { number: '01', name: 'Overview', icon: Activity, words: ['Performance', 'Progress', 'Your gym'] },
  workouts: { number: '02', name: 'Workouts', icon: Dumbbell, words: ['Your plans', 'Your sessions', 'Your pace'] },
  nutrition: { number: '03', name: 'Nutrition', icon: Utensils, words: ['Meals', 'Macros', 'Recipes'] },
  bookings: { number: '04', name: 'Bookings', icon: CalendarDays, words: ['Classes', 'Coaching', 'Your calendar'] },
  health: { number: '05', name: 'Health', icon: HeartPulse, words: ['Training /80', 'Recovery /20', 'Habits /10'] },
  rewards: { number: '06', name: 'Rewards', icon: Wallet, words: ['Your balance', 'Discover', 'Redeem'] },
  wearables: { number: '07', name: 'Wearable', icon: Radio, words: ['Connect', 'Sync', 'Understand'] },
};

type Props = ComponentProps<typeof PageHeader> & { section: keyof typeof sections };

/** Visual member-page shell only. Never infers connection, reward or scoring state. */
export default function MemberPageHeader({ section, title, titleNode, subtitle, action, className = '' }: Props) {
  const config = sections[section];
  const Icon = config.icon;
  return (
    <header className={`member-section-header ${className}`}>
      <div className="member-header-art" aria-hidden="true">
        <svg viewBox="0 0 320 320" fill="none">
          <circle cx="160" cy="160" r="132" stroke="currentColor" strokeOpacity=".15" />
          <circle cx="160" cy="160" r="108" stroke="currentColor" strokeOpacity=".3" strokeDasharray="2 12" />
          <circle cx="160" cy="160" r="78" stroke="currentColor" strokeOpacity=".12" strokeWidth="30" />
          <path d="M160 8v40m0 224v40M8 160h40m224 0h40" stroke="currentColor" strokeOpacity=".5" />
          <path d="M68 252 252 68M80 68h40M252 200v40" stroke="currentColor" strokeOpacity=".3" />
          <circle cx="253" cy="67" r="5" fill="currentColor" />
        </svg>
        <Icon strokeWidth={.8} className="member-header-symbol" />
      </div>
      <div className="member-header-topline">
        <span className="member-section-id"><span>{config.number}</span> THRIVV / {config.name}</span>
        <Fingerprint size={19} strokeWidth={1.2} aria-hidden="true" />
      </div>
      <div className="member-header-body">
        <div className="member-header-copy">
          <h1>{titleNode ?? title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div className="member-header-action">{action}</div>}
      </div>
      <div className="member-header-footer">
        <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
        {config.words.map(word => <span key={word}>{word}</span>)}
      </div>
    </header>
  );
}
