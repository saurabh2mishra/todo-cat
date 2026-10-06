"use client";

import type { Todo } from "@todo-cat/contract";
import { useCallback, useEffect, useRef, useState } from "react";

// The parent remounts this component (via key={refreshKey}) when Lissie's tools
// change the list. Internal mutations call fetchTodos() directly.

async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return res;
}

export function TodoPanel({ onTodosChanged }: { onTodosChanged?: () => void }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTitle, setAddTitle] = useState("");
  const [addDue, setAddDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/todos?status=all");
      if (res.ok) {
        const data: Todo[] = await res.json();
        setTodos(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleToggle = useCallback(
    async (todo: Todo) => {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)),
      );
      try {
        await apiFetch(`/api/todos/${todo.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ done: !todo.done }),
        });
        onTodosChanged?.();
      } catch {
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? { ...t, done: todo.done } : t)),
        );
      }
    },
    [onTodosChanged],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setPendingDelete(null);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      try {
        await apiFetch(`/api/todos/${id}`, { method: "DELETE" });
        onTodosChanged?.();
      } catch {
        fetchTodos();
      }
    },
    [fetchTodos, onTodosChanged],
  );

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const title = addTitle.trim();
      if (!title) return;
      setAdding(true);
      setAddError(null);
      try {
        await apiFetch("/api/todos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, dueDate: addDue || undefined }),
        });
        setAddTitle("");
        setAddDue("");
        onTodosChanged?.();
        await fetchTodos();
        titleRef.current?.focus();
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Could not add.");
      } finally {
        setAdding(false);
      }
    },
    [addTitle, addDue, fetchTodos, onTodosChanged],
  );

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const openCount = open.length;

  return (
    <aside className="todo-panel" aria-label="To-do list" aria-busy={loading}>
      <div className="todo-panel-header">
        <span className="todo-panel-title">your list</span>
        {!loading && <span className="todo-panel-count">{openCount} open</span>}
      </div>

      <div className="todo-list-scroll">
        <ul className="todo-list">
          {loading ? (
            <li>
              <p className="todo-empty">Loading…</p>
            </li>
          ) : open.length === 0 && done.length === 0 ? (
            <li>
              <p className="todo-empty">Nothing here. Suspicious.</p>
            </li>
          ) : (
            <>
              {open.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  confirming={pendingDelete === t.id}
                  onToggle={handleToggle}
                  onDeleteRequest={() => setPendingDelete(t.id)}
                  onDeleteConfirm={handleDelete}
                  onDeleteCancel={() => setPendingDelete(null)}
                />
              ))}
              {open.length > 0 && done.length > 0 && (
                <li aria-hidden="true">
                  <div className="todo-divider" />
                </li>
              )}
              {done.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  confirming={pendingDelete === t.id}
                  onToggle={handleToggle}
                  onDeleteRequest={() => setPendingDelete(t.id)}
                  onDeleteConfirm={handleDelete}
                  onDeleteCancel={() => setPendingDelete(null)}
                />
              ))}
            </>
          )}
        </ul>
      </div>

      <form className="todo-add-form" onSubmit={handleAdd} noValidate>
        <div className="todo-add-row">
          <input
            ref={titleRef}
            className="todo-add-input"
            type="text"
            placeholder="What needs doing?"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            disabled={adding}
            aria-label="New to-do title"
            maxLength={200}
          />
          <button
            className="todo-add-btn"
            type="submit"
            disabled={adding || !addTitle.trim()}
            aria-label="Add to-do"
          >
            +
          </button>
        </div>
        <input
          className="todo-add-date"
          type="date"
          value={addDue}
          onChange={(e) => setAddDue(e.target.value)}
          disabled={adding}
          aria-label="Due date (optional)"
        />
        {addError && <p className="todo-add-error">{addError}</p>}
      </form>
    </aside>
  );
}

function formatDueDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(2000, month - 1, day));
}

function TodoRow({
  todo,
  confirming,
  onToggle,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  todo: Todo;
  confirming: boolean;
  onToggle: (todo: Todo) => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}) {
  if (confirming) {
    return (
      <li className="todo-confirm">
        <span className="todo-confirm-label">Remove "{todo.title}"?</span>
        <button
          type="button"
          className="todo-confirm-yes"
          onClick={() => onDeleteConfirm(todo.id)}
        >
          Remove
        </button>
        <button
          type="button"
          className="todo-confirm-cancel"
          onClick={onDeleteCancel}
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li className={`todo-item${todo.done ? " todo-item--done" : ""}`}>
      <input
        type="checkbox"
        className="todo-check"
        checked={todo.done}
        onChange={() => onToggle(todo)}
        aria-label={`Mark ${todo.done ? "undone" : "done"}: ${todo.title}`}
      />
      <div className="todo-item-body">
        <span className="todo-title">{todo.title}</span>
        {todo.dueDate && (
          <span className="todo-due">{formatDueDate(todo.dueDate)}</span>
        )}
      </div>
      <button
        type="button"
        className="todo-delete"
        onClick={onDeleteRequest}
        aria-label={`Delete: ${todo.title}`}
      >
        ×
      </button>
    </li>
  );
}
