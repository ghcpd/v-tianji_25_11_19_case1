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
} = require('./codex_run4_fixed.js');

describe('Run 4 (Codex): Bug fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = '';
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  test('deep clone nested arrays', () => {
    const obj = { list: [{ x: 1 }] };
    const c = clone(obj);
    c.list[0].x = 9;
    expect(obj.list[0].x).toBe(1);
  });

  test('unsubscribe works and retains other listeners', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    const unsub1 = subscribe(l1);
    subscribe(l2);
    unsub1();
    notify();
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();
  });

  test('refresh replaces items (mutates array) and sorts when needed', async () => {
    const originalRef = GlobalState.items;
    await refresh();
    expect(GlobalState.items).toBe(originalRef);
    expect(GlobalState.items.length).toBe(3);
    const values = GlobalState.items.map((v) => v.value);
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
  });

  test('refresh keeps length stable', async () => {
    await refresh();
    await refresh();
    expect(GlobalState.items.length).toBe(3);
  });

  test('search synchronous update', () => {
    const l = jest.fn();
    subscribe(l);
    search('x');
    expect(GlobalState.filter).toBe('x');
    expect(l).toHaveBeenCalled();
  });

  test('expensiveCompute deterministic', () => {
    const res = [expensiveCompute(3), expensiveCompute(3)];
    expect(res[0]).toBe(res[1]);
  });

  test('loadItems populates', async () => {
    await loadItems();
    expect(GlobalState.items.length).toBe(3);
  });

  test('select updates selectedId', () => {
    select(123);
    expect(GlobalState.selectedId).toBe(123);
  });
});
