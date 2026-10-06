"use client";

import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  CopilotKitProvider,
} from "@copilotkit/react-core/v2";

export function LissieChat({ threadId }: { threadId: string }) {
  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      agentId="lissie"
      messageFilter={(messages) => messages.slice(-1)}
    >
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
    </CopilotKitProvider>
  );
}
