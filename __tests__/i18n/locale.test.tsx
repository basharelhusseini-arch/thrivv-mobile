import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider, LanguageSwitch } from '@/lib/i18n/client';
import { localeOf, translate } from '@/lib/i18n/core';
import { getTranslation } from '@/lib/i18n/server';
import DashboardJourney from '@/components/DashboardJourney';
import { DAILY_ENCOURAGEMENTS } from '@/lib/dashboard-journey';
import { memberNextStep, type VerificationStatus } from '@/lib/member-journey';
import ar from '@/lib/i18n/ar.json';
const refresh = jest.fn();
let storedCookie: string | undefined;
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }), usePathname: () => '/member/dashboard' }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => storedCookie === undefined ? undefined : ({ value: storedCookie }) }) }));
const dictionary: Record<string, string> = ar;
test('English remains the default and unsupported cookie values are rejected', async () => {
  expect(localeOf('ar')).toBe('ar'); expect(localeOf('evil')).toBe('en'); expect(localeOf(undefined)).toBe('en');
  storedCookie = undefined; expect((await getTranslation()).locale).toBe('en');
  storedCookie = 'ar'; expect((await getTranslation()).t('Rewards')).toBe('المكافآت');
  storedCookie = 'ar; injected'; expect((await getTranslation()).locale).toBe('en');
});
test('substitutions preserve names and unknown partner copy without evaluating markup', () => {
  expect(translate('en','Your day, {0}.',{0:'Bachar'})).toBe('Your day, Bachar.');
  expect(translate('ar','Your day, {0}.',{0:'Bachar'})).toContain('Bachar');
  expect(translate('ar','Partner café ABC')).toBe('Partner café ABC');
  expect(translate('ar','__proto__')).toBe('__proto__');
  expect(translate('ar','{constructor}')).toBe('{constructor}');
  expect(translate('en','We couldn&apos;t check your session.')).toBe("We couldn't check your session.");
  expect(renderToStaticMarkup(<p>{translate('ar','Your day, {0}.',{0:'<script>alert(1)</script>'})}</p>)).not.toContain('<script>');
});
test('every translated interpolation retains its parameters', () => {
  for (const [key, value] of Object.entries(dictionary)) {
    const tokens = (s:string) => [...s.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort();
    expect(tokens(value)).toEqual(tokens(key));
  }
});
test('all daily encouragements have Arabic copy', () => {
  for(const source of DAILY_ENCOURAGEMENTS) expect(translate('ar',source)).not.toBe(source);
});
test('Arabic Journey renders its milestone names and preserves real offer names', () => {
  const html=renderToStaticMarkup(<LanguageProvider initialLocale="ar"><DashboardJourney activity={{visits:12,weekDays:3,habitDays:2,todayHabits:1,weekStart:'2026-09-21'}} rewards={{points:280,offers:[{id:'partner',name:'Brand ABC',partner_name:'Partner XYZ',points:400,available:true,category:'restaurant',discount_percent:10,terms:'',instructions:'',website_url:null,expires_at:null}],redemptions:[]}}/></LanguageProvider>);
  expect(html).toContain('الانطلاقة'); expect(html).toContain('دفعتك اليومية'); expect(html).toContain('Brand ABC'); expect(html).toContain('Partner XYZ'); expect(html).not.toContain('Next stop:');
});
test('Arabic next-step wording does not change QR eligibility or rewards', () => {
  const daily={gymId:'gym',manual:{eligible:true,verified:false,enabled:true,checkedIn:false,canScan:true,estimatedPoints:40},workouts:[],creditedPoints:0} as unknown as VerificationStatus;
  const en=memberNextStep(daily), arabic=memberNextStep(daily,'ar');
  expect(arabic.href).toBe(en.href); expect(arabic.action).toBe('مسح رمز النادي');
  daily.manual!.verified=true; daily.rewardStatus='credited'; daily.creditedPoints=40;
  expect(memberNextStep(daily,'ar').title).toBe('كسبت 40 نقطة.');
});
