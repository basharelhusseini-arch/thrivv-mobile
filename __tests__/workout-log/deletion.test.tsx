import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import WorkoutDeleteButton from '@/components/WorkoutDeleteButton';

(global as any).React = React;
const originalFetch = global.fetch;
let renderer: TestRenderer.ReactTestRenderer | undefined;
let fakeWindow: EventTarget;
let dialog: { showModal: jest.Mock; close: jest.Mock };
const onDeleted = jest.fn();
const text = () => JSON.stringify(renderer!.toJSON());
const button = (label: string) => renderer!.root.findAllByType('button').find(node => node.children.includes(label))!;
const trigger = () => renderer!.root.findByProps({ 'aria-haspopup': 'dialog' });
const props = { kind: 'workout' as const, id: 'log-one', memberId: 'member-one', name: 'Upper body', onDeleted };

async function mount(overrides: Partial<React.ComponentProps<typeof WorkoutDeleteButton>> = {}) {
  await act(async () => {
    renderer = TestRenderer.create(<WorkoutDeleteButton {...props} {...overrides} />, {
      createNodeMock: element => element.type === 'dialog' ? dialog : null,
    });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  fakeWindow = new EventTarget();
  Object.defineProperty(global, 'window', { configurable: true, value: fakeWindow });
  dialog = { showModal: jest.fn(), close: jest.fn() };
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
});

afterEach(() => {
  if (renderer) act(() => renderer!.unmount());
  renderer = undefined;
  global.fetch = originalFetch;
  delete (global as any).window;
  jest.useRealTimers();
});

test('offers an accessible confirmation with cancel and preserves workout rewards', async () => {
  await mount();
  expect(trigger().props['aria-label']).toBe('Delete logged workout: Upper body');
  expect(text()).toContain('Gym verification, points and reward records will not be changed.');
  expect(renderer!.root.findByType('dialog').props['aria-describedby']).toBeTruthy();
  expect(button('Cancel').props.autoFocus).toBe(true);
  await act(async () => trigger().props.onClick());
  expect(dialog.showModal).toHaveBeenCalledTimes(1);
  await act(async () => button('Cancel').props.onClick());
  expect(dialog.close).toHaveBeenCalledTimes(2);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('plan confirmation explains included sessions and standalone workout retention', async () => {
  await mount({ kind: 'plan' });
  expect(text()).toContain('all sessions included in it. Workouts logged separately and reward records will not be changed.');
  await act(async () => button('Delete training plan').props.onClick());
  expect(global.fetch).toHaveBeenCalledWith('/api/workout-plans/log-one?expectedUserId=member-one', expect.objectContaining({ method: 'DELETE' }));
});

test('prevents duplicate deletion and cancellation while saving, then refreshes the views', async () => {
  let finish!: (result: unknown) => void;
  global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const synced = jest.fn();
  fakeWindow.addEventListener('thrivv:workouts-synced', synced);
  await mount();
  await act(async () => trigger().props.onClick());
  const remove = button('Delete logged workout').props.onClick;
  await act(async () => { remove(); remove(); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('/api/workouts/log-one?expectedUserId=member-one', expect.objectContaining({ method: 'DELETE', credentials: 'same-origin', cache: 'no-store', signal: expect.any(AbortSignal) }));
  expect(button('Deleting...').props.disabled).toBe(true);
  expect(button('Cancel').props.disabled).toBe(true);
  const cancel = { preventDefault: jest.fn() };
  await act(async () => renderer!.root.findByType('dialog').props.onCancel(cancel));
  expect(cancel.preventDefault).toHaveBeenCalled();
  expect(dialog.close).toHaveBeenCalledTimes(1);
  await act(async () => finish({ ok: true }));
  expect(onDeleted).toHaveBeenCalledTimes(1);
  expect(synced).toHaveBeenCalledTimes(1);
  expect(dialog.close).toHaveBeenCalledTimes(2);
});

test('leaves the record intact on failure and allows retry', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true });
  await mount();
  await act(async () => button('Delete logged workout').props.onClick());
  expect(onDeleted).not.toHaveBeenCalled();
  expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toContain('Unable to delete');
  expect(button('Cancel').props.disabled).toBe(false);
  await act(async () => button('Delete logged workout').props.onClick());
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

test.each([401, 403])('reports session/account changes without removing records (%s)', async status => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status });
  await mount();
  await act(async () => button('Delete logged workout').props.onClick());
  expect(text()).toContain('Your account changed or your session expired.');
  expect(onDeleted).not.toHaveBeenCalled();
});

test('clears a record already deleted elsewhere', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
  await mount();
  await act(async () => button('Delete logged workout').props.onClick());
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

test('aborts on unmount and ignores a late success response', async () => {
  let finish!: (result: unknown) => void;
  global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => button('Delete logged workout').props.onClick());
  const signal = (global.fetch as jest.Mock).mock.calls[0][1].signal;
  act(() => { renderer!.unmount(); renderer = undefined; });
  expect(signal.aborted).toBe(true);
  await act(async () => finish({ ok: true }));
  expect(onDeleted).not.toHaveBeenCalled();
});

test('cancels stale requests and resets the dialog after an account change', async () => {
  global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
  await mount();
  await act(async () => trigger().props.onClick());
  await act(async () => button('Delete logged workout').props.onClick());
  const signal = (global.fetch as jest.Mock).mock.calls[0][1].signal;
  await act(async () => renderer!.update(<WorkoutDeleteButton {...props} memberId="member-two" />));
  expect(signal.aborted).toBe(true);
  expect(button('Delete logged workout').props.disabled).toBe(false);
  expect(dialog.close).toHaveBeenCalledTimes(2);
  expect(onDeleted).not.toHaveBeenCalled();
});

test('times out with a retryable warning instead of claiming deletion', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  await mount();
  await act(async () => button('Delete logged workout').props.onClick());
  await act(async () => jest.advanceTimersByTime(12000));
  expect(text()).toContain('Refresh to check whether it was deleted');
  expect(button('Cancel').props.disabled).toBe(false);
  expect(onDeleted).not.toHaveBeenCalled();
});
