const listEl = document.getElementById("list");
const form = document.getElementById("form");
const textEl = document.getElementById("text");
const filterBtns = document.querySelectorAll(".segmented .seg");
const statsEl = document.getElementById("stats");
const clearDoneBtn = document.getElementById("clearDone");

const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");

let todos = [];
let filter = "all";
let editingId = null;
let draftText = "";

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok && res.status !== 204) {
    const msg = await res.text();
    throw new Error(msg || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

/* ---------------- THEME ---------------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  themeIcon.textContent = theme === "light" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return applyTheme(saved);

  // fallback theo hệ điều hành
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  applyTheme(prefersLight ? "light" : "dark");
}

themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
});

/* ---------------- DATA ---------------- */
async function load() {
  todos = await api("/api/todos");
  render();
}

function setFilter(next) {
  filter = next;
  filterBtns.forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
  render();
}

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

function filteredTodos() {
  return todos.filter(t => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });
}

function updateStats() {
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const active = total - done;
  statsEl.textContent = `${active} active · ${done} done · ${total} total`;
}

/* ---------------- RENDER ---------------- */
function render() {
  updateStats();
  const items = filteredTodos();

  listEl.innerHTML = "";
  for (const t of items) {
    const li = document.createElement("li");
    li.className = "item" + (t.done ? " done" : "");
    li.dataset.id = t.id;

    const cb = document.createElement("input");
    cb.className = "check";
    cb.type = "checkbox";
    cb.checked = t.done;
    cb.addEventListener("change", () => toggleDone(t.id, cb.checked));

    const input = document.createElement("input");
    input.className = "text";
    input.type = "text";
    input.value = t.text;
    input.readOnly = true;

    input.addEventListener("dblclick", () => startEdit(t.id, t.text));

    // editing mode
    if (editingId === t.id) {
      input.readOnly = false;
      input.classList.add("editing");
      input.value = draftText;
      // focus sau khi gắn vào DOM
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);

      input.addEventListener("input", () => {
        draftText = input.value;
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveEdit(t.id);
        if (e.key === "Escape") cancelEdit();
      });
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    if (editingId === t.id) {
      const saveBtn = document.createElement("button");
      saveBtn.className = "small ok";
      saveBtn.textContent = "Save";
      saveBtn.addEventListener("click", () => saveEdit(t.id));

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "small";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", cancelEdit);

      actions.append(saveBtn, cancelBtn);
    } else {
      const editBtn = document.createElement("button");
      editBtn.className = "small";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => startEdit(t.id, t.text));

      const delBtn = document.createElement("button");
      delBtn.className = "small danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => removeTodo(t.id));

      actions.append(editBtn, delBtn);
    }

    li.append(cb, input, actions);
    listEl.appendChild(li);
  }
}

/* ---------------- ACTIONS ---------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textEl.value.trim();
  if (!text) return;

  const created = await api("/api/todos", {
    method: "POST",
    body: JSON.stringify({ text })
  });

  todos.unshift(created);
  textEl.value = "";
  render();
});

async function toggleDone(id, done) {
  // nếu đang edit item đó, thoát edit cho khỏi loạn
  if (editingId === id) cancelEdit();

  const updated = await api(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ done })
  });

  const idx = todos.findIndex(x => x.id === id);
  if (idx !== -1) todos[idx] = updated;
  render();
}

function startEdit(id, currentText) {
  editingId = id;
  draftText = currentText;
  render();
}

async function saveEdit(id) {
  const nextText = (draftText || "").trim();
  if (!nextText) return; // không cho lưu rỗng

  const updated = await api(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ text: nextText })
  });

  const idx = todos.findIndex(x => x.id === id);
  if (idx !== -1) todos[idx] = updated;

  editingId = null;
  draftText = "";
  render();
}

function cancelEdit() {
  editingId = null;
  draftText = "";
  render();
}

async function removeTodo(id) {
  if (editingId === id) cancelEdit();

  await api(`/api/todos/${id}`, { method: "DELETE" });
  todos = todos.filter(x => x.id !== id);
  render();
}

clearDoneBtn.addEventListener("click", async () => {
  // xóa done (gọi nhiều DELETE)
  const doneIds = todos.filter(t => t.done).map(t => t.id);
  if (doneIds.length === 0) return;

  // chạy tuần tự cho đơn giản, ít lỗi
  for (const id of doneIds) {
    await api(`/api/todos/${id}`, { method: "DELETE" });
  }
  todos = todos.filter(t => !t.done);
  if (editingId && doneIds.includes(editingId)) cancelEdit();
  render();
});

/* INIT */
initTheme();
load().catch(err => {
  console.error(err);
  alert("API lỗi. Xem docker logs.");
});
