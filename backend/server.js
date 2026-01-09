import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const DATA_DIR = process.env.DATA_DIR || "./data";
const FILE_PATH = path.join(DATA_DIR, "todos.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, "[]", "utf8");
}

function readTodos() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(FILE_PATH, "utf8")); }
  catch { return []; }
}

function writeTodos(todos) {
  ensureFile();
  fs.writeFileSync(FILE_PATH, JSON.stringify(todos, null, 2), "utf8");
}

function id() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

app.get("/health", (_, res) => res.json({ ok: true }));

app.get("/api/todos", (_, res) => res.json(readTodos()));

app.post("/api/todos", (req, res) => {
  const text = (req.body?.text ?? "").toString().trim();
  if (!text) return res.status(400).json({ error: "text is required" });

  const todos = readTodos();
  const todo = { id: id(), text, done: false, createdAt: new Date().toISOString() };
  todos.unshift(todo);
  writeTodos(todos);
  res.status(201).json(todo);
});

app.patch("/api/todos/:id", (req, res) => {
  const { id: tid } = req.params;
  const todos = readTodos();
  const i = todos.findIndex(t => t.id === tid);
  if (i === -1) return res.status(404).json({ error: "not found" });

  if (typeof req.body?.text === "string") todos[i].text = req.body.text.trim();
  if (typeof req.body?.done === "boolean") todos[i].done = req.body.done;

  writeTodos(todos);
  res.json(todos[i]);
});

app.delete("/api/todos/:id", (req, res) => {
  const { id: tid } = req.params;
  const todos = readTodos();
  const next = todos.filter(t => t.id !== tid);
  if (next.length === todos.length) return res.status(404).json({ error: "not found" });
  writeTodos(next);
  res.status(204).end();
});

app.listen(PORT, HOST, () => console.log(`Backend on ${HOST}:${PORT}`));
