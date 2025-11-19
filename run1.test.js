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
} = require('./run1_fixed.js');

describe('Run 1: JavaScript Bug Fixes', () => {
  beforeEach(() => {
    // Reset global state before each test
    GlobalState.items = [];
    GlobalState.filter = "";
    GlobalState.selectedId = null;
    GlobalState.listeners = [];
  });

  describe('Bug 1: Deep clone', () => {
    test('should create deep copy of nested objects', () => {
      const original = { a: 1, nested: { b: 2 } };
      const cloned = clone(original);
      cloned.nested.b = 99;
      expect(original.nested.b).toBe(2);
      expect(cloned.nested.b).toBe(99);
    });
  });

  describe('Bug 2: Unsubscribe off-by-one error', () => {
    test('should remove correct listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      subscribe(listener1);
      const unsub2 = subscribe(listener2);
      subscribe(listener3);

      expect(GlobalState.listeners.length).toBe(3);

      unsub2();
      expect(GlobalState.listeners.length).toBe(2);
      
      notify();
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(0);
      expect(listener3).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bug 3: Race condition in refresh', () => {
    test('should not have race condition with promise resolution', async () => {
      GlobalState.items = [{ id: 1, name: "Test", value: 50 }];
      
      await refresh();
      
      const itemCount = GlobalState.items.length;
      expect(itemCount).toBe(3);
      
      // Verify no duplicates from double await
      const ids = GlobalState.items.map(it => it.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('Bug 4: Non-deterministic search timing', () => {
    test('should update filter synchronously', () => {
      const listener = jest.fn();
      subscribe(listener);
      
      search("test");
      
      expect(GlobalState.filter).toBe("test");
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Bug 5: Non-deterministic expensiveCompute', () => {
    test('should return deterministic results', () => {
      const value = 42;
      const result1 = expensiveCompute(value);
      const result2 = expensiveCompute(value);
      const result3 = expensiveCompute(value);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('Bug 6: Items accumulate in refresh', () => {
    test('should replace items instead of accumulating', async () => {
      GlobalState.items = [
        { id: 99, name: "Old", value: 1 },
        { id: 98, name: "OldTwo", value: 2 }
      ];
      
      await refresh();
      
      expect(GlobalState.items.length).toBe(3);
      expect(GlobalState.items.every(it => it.id <= 3)).toBe(true);
    });
  });

  describe('Bug 7: Missing await in loadItems', () => {
    test('should properly await loadItems', async () => {
      expect(GlobalState.items.length).toBe(0);
      
      await loadItems();
      
      expect(GlobalState.items.length).toBe(3);
    });
  });

  describe('Integration: State management', () => {
    test('should handle multiple operations correctly', async () => {
      const listener = jest.fn();
      subscribe(listener);
      
      await loadItems();
      expect(GlobalState.items.length).toBe(3);
      expect(listener).toHaveBeenCalled();
      
      search("alpha");
      expect(GlobalState.filter).toBe("alpha");
      
      select(2);
      expect(GlobalState.selectedId).toBe(2);
    });
  });

  describe('Integration: Async behavior', () => {
    test('should handle async operations in sequence', async () => {
      await loadItems();
      const firstCount = GlobalState.items.length;
      expect(firstCount).toBe(3);
      
      await refresh();
      const secondCount = GlobalState.items.length;
      expect(secondCount).toBe(3);
    });
  });
});
