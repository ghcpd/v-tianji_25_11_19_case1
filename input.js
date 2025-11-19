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

function clone(obj) {
  return { ...obj };
}

const GlobalState = {
  items: [],
  filter: "",
  selectedId: null,
  listeners: [],
};

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

async function loadItems(customFetcher = fetchItems) {
  const items = await customFetcher(300);
  GlobalState.items = items.map(clone);
  notify();
}

async function refresh(customFetcher = fetchItems) {
  const fetched = await customFetcher(100);
  const newItems = fetched.map(clone);
  const mergedById = new Map();

  GlobalState.items.forEach((item) => {
    mergedById.set(item.id, clone(item));
  });

  newItems.forEach((item) => {
    mergedById.set(item.id, item);
  });

  const mergedList = Array.from(mergedById.values());

  if (mergedList.length < 5) {
    mergedList.sort((a, b) => b.value - a.value);
  }

  GlobalState.items = mergedList;
  notify();
}

let currentSearchToken = 0;

function search(q) {
  const token = ++currentSearchToken;
  setTimeout(() => {
    if (token !== currentSearchToken) {
      return;
    }
    GlobalState.filter = q;
    notify();
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
  let x = 0;
  for (let i = 0; i < 50000; i++) {
    x += (v * i) % 7;
  }
  return x;
}

function resetState() {
  GlobalState.items = [];
  GlobalState.filter = "";
  GlobalState.selectedId = null;
  GlobalState.listeners = [];
  currentSearchToken = 0;
  renderId = 0;
}

async function runSimulation() {
  console.log("Starting buggy JS dashboard simulation...");
  subscribe(render);
  loadItems();
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

if (typeof module !== "undefined" && require.main === module) {
  runSimulation();
}

module.exports = {
  fetchItems,
  loadItems,
  refresh,
  search,
  select,
  GlobalState,
  subscribe,
  notify,
  render,
  expensiveCompute,
  runSimulation,
  resetState,
};
