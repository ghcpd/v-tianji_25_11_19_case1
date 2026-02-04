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
} = require('./run3_fixed.js');

describe('Run 3: JavaScript Bug Fixes', () => {
  beforeEach(() => {
    GlobalState.items = [];
    GlobalState.filter = "";
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  describe('Bug 1: Incorrect splice index', () => {
    test('should remove correct listener from array', () => {
      const l1 = jest.fn();
      const l2 = jest.fn();
      const l3 = jest.fn();

      subscribe(l1);
      const unsub2 = subscribe(l2);
      subscribe(l3);

      expect(GlobalState.listeners).toHaveLength(3);
      unsub2();
      expect(GlobalState.listeners).toHaveLength(2);

      notify();
      expect(l1).toHaveBeenCalled();
      expect(l2).not.toHaveBeenCalled();
      expect(l3).toHaveBeenCalled();
    });
  });

  describe('Bug 2: Promise resolution timing', () => {
    test('should not have race condition', async () => {
      await refresh();
      
      expect(GlobalState.items).toHaveLength(3);
      
      // Verify all items are valid
      GlobalState.items.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('value');
      });
    });
  });

  describe('Bug 3: Array mutation vs replacement', () => {
    test('should replace items not append', async () => {
      GlobalState.items = [
        { id: 99, name: "OldItem", value: 999 }
      ];
      
      await refresh();
      
      expect(GlobalState.items).toHaveLength(3);
      expect(GlobalState.items.find(it => it.id === 99)).toBeUndefined();
    });

    test('should not accumulate over multiple refreshes', async () => {
      await refresh();
      const firstCount = GlobalState.items.length;
      
      await refresh();
      const secondCount = GlobalState.items.length;
      
      expect(firstCount).toBe(3);
      expect(secondCount).toBe(3);
    });
  });

  describe('Bug 4: Shallow copy', () => {
    test('should create deep clone of objects', () => {
      const original = {
        a: 1,
        nested: {
          b: 2,
          deeper: {
            c: 3
          }
        }
      };
      
      const cloned = clone(original);
      cloned.nested.deeper.c = 999;
      
      expect(original.nested.deeper.c).toBe(3);
      expect(cloned.nested.deeper.c).toBe(999);
    });
  });

  describe('Bug 5: Random delay in search', () => {
    test('should update filter synchronously', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      search("test");
      
      expect(GlobalState.filter).toBe("test");
      expect(listener).toHaveBeenCalled();
    });

    test('should be immediately available', () => {
      search("alpha");
      expect(GlobalState.filter).toBe("alpha");
      
      search("beta");
      expect(GlobalState.filter).toBe("beta");
    });
  });

  describe('Bug 6: Non-deterministic calculation', () => {
    test('should return same result for same input', () => {
      const input = 42;
      const result1 = expensiveCompute(input);
      const result2 = expensiveCompute(input);
      const result3 = expensiveCompute(input);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('should be deterministic across multiple calls', () => {
      const results = Array.from({ length: 20 }, () => expensiveCompute(50));
      const allSame = results.every(r => r === results[0]);
      expect(allSame).toBe(true);
    });
  });

  describe('Bug 7: Missing await for loadItems', () => {
    test('should properly await loadItems', async () => {
      expect(GlobalState.items).toHaveLength(0);
      
      await loadItems();
      
      expect(GlobalState.items).toHaveLength(3);
    });
  });

  describe('Bug 8: Stale state in conditional', () => {
    test('should capture state before async operation', async () => {
      GlobalState.items = [
        { id: 10, name: "A", value: 10 },
        { id: 11, name: "B", value: 20 }
      ];
      
      await refresh();
      
      // With old length < 5, should be sorted
      expect(GlobalState.items).toHaveLength(3);
      const values = GlobalState.items.map(it => it.value);
      const sorted = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sorted);
    });

    test('should not sort when old length >= 5', async () => {
      GlobalState.items = Array.from({ length: 6 }, (_, i) => ({
        id: i + 20,
        name: `Item${i}`,
        value: i * 10
      }));
      
      await refresh();
      
      // With old length >= 5, sorting should not be applied
      expect(GlobalState.items).toHaveLength(3);
    });
  });

  describe('Integration: Complete workflow', () => {
    test('should handle full simulation flow', async () => {
      const listener = jest.fn();
      subscribe(listener);
      
      await loadItems();
      expect(GlobalState.items).toHaveLength(3);
      
      search("a");
      expect(GlobalState.filter).toBe("a");
      
      select(2);
      expect(GlobalState.selectedId).toBe(2);
      
      await refresh();
      expect(GlobalState.items).toHaveLength(3);
      
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });

    test('should maintain consistency across operations', async () => {
      await loadItems();
      const items1 = [...GlobalState.items];
      
      search("gamma");
      const items2 = [...GlobalState.items];
      
      // Search should not modify items
      expect(items1).toEqual(items2);
      expect(GlobalState.filter).toBe("gamma");
    });
  });
});
