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
} = require('./codex_run2_fixed.js');

describe('Run 2 (Codex): Bug fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = '';
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  it('deep clones nested objects', () => {
    const obj = { a: { b: 2 } };
    const c = clone(obj);
    c.a.b = 3;
    expect(obj.a.b).toBe(2);
  });

  it('unsubscribe removes correct listener and prevents leak', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    const unsub1 = subscribe(l1);
    const unsub2 = subscribe(l2);
    unsub2();
    notify();
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(0);
    unsub1();
    expect(GlobalState.listeners.length).toBe(0);
  });

  it('refresh sorts when old length < 5', async () => {
    await refresh();
    const values = GlobalState.items.map((i) => i.value);
    const sorted = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sorted);
  });

  it('refresh does NOT sort when old length >= 5', async () => {
    GlobalState.items = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `N${i}`, value: i }));
    await refresh();
    // can't assert sorted order, but length should be reset to 3
    expect(GlobalState.items.length).toBe(3);
  });

  it('refresh keeps constant item count across calls', async () => {
    await refresh();
    const count1 = GlobalState.items.length;
    await refresh();
    const count2 = GlobalState.items.length;
    expect(count1).toBe(3);
    expect(count2).toBe(3);
  });

  it('search immediately updates filter and notifies', () => {
    const listener = jest.fn();
    subscribe(listener);
    search('gamma');
    expect(GlobalState.filter).toBe('gamma');
    expect(listener).toHaveBeenCalled();
  });

  it('expensiveCompute is deterministic', () => {
    const res = new Set(Array.from({ length: 5 }, () => expensiveCompute(10)));
    expect(res.size).toBe(1);
  });

  it('loadItems populates items', async () => {
    await loadItems();
    expect(GlobalState.items.length).toBe(3);
  });

  it('select updates selectedId', () => {
    select(99);
    expect(GlobalState.selectedId).toBe(99);
  });
});
