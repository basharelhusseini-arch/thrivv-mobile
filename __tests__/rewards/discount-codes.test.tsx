import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TestRenderer, { act } from 'react-test-renderer';
import RewardVoucher from '@/components/RewardVoucher';
import { safePartnerUrl, type RewardReceipt } from '@/lib/rewards/catalog';
(global as any).React = React;
jest.mock('next/link', () => ({ __esModule: true, default: (props: any) => React.createElement('a', props) }));
const receipt: RewardReceipt = { id: 'receipt-1', offer_id: 'offer-1', points: 600, status: 'issued', created_at: '2026-09-16T00:00:00Z', discount_code: 'TEST-SECRET', expires_at: '2099-01-01T00:00:00Z', offer_snapshot: { name: '10% off protein', partner_name: 'Test partner', terms: 'Selected products only', instructions: 'Enter at checkout', website_url: 'https://example.com/shop' } };
test('issued vouchers show saved codes, terms, expiry and partner instructions', () => {
  const html = renderToStaticMarkup(<RewardVoucher receipt={receipt} />);
  for(const text of ['TEST-SECRET','Copy code','Selected products only','Enter at checkout','Ready to use','https://example.com/shop']) expect(html).toContain(text);
});
test.each(['cancelled','pending','fulfilled'])('%s receipts do not reveal a code', status => {
  const html = renderToStaticMarkup(<RewardVoucher receipt={{ ...receipt, status }} />);
  expect(html).not.toContain('TEST-SECRET'); expect(html).not.toContain('Copy code');
});
test('expired codes cannot be copied or presented as ready', () => {
  const html = renderToStaticMarkup(<RewardVoucher receipt={{ ...receipt, expires_at: '2000-01-01T00:00:00Z' }} />);
  expect(html).toContain('Expired'); expect(html).not.toContain('TEST-SECRET');
});
test('partner links reject script URLs and credentials', () => {
  expect(safePartnerUrl('javascript:alert(1)')).toBeNull(); expect(safePartnerUrl('https://user:pass@example.com')).toBeNull();
});
test('copy uses the saved code and reports clipboard failure without losing the voucher', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(global, 'navigator', { configurable: true, value: { clipboard: { writeText } } });
  let view: TestRenderer.ReactTestRenderer;
  await act(async () => { view = TestRenderer.create(<RewardVoucher receipt={receipt} />); });
  await act(async () => { await view!.root.findByType('button').props.onClick(); });
  expect(writeText).toHaveBeenCalledWith('TEST-SECRET');
  expect(JSON.stringify(view!.toJSON())).toContain('Code copied');
  writeText.mockRejectedValue(new Error('Unavailable'));
  await act(async () => { await view!.root.findByType('button').props.onClick(); });
  expect(JSON.stringify(view!.toJSON())).toContain('Press and hold');
  act(() => view!.unmount());
});
