const assert = require('assert');
const { fetchItems, GlobalState, subscribe, notify, loadItems, refresh, search, select } = require('./input');

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function runTests() {
  console.log('Running tests...');

  // Reset state
  GlobalState.items = [];
  GlobalState.filter = '';
  GlobalState.selectedId = null;

  // Test subscribe/unsubscribe
  let calls = 0;
  const listener = () => { calls++; };
  const listener2 = () => { calls += 2; };
  const unsub1 = subscribe(listener);
  const unsub2 = subscribe(listener2);

  notify();
  assert.strictEqual(calls, 3, 'listeners should be invoked (1+2)');

  unsub1();
  notify();
  assert.strictEqual(calls, 5, 'only second listener should be called after unsub1');

  unsub2();
  notify();
  assert.strictEqual(calls, 5, 'no listeners should be called after both unsubscribed');

  // Test loadItems & refresh deduplication
  GlobalState.items = [];
  await loadItems();
  assert.strictEqual(GlobalState.items.length, 3, 'should load 3 unique items');

  // calling refresh should not add duplicates
  await refresh();
  assert.strictEqual(GlobalState.items.length, 3, 'refresh should not duplicate items');

  // Test search returns promise and sets filter
  await search('a');
  assert.strictEqual(GlobalState.filter, 'a', 'search should set filter');

  // Test select behavior
  select(1);
  assert.strictEqual(GlobalState.selectedId, 1, 'select existing id should set id');
  select(999);
  assert.strictEqual(GlobalState.selectedId, null, 'select nonexistent id should clear selection');

  console.log('All tests passed.');
}

runTests().catch(err => { console.error(err); process.exit(1); });
