"use client";

import type { Todo } from "@todo-cat/contract";
import { useEffect, useState } from "react";

function TodoItem({ todo }: { todo: Todo }) {
  const due = todo.dueDate ? (
    <span className="todo-due">{todo.dueDate}</span>
  ) : null;
  return (
    <li className={`todo-item ${todo.done ? "todo-item--done" : ""}`}>
      <span className="todo-title">{todo.title}</span>
      {due}
    </li>
  );
}

export function TodoSidebar() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/todos?status=all")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Todo[]) => {
        if (!cancelled) setTodos(data);
      })
      .catch(() => {
        if (!cancelled) setTodos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <aside className="todo-sidebar" aria-label="To-do list" aria-busy={loading}>
      <section className="todo-section">
        <h2 className="todo-section-heading">Open</h2>
        {open.length === 0 ? (
          <p className="todo-empty">
            {loading ? "Loading…" : "Nothing here. Suspicious."}
          </p>
        ) : (
          <ul className="todo-list">
            {open.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </ul>
        )}
      </section>
      {done.length > 0 && (
        <section className="todo-section">
          <h2 className="todo-section-heading">Done</h2>
          <ul className="todo-list">
            {done.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
