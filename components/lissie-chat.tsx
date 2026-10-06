"use client";

import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  CopilotKitProvider,
  useRenderTool,
} from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { TodoSidebar } from "./todo-sidebar";

// Renders a single tool-call line and fires onComplete once when the call finishes.
function ToolLine({
  status,
  line,
  onComplete,
}: {
  status: string;
  line: string;
  onComplete?: () => void;
}) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (status === "complete" && !firedRef.current) {
      firedRef.current = true;
      onComplete?.();
    }
  }, [status, onComplete]);
  return <span className="lissie-tool-line">{line}</span>;
}

function LissieChatInner({
  threadId,
  refreshKey,
  onRefresh,
}: {
  threadId: string;
  refreshKey: number;
  onRefresh: () => void;
}) {
  useRenderTool(
    {
      name: "listTodos",
      parameters: z.object({}),
      render: ({ status }) => (
        <span className="lissie-tool-line">
          {status === "complete" ? "Reviewed your list." : "Reviewing list…"}
        </span>
      ),
    },
    [],
  );

  useRenderTool(
    {
      name: "addTodo",
      parameters: z.object({
        title: z.string().optional(),
        dueDate: z.string().optional(),
      }),
      render: ({ status, parameters }) => (
        <ToolLine
          status={status}
          line={
            status === "complete"
              ? `Added "${parameters.title ?? "a to-do"}" to your list.`
              : `Adding "${parameters.title ?? "…"}" to your list…`
          }
          onComplete={onRefresh}
        />
      ),
    },
    [onRefresh],
  );

  useRenderTool(
    {
      name: "setTodoDone",
      parameters: z.object({ todoId: z.string().optional() }),
      render: ({ status }) => (
        <ToolLine
          status={status}
          line={
            status === "complete"
              ? "Marked a to-do done."
              : "Marking to-do done…"
          }
          onComplete={onRefresh}
        />
      ),
    },
    [onRefresh],
  );

  return (
    <div className="lissie-main">
      <section className="lissie-chat" aria-label="Chat with Lissie">
        <CopilotChatConfigurationProvider
          agentId="lissie"
          threadId={threadId}
          hasExplicitThreadId
        >
          <CopilotChat
            labels={{
              modalHeaderTitle: "Lissie",
              welcomeMessageText:
                "You're back. Tell me what needs doing. I will try not to look disappointed.",
            }}
          />
        </CopilotChatConfigurationProvider>
      </section>
      <TodoSidebar key={refreshKey} />
    </div>
  );
}

export function LissieChat({ threadId }: { threadId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      agentId="lissie"
      messageFilter={(messages) => messages.slice(-1)}
    >
      <LissieChatInner
        threadId={threadId}
        refreshKey={refreshKey}
        onRefresh={onRefresh}
      />
    </CopilotKitProvider>
  );
}
