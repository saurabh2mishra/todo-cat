import "server-only";
import type { RequestContext } from "@mastra/core/request-context";
import { createTool } from "@mastra/core/tools";
import {
  CreateTodoInput,
  Todo,
  TodoList,
  TodoListFilter,
} from "@todo-cat/contract";
import { z } from "zod";
import { addTodo, listTodos, updateTodo } from "./todo-service";

export const TODO_USER_ID_CONTEXT_KEY = "todo-cat.userId";

function authenticatedUserId(requestContext?: RequestContext): string {
  const userId = requestContext?.get(TODO_USER_ID_CONTEXT_KEY);
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Lissie todo tools require an authenticated user context.");
  }
  return userId;
}

export const listTodosTool = createTool({
  id: "listTodos",
  title: "Review to-dos",
  description:
    "List the signed-in user's to-dos, optionally filtered by status or title text.",
  inputSchema: TodoListFilter,
  outputSchema: TodoList,
  execute: async (input, { requestContext }) =>
    listTodos(authenticatedUserId(requestContext), input),
});

export const addTodoTool = createTool({
  id: "addTodo",
  title: "Add a to-do",
  description: "Add a to-do to the signed-in user's list.",
  inputSchema: CreateTodoInput,
  outputSchema: Todo,
  execute: async (input, { requestContext }) =>
    addTodo(authenticatedUserId(requestContext), input),
});

export const setTodoDoneTool = createTool({
  id: "setTodoDone",
  title: "Mark a to-do done",
  description:
    "Mark one of the signed-in user's open to-dos as done using its id from listTodos.",
  inputSchema: z.strictObject({ todoId: z.string().min(1) }),
  outputSchema: Todo,
  execute: async ({ todoId }, { requestContext }) =>
    updateTodo(authenticatedUserId(requestContext), todoId, { done: true }),
});

export const lissieTodoTools = {
  listTodos: listTodosTool,
  addTodo: addTodoTool,
  setTodoDone: setTodoDoneTool,
};
