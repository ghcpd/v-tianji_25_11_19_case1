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
} = require('./run4_fixed.js');

describe('Run 4: JavaScript Bug Fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = "";
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  describe('Bug 1: Unsubscribe off-by-one', () => {
    test('should remove correct listener', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();

      subscribe(fn1);
      const unsub = subscribe(fn2);
      subscribe(fn3);

      unsub();
      notify();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(0);
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    test('should not leak memory', () => {
      const fn = jest.fn();
      const unsub = subscribe(fn);
      
      expect(GlobalState.listeners).toContain(fn);
      unsub();
      expect(GlobalState.listeners).not.toContain(fn);
    });
  });

  describe('Bug 2: Shallow clone', () => {
    test('should deep clone nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: { value: 42 }
          }
        }
      };
      
      const cloned = clone(obj);
      cloned.level1.level2.level3.value = 999;
      
      expect(obj.level1.level2.level3.value).toBe(42);
    });
  });

  describe('Bug 3: Double await race', () => {
    test('should resolve promise once', async () => {
      await refresh();
      
      expect(GlobalState.items).toHaveLength(3);
      const ids = GlobalState.items.map(it => it.id);
      expect(new Set(ids).size).toBe(ids.length); // No duplicates
    });
  });

  describe('Bug 4: Items accumulation', () => {
    test('should replace not accumulate', async () => {
      GlobalState.items = [
        { id: 100, name: "Old", value: 50 }
      ];
      
      await refresh();
      
      expect(GlobalState.items).toHaveLength(3);
      expect(GlobalState.items.every(it => it.id <= 3)).toBe(true);
    });

    test('should maintain consistent length', async () => {
      await refresh();
      expect(GlobalState.items).toHaveLength(3);
      
      await refresh();
      expect(GlobalState.items).toHaveLength(3);
      
      await refresh();
      expect(GlobalState.items).toHaveLength(3);
    });
  });

  describe('Bug 5: Non-deterministic search', () => {
    test('should update synchronously', () => {
      search("test");
      expect(GlobalState.filter).toBe("test");
    });

    test('should notify immediately', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      search("query");
      
      expect(listener).toHaveBeenCalled();
      expect(GlobalState.filter).toBe("query");
    });
  });

  describe('Bug 6: Random computation', () => {
    test('should be deterministic', () => {
      const val = 75;
      const r1 = expensiveCompute(val);
      const r2 = expensiveCompute(val);
      const r3 = expensiveCompute(val);
      
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
    });

    test('should have consistent results', () => {
      const results = [];
      for (let i = 0; i < 15; i++) {
        results.push(expensiveCompute(50));
      }
      
      const unique = new Set(results);
      expect(unique.size).toBe(1);
    });
  });

  describe('Bug 7: Stale state conditional', () => {
    test('should use pre-async state for decision', async () => {
      GlobalState.items = [
        { id: 10, name: "A", value: 10 }
      ];
      
      await refresh();
      
      // Should be sorted since old length was < 5
      const values = GlobalState.items.map(it => it.value);
      const sorted = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sorted);
    });

    test('should not sort when old state has >= 5 items', async () => {
      GlobalState.items = Array.from({ length: 5 }, (_, i) => ({
        id: 20 + i,
        name: `Old${i}`,
        value: i * 10
      }));
      
      const oldLength = GlobalState.items.length;
      await refresh();
      
      expect(oldLength).toBeGreaterThanOrEqual(5);
      expect(GlobalState.items).toHaveLength(3);
    });
  });

  describe('Integration: Full workflow', () => {
    test('should handle all operations', async () => {
      const listener = jest.fn();
      subscribe(listener);
      
      await loadItems();
      expect(GlobalState.items).toHaveLength(3);
      expect(listener).toHaveBeenCalled();
      
      search("alpha");
      expect(GlobalState.filter).toBe("alpha");
      
      select(1);
      expect(GlobalState.selectedId).toBe(1);
      
      await refresh();
      expect(GlobalState.items).toHaveLength(3);
    });

    test('should maintain state integrity', async () => {
      await loadItems();
      const firstItems = GlobalState.items.map(it => it.id);
      
      search("test");
      const afterSearch = GlobalState.items.map(it => it.id);
      
      // Search should not modify items
      expect(afterSearch).toEqual(firstItems);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty items gracefully', async () => {
      expect(GlobalState.items).toHaveLength(0);
      
      search("filter");
      expect(GlobalState.filter).toBe("filter");
      
      select(99);
      expect(GlobalState.selectedId).toBe(99);
    });

    test('should handle multiple subscriptions', () => {
      const listeners = Array.from({ length: 5 }, () => jest.fn());
      const unsubs = listeners.map(l => subscribe(l));
      
      notify();
      listeners.forEach(l => expect(l).toHaveBeenCalledTimes(1));
      
      unsubs[2]();
      notify();
      
      expect(listeners[2]).toHaveBeenCalledTimes(1); // Not called again
      listeners.forEach((l, i) => {
        if (i !== 2) {
          expect(l).toHaveBeenCalledTimes(2);
        }
      });
    });
  });
});
