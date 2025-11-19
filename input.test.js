const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  loadItems,
  refresh,
  search,
  subscribe,
  notify,
  GlobalState,
  resetState,
  expensiveCompute,
} = require('./input.js');

beforeEach(() => {
  resetState();
});

test('unsubscribe removes the intended listener only', () => {
  const callOrder = [];
  const unsubA = subscribe(() => {
    callOrder.push('A');
  });
  subscribe(() => {
    callOrder.push('B');
  });

  notify();
  assert.deepEqual(callOrder, ['A', 'B']);

  callOrder.length = 0;
  unsubA();
  notify();
  assert.deepEqual(callOrder, ['B']);
});

test('refresh merges items without duplicating ids and keeps small lists sorted', async () => {
  const initialItems = [
    { id: 1, name: 'Alpha', value: 10 },
    { id: 2, name: 'Beta', value: 20 },
    { id: 3, name: 'Gamma', value: 30 },
  ];

  await loadItems(async () => initialItems);
  assert.strictEqual(GlobalState.items.length, 3);

  // Mutating the source array should not affect stored state copies
  initialItems[0].value = 999;
  assert.strictEqual(GlobalState.items[0].value, 10);

  const refreshedItems = [
    { id: 1, name: 'Alpha', value: 30 },
    { id: 2, name: 'Beta', value: 90 },
    { id: 3, name: 'Gamma', value: 60 },
  ];

  await refresh(async () => refreshedItems);

  assert.strictEqual(GlobalState.items.length, 3);
  assert.deepEqual(
    GlobalState.items.map((item) => item.value),
    [90, 60, 30]
  );
  assert.strictEqual(new Set(GlobalState.items.map((item) => item.id)).size, 3);

  refreshedItems[1].value = 1;
  assert.strictEqual(GlobalState.items[0].value, 90);
});

test('search ignores stale queries in flight', async () => {
  const originalRandom = Math.random;
  const randomValues = [0.9, 0.1];
  Math.random = () => randomValues.shift() ?? 0;

  try {
    search('first');
    search('second');

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(GlobalState.filter, 'second');

    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.strictEqual(GlobalState.filter, 'second');
  } finally {
    Math.random = originalRandom;
  }
});

test('expensiveCompute is deterministic', () => {
  const first = expensiveCompute(42);
  const second = expensiveCompute(42);
  assert.strictEqual(first, second);
});
