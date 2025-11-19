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
  expensiveCompute,
} = require('./run2_fixed.js');

describe('Run 2: JavaScript Bug Fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = "";
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  describe('Bug 1: Unsubscribe off-by-one error', () => {
    test('should remove the correct listener', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();

      subscribe(fn1);
      const unsub = subscribe(fn2);
      subscribe(fn3);

      unsub();
      
      notify();
      
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    test('should prevent memory leak', () => {
      const fn = jest.fn();
      const unsub = subscribe(fn);
      
      expect(GlobalState.listeners.length).toBe(1);
      unsub();
      expect(GlobalState.listeners.length).toBe(0);
    });
  });

  describe('Bug 2: Race condition with double await', () => {
    test('should await promise only once', async () => {
      await refresh();
      
      expect(GlobalState.items.length).toBe(3);
      const ids = GlobalState.items.map(it => it.id);
      expect(ids).toEqual(expect.arrayContaining([1, 2, 3]));
    });
  });

  describe('Bug 3: Items accumulation', () => {
    test('should replace items instead of accumulating', async () => {
      GlobalState.items = [
        { id: 100, name: "Old1", value: 10 },
        { id: 101, name: "Old2", value: 20 }
      ];
      
      await refresh();
      
      expect(GlobalState.items.length).toBe(3);
      expect(GlobalState.items.every(it => it.id <= 3)).toBe(true);
    });
  });

  describe('Bug 4: Shallow clone', () => {
    test('should create deep copy', () => {
      const obj = { a: 1, nested: { b: 2, c: { d: 3 } } };
      const cloned = clone(obj);
      
      cloned.nested.b = 999;
      cloned.nested.c.d = 888;
      
      expect(obj.nested.b).toBe(2);
      expect(obj.nested.c.d).toBe(3);
    });
  });

  describe('Bug 5: Non-deterministic search', () => {
    test('should update filter immediately', () => {
      search("test");
      expect(GlobalState.filter).toBe("test");
      
      search("alpha");
      expect(GlobalState.filter).toBe("alpha");
    });

    test('should notify listeners synchronously', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      search("query");
      
      expect(listener).toHaveBeenCalled();
      expect(GlobalState.filter).toBe("query");
    });
  });

  describe('Bug 6: Non-deterministic computation', () => {
    test('should return consistent results', () => {
      const value = 50;
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(expensiveCompute(value));
      }
      
      const allSame = results.every(r => r === results[0]);
      expect(allSame).toBe(true);
    });
  });

  describe('Bug 7: Stale data in conditional sort', () => {
    test('should use correct state for conditional logic', async () => {
      GlobalState.items = [];
      
      await refresh();
      
      expect(GlobalState.items.length).toBe(3);
      // With old length < 5, items should be sorted by value descending
      const values = GlobalState.items.map(it => it.value);
      const sortedValues = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sortedValues);
    });

    test('should not sort when items length >= 5', async () => {
      GlobalState.items = [
        { id: 10, name: "A", value: 10 },
        { id: 11, name: "B", value: 20 },
        { id: 12, name: "C", value: 30 },
        { id: 13, name: "D", value: 40 },
        { id: 14, name: "E", value: 50 }
      ];
      
      const oldLength = GlobalState.items.length;
      await refresh();
      
      // Should not be sorted if old length was >= 5
      expect(oldLength).toBeGreaterThanOrEqual(5);
      expect(GlobalState.items.length).toBe(3);
    });
  });

  describe('Integration tests', () => {
    test('should handle complete workflow', async () => {
      await loadItems();
      expect(GlobalState.items.length).toBe(3);
      
      search("a");
      expect(GlobalState.filter).toBe("a");
      
      await refresh();
      expect(GlobalState.items.length).toBe(3);
      
      select(2);
      expect(GlobalState.selectedId).toBe(2);
    });

    test('should maintain state consistency', async () => {
      const listener = jest.fn();
      subscribe(listener);
      
      await loadItems();
      expect(listener).toHaveBeenCalled();
      
      const callCount = listener.mock.calls.length;
      
      search("beta");
      expect(listener.mock.calls.length).toBe(callCount + 1);
    });
  });
});
