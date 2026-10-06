import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RequestContext } from "@mastra/core/request-context";
import { isValidationError, noopObserve } from "@mastra/core/tools";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

const dir = mkdtempSync(join(tmpdir(), "todo-cat-lissie-tools-test-"));
const url = `file:${join(dir, "test.db")}`;
const alice = "lissie-tool-alice";
const bob = "lissie-tool-bob";

let db: typeof import("./db")["db"];
let schema: typeof import("./schema");
let tools: typeof import("./lissie-tools");

function context(userId: string) {
  const ctx = new RequestContext();
  ctx.setRaw("todo-cat.userId", userId);
  return ctx;
}

const ctx = { observe: noopObserve } as const;

beforeAll(async () => {
  execFileSync("npm", ["run", "--silent", "db:migrate"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  vi.stubEnv("DATABASE_URL", url);
  ({ db } = await import("./db"));
  schema = await import("./schema");
  tools = await import("./lissie-tools");
}, 60_000);

beforeEach(async () => {
  await db.delete(schema.user);
  await db.insert(schema.user).values([
    { id: alice, name: "Alice", email: "alice@example.com" },
    { id: bob, name: "Bob", email: "bob@example.com" },
  ]);
});

afterAll(() => {
  db?.$client.close();
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

describe("Lissie todo tools", () => {
  test("lists only the signed-in user's todos", async () => {
    const aliceTodoResult = await tools.addTodoTool.execute?.(
      { title: "Alice task" },
      { ...ctx, requestContext: context(alice) },
    );
    await tools.addTodoTool.execute?.(
      { title: "Bob task" },
      { ...ctx, requestContext: context(bob) },
    );

    if (isValidationError(aliceTodoResult))
      throw new Error("unexpected ValidationError");
    await expect(
      tools.listTodosTool.execute?.(
        { status: "all" },
        { ...ctx, requestContext: context(alice) },
      ),
    ).resolves.toMatchObject([
      { id: aliceTodoResult?.id, title: "Alice task" },
    ]);
  });

  test("adds a normalized todo owned by the request-context user", async () => {
    const todo = await tools.addTodoTool.execute?.(
      { title: "  buy   milk " },
      { ...ctx, requestContext: context(alice) },
    );

    expect(todo).toMatchObject({ title: "buy milk", done: false });
    await expect(
      tools.listTodosTool.execute?.(
        { status: "all" },
        { ...ctx, requestContext: context(bob) },
      ),
    ).resolves.toEqual([]);
  });

  test("marks only an owned todo done", async () => {
    const todoResult = await tools.addTodoTool.execute?.(
      { title: "feed the cat" },
      { ...ctx, requestContext: context(alice) },
    );
    if (!todoResult || isValidationError(todoResult))
      throw new Error("addTodo did not return a todo");

    await expect(
      tools.setTodoDoneTool.execute?.(
        { todoId: todoResult.id },
        { ...ctx, requestContext: context(alice) },
      ),
    ).resolves.toMatchObject({ title: "feed the cat", done: true });
    await expect(
      tools.setTodoDoneTool.execute?.(
        { todoId: todoResult.id },
        { ...ctx, requestContext: context(bob) },
      ),
    ).rejects.toMatchObject({ code: "todo-not-found" });
  });

  test("refuses to execute without a server-provided user id", async () => {
    const emptyCtx = { ...ctx, requestContext: new RequestContext() };
    await expect(
      tools.listTodosTool.execute?.({ status: "all" }, emptyCtx),
    ).rejects.toThrow("authenticated user context");
    await expect(
      tools.addTodoTool.execute?.({ title: "unowned task" }, emptyCtx),
    ).rejects.toThrow("authenticated user context");
    await expect(
      tools.setTodoDoneTool.execute?.({ todoId: "unknown" }, emptyCtx),
    ).rejects.toThrow("authenticated user context");
  });
});
