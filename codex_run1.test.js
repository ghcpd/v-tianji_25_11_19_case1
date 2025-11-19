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
} = require('./codex_run1_fixed.js');

describe('Run 1 (Codex): Bug fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = '';
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  test('clone performs deep copy', () => {
    const src = { nested: { a: 1 } };
    const c = clone(src);
    c.nested.a = 2;
    expect(src.nested.a).toBe(1);
  });

  test('unsubscribe removes correct listener', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    const unsub1 = subscribe(l1);
    const unsub2 = subscribe(l2);
    unsub1();
    notify();
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();
    unsub2();
    expect(GlobalState.listeners.length).toBe(0);
  });

  test('refresh replaces items and sorts when len < 5', async () => {
    await refresh();
    expect(GlobalState.items.length).toBe(3);
    const values = GlobalState.items.map((i) => i.value);
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
  });

  test('refresh keeps size constant across calls', async () => {
    await refresh();
    const first = GlobalState.items.length;
    await refresh();
    expect(GlobalState.items.length).toBe(first);
  });

  test('search updates filter synchronously', () => {
    const listener = jest.fn();
    subscribe(listener);
    search('beta');
    expect(GlobalState.filter).toBe('beta');
    expect(listener).toHaveBeenCalled();
  });

  test('expensiveCompute is deterministic', () => {
    const v = 42;
    const r1 = expensiveCompute(v);
    const r2 = expensiveCompute(v);
    expect(r1).toBe(r2);
  });

  test('loadItems populates items', async () => {
    await loadItems();
    expect(GlobalState.items.length).toBe(3);
  });

  test('select updates selectedId', () => {
    select(2);
    expect(GlobalState.selectedId).toBe(2);
  });
});
