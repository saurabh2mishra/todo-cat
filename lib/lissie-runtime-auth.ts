import type { CopilotRuntimeHooks, RouteInfo } from "@copilotkit/runtime/v2";

type ResolveUserId = (headers: Headers) => Promise<string | null>;
type CreateAgents<T> = (resourceId: string) => T;

const unauthorized = () =>
  new Response("Unauthorized", {
    status: 401,
    headers: { "www-authenticate": "Bearer" },
  });

const notFound = () => new Response("Not found", { status: 404 });
const forbidden = () => new Response("Forbidden", { status: 403 });

export async function createUserScopedAgents<T>(
  request: Request,
  resolveUserId: ResolveUserId,
  createAgents: CreateAgents<T>,
): Promise<T> {
  const userId = await resolveUserId(request.headers);
  if (!userId) throw unauthorized();
  return createAgents(userId);
}

export async function authorizeLissieRuntimeRoute(
  route: RouteInfo,
  request: Request,
  userId: string,
): Promise<Response | null> {
  switch (route.method) {
    case "agent/run":
    case "agent/connect": {
      if (route.agentId !== "lissie") return notFound();

      let body: unknown;
      try {
        body = await request.clone().json();
      } catch {
        return new Response("Invalid request body", { status: 400 });
      }

      if (
        typeof body !== "object" ||
        body === null ||
        !("threadId" in body) ||
        body.threadId !== userId
      ) {
        return notFound();
      }
      return null;
    }
    case "agent/stop":
    case "threads/update":
    case "threads/archive":
    case "threads/messages":
    case "threads/events":
    case "threads/state":
      return route.threadId === userId ? null : notFound();
    case "info":
    case "transcribe":
      return null;
    default:
      return forbidden();
  }
}

export function createLissieRuntimeHooks(
  resolveUserId: ResolveUserId,
): CopilotRuntimeHooks {
  return {
    onRequest: async ({ request }) => {
      const userId = await resolveUserId(request.headers);
      if (!userId) throw unauthorized();
    },
    onBeforeHandler: async ({ request, route }) => {
      const userId = await resolveUserId(request.headers);
      if (!userId) throw unauthorized();

      const denied = await authorizeLissieRuntimeRoute(route, request, userId);
      if (denied) throw denied;
    },
  };
}
