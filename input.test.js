const { 
  fetchItems,
  clone,
  GlobalState,
  subscribe,
  notify,
  loadItems,
  refresh,
  search,
  select,
  render,
  expensiveCompute,
  runSimulation,
} = require('./input');

beforeEach(() => {
  // reset global state
  GlobalState.items = [];
  GlobalState.filter = '';
  GlobalState.selectedId = null;
  GlobalState.listeners = [];
});

test('subscribe and unsubscribe behavior removes correct listener', () => {
  const calls = [];
  const a = () => calls.push('a');
  const b = () => calls.push('b');
  const ua = subscribe(a);
  subscribe(b);
  notify();
  expect(calls).toEqual(['a', 'b']);
  calls.length = 0;
  ua(); // unsubscribe a
  notify();
  expect(calls).toEqual(['b']);
});

test('notify provides snapshot and listeners cannot affect global state', () => {
  const mutate = (state) => {
    state.filter = 'mutated';
    state.items.push({ id: 999, name: 'X', value: 0 });
  };
  const observe = jest.fn();
  subscribe(mutate);
  subscribe(observe);
  GlobalState.items.push({ id: 1, name: 'Alpha', value: 10 });
  notify();
  // observe should see the original snapshot (not the mutated one)
  expect(observe).toHaveBeenCalled();
  const observed = observe.mock.calls[0][0];
  expect(observed.filter).toBe('');
  expect(observed.items.some(i => i.id === 999)).toBe(false);
  // global state should not be affected by snapshot mutation
  expect(GlobalState.filter).toBe('');
  expect(GlobalState.items.some(i => i.id === 999)).toBe(false);
});

test('search ignores stale updates and only latest applies', async () => {
  // mock Math.random to control timer delays
  const origRandom = Math.random;
  let call = 0;
  Math.random = () => {
    // first call -> 0.9 -> delay ~180ms
    // second call -> 0.1 -> delay ~20ms
    return (++call === 1) ? 0.9 : 0.1;
  };
  search('first');
  search('second');
  // wait for the timeouts to fire
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(GlobalState.filter).toBe('second');
  Math.random = origRandom;
});

test('refresh and loadItems dedupe and return pushed items', async () => {
  // mock fetchItems to produce deterministic arrays
  const mod = require('./input');
  const origImpl = mod.fetchItems;
  // inject deterministic fetch implementation
  mod.setFetchItemsImpl((delay = 10) => Promise.resolve([
    { id: 1, name: 'Alpha', value: 10 },
    { id: 2, name: 'Beta', value: 20 },
    { id: 3, name: 'Gamma', value: 30 },
  ]));

  const items = await mod.loadItems();
  expect(items.length).toBe(3);
  expect(GlobalState.items.length).toBe(3);

  // on refreshing with the same items, nothing new should be pushed
  const pushed = await mod.refresh();
  expect(pushed.length).toBe(0);
  expect(GlobalState.items.length).toBe(3);

  // now fetch returns a new item plus duplicates
  mod.setFetchItemsImpl((delay = 10) => Promise.resolve([
    { id: 2, name: 'Beta', value: 25 },
    { id: 4, name: 'Delta', value: 40 },
  ]));
  const pushed2 = await mod.refresh();
  expect(pushed2.length).toBe(1);
  expect(GlobalState.items.some(i => i.id === 4)).toBe(true);

  // restore
  mod.setFetchItemsImpl(origImpl);
});

test('expensiveCompute deterministic', () => {
  const a = expensiveCompute(5);
  const b = expensiveCompute(5);
  expect(a).toBe(b);
});
