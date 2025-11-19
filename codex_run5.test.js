const {
  clone,
  GlobalState,
  subscribe,
  notify,
  loadItems,
  refresh,
  search,
  select,
  expensiveCompute,
} = require('./codex_run5_fixed.js');

describe('Run 5 (Codex): Bug fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = '';
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  test('deep clone prevents nested mutation bleed-through', () => {
    const src = { a: { b: 1 } };
    const c = clone(src);
    c.a.b = 2;
    expect(src.a.b).toBe(1);
  });

  test('subscribe deduplicates and unsubscribe removes', () => {
    const l = jest.fn();
    const unsub = subscribe(l);
    subscribe(l); // should not duplicate
    expect(GlobalState.listeners.length).toBe(1);
    notify();
    expect(l).toHaveBeenCalledTimes(1);
    unsub();
    expect(GlobalState.listeners.length).toBe(0);
  });

  test('refresh sorts when needed and replaces items', async () => {
    await refresh();
    const values = GlobalState.items.map((i) => i.value);
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
  });

  test('refresh keeps items length constant across multiple calls', async () => {
    await refresh();
    await refresh();
    await refresh();
    expect(GlobalState.items.length).toBe(3);
  });

  test('search updates filter immediately', () => {
    search('foo');
    expect(GlobalState.filter).toBe('foo');
  });

  test('expensiveCompute deterministic across calls', () => {
    const results = new Set(Array.from({ length: 10 }, () => expensiveCompute(15)));
    expect(results.size).toBe(1);
  });

  test('loadItems populates items array', async () => {
    await loadItems();
    expect(GlobalState.items.length).toBe(3);
  });

  test('select updates selectedId', () => {
    select(7);
    expect(GlobalState.selectedId).toBe(7);
  });
});
