import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DashboardJourney from '@/components/DashboardJourney';
import { JOURNEY_LEVELS, journeyLevel, journeyReward, type JourneyRewards } from '@/lib/dashboard-journey';
import type { RewardOffer } from '@/lib/rewards/catalog';
const offer: RewardOffer = { id: 'cafe', name: 'Coffee on your terms', points: 400, partner_name: 'Partner café', category: 'restaurant', discount_percent: 10, terms: '', instructions: '', website_url: null, expires_at: null, available: true };
const rewards: JourneyRewards = { points: 280, offers: [offer], redemptions: [] };
it.each(JOURNEY_LEVELS)('unlocks $name exactly at $visits days', tier => {
  expect(journeyLevel(tier.visits).current.name).toBe(tier.name);
  if (tier.visits > 0) expect(journeyLevel(tier.visits - 1).current.name).not.toBe(tier.name);
});
it('handles zero, invalid and beyond-final progress', () => {
  expect(journeyLevel(NaN).visits).toBe(0);
  expect(journeyLevel(-3).percent).toBe(0);
  expect(journeyLevel(10).percent).toBe(50);
  expect(journeyLevel(500)).toMatchObject({percent:100,next:null,remaining:0});
});
it('excludes unavailable, expired and redeemed offers without mutating the catalog', () => {
  const data = {...rewards, offers: [ {...offer,id:'out',points:100,available:false}, {...offer,id:'expired',points:150,expires_at:'2020-01-01'}, {...offer,id:'used',points:200}, {...offer,id:'other',points:600}, offer ], redemptions:[{offer_id:'used',status:'issued'}]};
  expect(journeyReward(data)?.id).toBe('cafe');
  expect(data.offers[0].id).toBe('out');
  expect(journeyReward({...data, redemptions:[{offer_id:'used',status:'cancelled'}]})?.id).toBe('used');
  expect(journeyReward({...rewards,offers:[]})).toBeNull();
});
it('spending affects reward progress, not the visit level; renders completion and failure states honestly', () => {
  const activity = {visits:12,weekDays:3,habitDays:2,todayHabits:1,weekStart:'2026-09-21'};
  const html = renderToStaticMarkup(<DashboardJourney activity={activity} rewards={rewards}/>);
  expect(html).toContain('Momentum'); expect(html).toContain('120 more points'); expect(html).toContain('Mission complete');
  const spent = renderToStaticMarkup(<DashboardJourney activity={activity} rewards={{...rewards,points:0}}/>);
  expect(spent).toContain('Momentum'); expect(spent).toContain('400 more points');
  expect(renderToStaticMarkup(<DashboardJourney activity={null} rewards={null}/>)).toContain('temporarily unavailable');
  expect(renderToStaticMarkup(<DashboardJourney activity={activity} rewards={{...rewards,points:900}}/>)).toContain('You have enough points');
  if (process.env.JOURNEY_PREVIEW) {
    const {writeFileSync} = require('fs');
    writeFileSync('/tmp/thrivv-journey-preview.html', `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file:///tmp/thrivv-journey.css"></head><body style="background:#0c0e0d"><main class="mx-auto max-w-5xl p-5 text-white">${html}</main></body></html>`);
  }
});
