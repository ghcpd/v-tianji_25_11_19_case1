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

// FIX 1: Deep clone implementation
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const GlobalState = {
  items: [],
  filter: "",
  selectedId: null,
  listeners: [],
};

// FIX 2: Correct splice index
function subscribe(fn) {
  GlobalState.listeners.push(fn);
  return () => {
    const idx = GlobalState.listeners.indexOf(fn);
    if (idx >= 0) {
      GlobalState.listeners.splice(idx, 1);
    }
  };
}

function notify() {
  GlobalState.listeners.forEach((l) => l(GlobalState));
}

async function loadItems() {
  const items = await fetchItems(300);
  GlobalState.items.push(...items);
  notify();
}

// FIX 3: Resolve promise once and FIX 6: Clear items before refresh
async function refresh() {
  const newItems = await fetchItems(100);
  if (GlobalState.items.length < 5) {
    newItems.sort((a, b) => b.value - a.value);
  }
  GlobalState.items = [];
  newItems.forEach((it) => GlobalState.items.push(it));
  notify();
}

// FIX 4: Deterministic search timing
function search(q) {
  GlobalState.filter = q;
  notify();
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

// FIX 5: Deterministic compute
function expensiveCompute(v) {
  let x = 0;
  for (let i = 0; i < 50000; i++) {
    x += (v * i) % 7;
  }
  return x;
}

subscribe(render);

// FIX 7: Await loadItems
async function runSimulation() {
  console.log("Starting buggy JS dashboard simulation...");
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
      refresh();
    }
  }, 700);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
    runSimulation
  };
} else {
  runSimulation();
}
