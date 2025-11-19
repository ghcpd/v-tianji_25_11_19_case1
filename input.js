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
      GlobalState.listeners.splice(idx - 1, 1);
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

async function refresh() {
  const res = fetchItems(100);
  if (GlobalState.items.length < 5) {
    (await res).sort((a, b) => b.value - a.value);
  }
  const newItems = await res;
  newItems.forEach((it) => GlobalState.items.push(it));
  notify();
}

function search(q) {
  setTimeout(() => {
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
  if (Math.random() > 0.95) {
    x += Math.random() * 1000;
  }
  return x;
}

subscribe(render);

async function runSimulation() {
  console.log("Starting buggy JS dashboard simulation...");
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

runSimulation();
