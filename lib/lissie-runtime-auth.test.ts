import type { RouteInfo } from "@copilotkit/runtime/v2";
import { describe, expect, test, vi } from "vitest";
import {
  authorizeLissieRuntimeRoute,
  createLissieRuntimeHooks,
  createUserScopedAgents,
} from "./lissie-runtime-auth";

const alice = "user-alice";
const bob = "user-bob";

function request(body?: unknown) {
  return new Request("http://localhost/api/copilotkit", {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("Lissie runtime route authorization", () => {
  test.each([
    ["agent/run", { method: "agent/run", agentId: "lissie" }],
    ["agent/connect", { method: "agent/connect", agentId: "lissie" }],
    ["agent/suggest", { method: "agent/suggest", agentId: "lissie" }],
  ] satisfies [string, RouteInfo][])(
    "%s accepts only the caller's thread",
    async (_, route) => {
      expect(
        await authorizeLissieRuntimeRoute(
          route,
          request({ threadId: alice }),
          alice,
        ),
      ).toBeNull();

      expect(
        (
          await authorizeLissieRuntimeRoute(
            route,
            request({ threadId: bob }),
            alice,
          )
        )?.status,
      ).toBe(404);
    },
  );

  test.each([
    [
      "agent/stop",
      { method: "agent/stop", agentId: "lissie", threadId: alice },
    ],
    ["threads/update", { method: "threads/update", threadId: alice }],
    ["threads/archive", { method: "threads/archive", threadId: alice }],
    ["threads/messages", { method: "threads/messages", threadId: alice }],
    ["threads/events", { method: "threads/events", threadId: alice }],
    ["threads/state", { method: "threads/state", threadId: alice }],
  ] satisfies [string, RouteInfo][])(
    "%s reads or mutates only the caller's thread",
    async (_, ownedRoute) => {
      expect(
        await authorizeLissieRuntimeRoute(ownedRoute, request(), alice),
      ).toBeNull();

      const foreignRoute = { ...ownedRoute, threadId: bob } as RouteInfo;
      expect(
        (await authorizeLissieRuntimeRoute(foreignRoute, request(), alice))
          ?.status,
      ).toBe(404);
    },
  );

  test.each([
    ["threads/list", { method: "threads/list" }],
    ["threads/subscribe", { method: "threads/subscribe" }],
    ["threads/clear", { method: "threads/clear" }],
    ["trajectory/connect", { method: "trajectory/connect", trajectoryId: "t" }],
    ["memories/list", { method: "memories/list" }],
    ["memories/recall", { method: "memories/recall" }],
    ["memories/subscribe", { method: "memories/subscribe" }],
    ["memories/mutate", { method: "memories/mutate", memoryId: "m" }],
    ["annotate", { method: "annotate" }],
    ["cpk-debug-events", { method: "cpk-debug-events" }],
    ["inspector/metadata", { method: "inspector/metadata" }],
    ["inspector/learning", { method: "inspector/learning" }],
  ] satisfies [string, RouteInfo][])(
    "%s is allowed for any authenticated user",
    async (_, route) => {
      expect(
        await authorizeLissieRuntimeRoute(route, request(), alice),
      ).toBeNull();
    },
  );

  test("allows the authenticated runtime info route", async () => {
    expect(
      await authorizeLissieRuntimeRoute({ method: "info" }, request(), alice),
    ).toBeNull();
  });

  test("rejects malformed and missing run thread ids", async () => {
    const route: RouteInfo = { method: "agent/run", agentId: "lissie" };

    expect(
      (
        await authorizeLissieRuntimeRoute(
          route,
          new Request("http://localhost", { method: "POST", body: "{" }),
          alice,
        )
      )?.status,
    ).toBe(400);
    expect(
      (await authorizeLissieRuntimeRoute(route, request({}), alice))?.status,
    ).toBe(404);
  });

  test("rejects requests for unregistered agent ids", async () => {
    expect(
      (
        await authorizeLissieRuntimeRoute(
          { method: "agent/run", agentId: "other" },
          request({ threadId: alice }),
          alice,
        )
      )?.status,
    ).toBe(404);
  });
});

describe("Lissie runtime authentication hooks", () => {
  test("rejects unauthenticated requests before route dispatch", async () => {
    const resolveUserId = vi.fn(async () => null);
    const hooks = createLissieRuntimeHooks(resolveUserId);

    await expect(
      hooks.onRequest?.({
        request: request(),
        path: "/info",
        runtime: {} as never,
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(resolveUserId).toHaveBeenCalledOnce();
  });

  test("re-authenticates before thread authorization", async () => {
    const resolveUserId = vi.fn(async () => alice);
    const hooks = createLissieRuntimeHooks(resolveUserId);

    await expect(
      hooks.onBeforeHandler?.({
        request: request({ threadId: bob }),
        path: "/agent/lissie/run",
        runtime: {} as never,
        route: { method: "agent/run", agentId: "lissie" },
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(resolveUserId).toHaveBeenCalledOnce();
  });
});

describe("Lissie memory resource scoping", () => {
  test("uses the verified user id as the Mastra resource id", async () => {
    const createAgents = vi.fn((resourceId: string) => ({ resourceId }));

    const aliceAgents = await createUserScopedAgents(
      request(),
      async () => alice,
      createAgents,
    );
    const bobAgents = await createUserScopedAgents(
      request(),
      async () => bob,
      createAgents,
    );

    expect(aliceAgents.resourceId).toBe(alice);
    expect(bobAgents.resourceId).toBe(bob);
    expect(createAgents).toHaveBeenNthCalledWith(1, alice);
    expect(createAgents).toHaveBeenNthCalledWith(2, bob);
  });

  test("does not construct an agent resource for an anonymous request", async () => {
    const createAgents = vi.fn();

    await expect(
      createUserScopedAgents(request(), async () => null, createAgents),
    ).rejects.toMatchObject({ status: 401 });
    expect(createAgents).not.toHaveBeenCalled();
  });
});
