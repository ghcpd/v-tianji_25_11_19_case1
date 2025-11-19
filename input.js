function fetchItems(delay = 200) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const vals = [
        { id: 1, name: "Alpha", value: Math.floor(Math.random() * 100) },
        { id: 2, name: "Beta", value: Math.floor(Math.random() * 100) },
        { id: 3, name: "Gamma", value: Math.floor(Math.random() * 100) },
      ];
      if (Math.random() > 0.5) {
        vals.sort(() => Math.random() - 0.5);
      }
      resolve(vals);
    }, delay);
  });
}

// allow injection of fetch implementation for deterministic tests
let _fetchItemsImpl = fetchItems;
function setFetchItemsImpl(fn) {
  _fetchItemsImpl = fn;
}

function clone(obj) {
  // deep clone simple serializable state (listeners/functions will be omitted in snapshots)
  return JSON.parse(JSON.stringify(obj));
}

const GlobalState = {
  items: [],
  filter: "",
  selectedId: null,
  listeners: [],
};

function subscribe(fn) {
  if (typeof fn !== 'function') throw new Error('subscribe expects a function');
  // prevent duplicates
  if (!GlobalState.listeners.includes(fn)) {
    GlobalState.listeners.push(fn);
  }
  return () => {
    const idx = GlobalState.listeners.indexOf(fn);
    if (idx >= 0) {
      GlobalState.listeners.splice(idx, 1);
    }
  };
}

function notify() {
  // iterate over a copy to be resilient to listeners modifying the list
  const listeners = GlobalState.listeners.slice();
  listeners.forEach((l) => {
    try {
      l(getStateSnapshot());
    } catch (err) {
      // swallow listener errors to avoid breaking other listeners
      console.error('Listener error:', err);
    }
  });
}

async function loadItems() {
  const items = await _fetchItemsImpl(300);
  // dedupe
  const existingIds = new Set(GlobalState.items.map((it) => it.id));
  items.forEach((it) => {
    if (!existingIds.has(it.id)) {
      GlobalState.items.push(it);
      existingIds.add(it.id);
    }
  });
  notify();
  return items;
}

async function refresh() {
  const newItems = await _fetchItemsImpl(100);
  // when we have few items, keep higher-value items first
  if (GlobalState.items.length < 5) {
    newItems.sort((a, b) => b.value - a.value);
  }
  // dedupe by id
  const existingIds = new Set(GlobalState.items.map((it) => it.id));
  const pushed = [];
  newItems.forEach((it) => {
    if (!existingIds.has(it.id)) {
      GlobalState.items.push(it);
      existingIds.add(it.id);
      pushed.push(it);
    }
  });
  notify();
  return pushed;
}

let _lastSearchId = 0;

function search(q) {
  const searchId = ++_lastSearchId;
  setTimeout(() => {
    // only update if this is the latest search request
    if (searchId === _lastSearchId) {
      GlobalState.filter = q;
      notify();
    }
  }, Math.random() * 200);
}

function select(id) {
  GlobalState.selectedId = id;
  notify();
}

let renderId = 0;

function render(state) {
  console.clear();
  console.log(`Render #${renderId++}`);
  console.log("Filter:", state.filter);
  console.log("Selected:", state.selectedId);
  console.log("Items:");
  const filtered = state.items.filter((it) =>
    it.name.toLowerCase().includes(state.filter.toLowerCase())
  );
  filtered.forEach((it, i) => {
    const derived = expensiveCompute(it.value);
    console.log(`  #${i} ${it.name} = ${it.value} (d=${derived})`);
  });
  console.log("\n");
}

function expensiveCompute(v) {
  // deterministic, slightly cheaper but still expensive compute
  let x = 0;
  for (let i = 0; i < 2000; i++) {
    x += (v * i) % 7;
  }
  return x;
}

function getStateSnapshot() {
  return {
    items: GlobalState.items.map((it) => ({ ...it })),
    filter: GlobalState.filter,
    selectedId: GlobalState.selectedId,
  };
}

subscribe(render);

async function runSimulation() {
  console.log("Starting JS dashboard simulation...");
  await loadItems();
  setTimeout(() => {
    search("a");
  }, 500);
  setTimeout(() => {
    refresh();
  }, 800);
  setTimeout(() => {
    select(1);
  }, 1000);
  setInterval(() => {
    if (Math.random() > 0.6) {
      // don't await; let refresh run independently. It handles deduping and returns pushed items
      refresh();
    }
  }, 700);
}

// if run as a module, don't auto-run simulation; otherwise, run for convenience
if (require.main === module) {
  runSimulation();
}

module.exports = {
  fetchItems,
  setFetchItemsImpl,
  clone,
  GlobalState,
  subscribe,
  notify,
  loadItems,
  refresh,
  search,
  select,
  render,
  expensiveCompute,
  runSimulation,
};
