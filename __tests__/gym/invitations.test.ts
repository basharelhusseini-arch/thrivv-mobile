import { invitationHash, newInvitation } from '@/lib/gym-invitations';
test('invitation tokens are unpredictable and only hashes are stored', () => {
  const a = newInvitation(); const b = newInvitation();
  expect(a.token).not.toEqual(b.token);
  expect(a.hash).not.toEqual(a.token);
  expect(invitationHash(a.token)).toEqual(a.hash);
});
test.each(['', 'abc', '../other', 'g'.repeat(64)])('invalid token rejected: %s', token => {
  expect(() => invitationHash(token)).toThrow();
});
