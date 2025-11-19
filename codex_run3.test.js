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
} = require('./codex_run3_fixed.js');

describe('Run 3 (Codex): Bug fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = '';
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  test('deep clone nested structures', () => {
    const obj = { nested: { arr: [1, 2] } };
    const c = clone(obj);
    c.nested.arr[0] = 99;
    expect(obj.nested.arr[0]).toBe(1);
  });

  test('unsubscribe removes the exact listener', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    subscribe(l1);
    const unsub2 = subscribe(l2);
    unsub2();
    notify();
    expect(l1).toHaveBeenCalled();
    expect(l2).not.toHaveBeenCalled();
  });

  test('refresh replaces items and sorts when needed', async () => {
    await refresh();
    expect(GlobalState.items).toHaveLength(3);
    const values = GlobalState.items.map((x) => x.value);
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
  });

  test('refresh keeps size constant', async () => {
    await refresh();
    await refresh();
    expect(GlobalState.items).toHaveLength(3);
  });

  test('search updates filter synchronously', () => {
    const listener = jest.fn();
    subscribe(listener);
    search('term');
    expect(GlobalState.filter).toBe('term');
    expect(listener).toHaveBeenCalled();
  });

  test('expensiveCompute is deterministic', () => {
    const res = Array.from({ length: 3 }, () => expensiveCompute(7));
    expect(res[0]).toBe(res[1]);
    expect(res[1]).toBe(res[2]);
  });

  test('loadItems populates items', async () => {
    await loadItems();
    expect(GlobalState.items).toHaveLength(3);
  });

  test('select sets selectedId', () => {
    select('abc');
    expect(GlobalState.selectedId).toBe('abc');
  });
});
