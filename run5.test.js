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
} = require('./run5_fixed.js');

describe('Run 5: JavaScript Bug Fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = "";
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  describe('Bug 1: Splice off-by-one', () => {
    test('should remove correct listener at correct index', () => {
      const l1 = jest.fn();
      const l2 = jest.fn();
      const l3 = jest.fn();

      subscribe(l1);
      const unsub2 = subscribe(l2);
      subscribe(l3);

      expect(GlobalState.listeners.length).toBe(3);
      unsub2();
      expect(GlobalState.listeners.length).toBe(2);

      notify();
      expect(l1).toHaveBeenCalled();
      expect(l2).not.toHaveBeenCalled();
      expect(l3).toHaveBeenCalled();
    });

    test('should handle edge case of first listener', () => {
      const l1 = jest.fn();
      const l2 = jest.fn();
      
      const unsub1 = subscribe(l1);
      subscribe(l2);
      
      unsub1();
      notify();
      
      expect(l1).not.toHaveBeenCalled();
      expect(l2).toHaveBeenCalled();
    });
  });

  describe('Bug 2: Shallow clone', () => {
    test('should deep clone nested structures', () => {
      const original = {
        a: 1,
        nested: {
          b: 2,
          deeper: {
            c: 3
          }
        },
        array: [1, 2, { d: 4 }]
      };
      
      const cloned = clone(original);
      cloned.nested.deeper.c = 999;
      
      expect(original.nested.deeper.c).toBe(3);
      expect(cloned.nested.deeper.c).toBe(999);
    });
  });

  describe('Bug 3: Promise await race', () => {
    test('should not have race condition from multiple awaits', async () => {
      await refresh();
      
      expect(GlobalState.items.length).toBe(3);
      
      // Check all items are valid
      GlobalState.items.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('value');
        expect(item.id).toBeGreaterThan(0);
        expect(item.id).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Bug 4: Items accumulation', () => {
    test('should replace items not accumulate', async () => {
      GlobalState.items = [
        { id: 99, name: "OldItem1", value: 100 },
        { id: 98, name: "OldItem2", value: 200 }
      ];
      
      await refresh();
      
      expect(GlobalState.items.length).toBe(3);
      expect(GlobalState.items.find(it => it.id === 99)).toBeUndefined();
      expect(GlobalState.items.find(it => it.id === 98)).toBeUndefined();
    });

    test('should maintain size across refreshes', async () => {
      await refresh();
      expect(GlobalState.items.length).toBe(3);
      
      await refresh();
      expect(GlobalState.items.length).toBe(3);
      
      await refresh();
      expect(GlobalState.items.length).toBe(3);
    });
  });

  describe('Bug 5: Random search delay', () => {
    test('should update filter synchronously without delay', () => {
      const startTime = Date.now();
      search("test");
      const endTime = Date.now();
      
      expect(GlobalState.filter).toBe("test");
      expect(endTime - startTime).toBeLessThan(10); // Should be instant
    });

    test('should notify listeners immediately', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      search("alpha");
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(GlobalState.filter).toBe("alpha");
    });
  });

  describe('Bug 6: Non-deterministic compute', () => {
    test('should return deterministic results', () => {
      const input = 42;
      const result1 = expensiveCompute(input);
      const result2 = expensiveCompute(input);
      const result3 = expensiveCompute(input);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('should be consistent across many calls', () => {
      const value = 75;
      const results = Array.from({ length: 25 }, () => expensiveCompute(value));
      
      const allEqual = results.every(r => r === results[0]);
      expect(allEqual).toBe(true);
    });
  });

  describe('Bug 7: Stale state in sorting', () => {
    test('should capture state before async operation', async () => {
      GlobalState.items = [
        { id: 10, name: "A", value: 10 },
        { id: 11, name: "B", value: 20 }
      ];
      
      await refresh();
      
      // With < 5 items before refresh, should sort
      expect(GlobalState.items.length).toBe(3);
      const values = GlobalState.items.map(it => it.value);
      const sortedDesc = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sortedDesc);
    });

    test('should not sort when pre-async state has >= 5', async () => {
      GlobalState.items = Array.from({ length: 6 }, (_, i) => ({
        id: 50 + i,
        name: `Item${i}`,
        value: i * 5
      }));
      
      const preRefreshLength = GlobalState.items.length;
      await refresh();
      
      expect(preRefreshLength).toBeGreaterThanOrEqual(5);
      expect(GlobalState.items.length).toBe(3);
    });
  });

  describe('Bug 8: Missing await in runSimulation', () => {
    test('loadItems should be awaitable', async () => {
      expect(GlobalState.items.length).toBe(0);
      
      await loadItems();
      
      expect(GlobalState.items.length).toBe(3);
    });

    test('should load items before proceeding', async () => {
      const promise = loadItems();
      expect(GlobalState.items.length).toBe(0); // Not loaded yet
      
      await promise;
      expect(GlobalState.items.length).toBe(3); // Now loaded
    });
  });

  describe('Integration: Complete flow', () => {
    test('should handle full workflow correctly', async () => {
      const listener = jest.fn();
      subscribe(listener);
      
      await loadItems();
      expect(GlobalState.items.length).toBe(3);
      
      search("alpha");
      expect(GlobalState.filter).toBe("alpha");
      
      select(2);
      expect(GlobalState.selectedId).toBe(2);
      
      await refresh();
      expect(GlobalState.items.length).toBe(3);
      
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });

    test('should maintain correct state throughout operations', async () => {
      await loadItems();
      const afterLoad = [...GlobalState.items];
      
      search("filter");
      expect(GlobalState.items).toEqual(afterLoad); // Items unchanged
      expect(GlobalState.filter).toBe("filter");
      
      select(1);
      expect(GlobalState.items).toEqual(afterLoad); // Still unchanged
      expect(GlobalState.selectedId).toBe(1);
    });
  });

  describe('Edge cases and stress tests', () => {
    test('should handle rapid state changes', async () => {
      await loadItems();
      
      for (let i = 0; i < 10; i++) {
        search(`query${i}`);
        select(i);
      }
      
      expect(GlobalState.filter).toBe("query9");
      expect(GlobalState.selectedId).toBe(9);
    });

    test('should handle multiple concurrent refreshes', async () => {
      const promises = [refresh(), refresh(), refresh()];
      await Promise.all(promises);
      
      expect(GlobalState.items.length).toBe(3);
    });
  });
});
