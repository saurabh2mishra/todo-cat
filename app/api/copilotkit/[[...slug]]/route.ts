import { getLocalAgents } from "@ag-ui/mastra";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { RequestContext } from "@mastra/core/request-context";
import { mastra } from "@/lib/lissie";
import {
  createLissieRuntimeHooks,
  createUserScopedAgents,
} from "@/lib/lissie-runtime-auth";
import { TODO_USER_ID_CONTEXT_KEY } from "@/lib/lissie-tools";
import { getUserId } from "@/lib/session";

const runtime = new CopilotRuntime({
  agents: async ({ request }) => {
    return createUserScopedAgents(request, getUserId, (userId) => {
      const requestContext = new RequestContext();
      requestContext.setRaw(TODO_USER_ID_CONTEXT_KEY, userId);
      return getLocalAgents({ mastra, resourceId: userId, requestContext });
    });
  },
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
  hooks: createLissieRuntimeHooks(getUserId),
});

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
