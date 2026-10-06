import { getLocalAgents } from "@ag-ui/mastra";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { mastra } from "@/lib/lissie";
import {
  createLissieRuntimeHooks,
  createUserScopedAgents,
} from "@/lib/lissie-runtime-auth";
import { getUserId } from "@/lib/session";

const runtime = new CopilotRuntime({
  agents: async ({ request }) => {
    return createUserScopedAgents(request, getUserId, (resourceId) =>
      getLocalAgents({ mastra, resourceId }),
    );
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
