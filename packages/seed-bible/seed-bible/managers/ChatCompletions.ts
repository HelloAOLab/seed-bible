import { z } from "zod";
import type { AIProviderFunctionTool, AIToolCallContext } from "./AIManager";
import {
  resolveMessageAuthors,
  type ChatContext,
  type ChatProviderMessageOptions,
} from "./ChatsManager";

/**
 * Helpers for chat providers that talk to an OpenAI-compatible
 * `/chat/completions` endpoint, including the client-side tool-calling loop:
 * the model replies with `tool_calls`, we run the matching
 * {@link AIProviderFunctionTool}, send back a `tool` message with the result,
 * and ask again until the model answers with text.
 */

export type ChatCompletionMessage =
  | {
      role: "system" | "developer" | "user" | "assistant";
      content?: string | null;
      tool_calls?: ChatCompletionToolCall[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      name: string;
      content: string;
    };

export interface ChatCompletionToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

const toolCallDeltaSchema = z.object({
  index: z.number(),
  id: z.string().optional(),
  function: z
    .object({
      name: z.string().optional(),
      arguments: z.string().optional(),
    })
    .optional(),
});

const chatCompletionChunkSchema = z.object({
  choices: z.array(
    z.object({
      delta: z
        .object({
          content: z.string().nullable().optional(),
          tool_calls: z.array(toolCallDeltaSchema).optional(),
        })
        .optional(),
      // Tolerate both the standard OpenAI field name and `stop_reason`, which
      // some compatible servers send instead.
      finish_reason: z.string().nullable().optional(),
      stop_reason: z.string().nullable().optional(),
    })
  ),
});

const chatCompletionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            })
          )
          .nullable()
          .optional(),
      }),
      finish_reason: z.string().nullable().optional(),
      stop_reason: z.string().nullable().optional(),
    })
  ),
});

type ToolCallDelta = z.infer<typeof toolCallDeltaSchema>;

interface StreamedChoice {
  delta: {
    content?: string | null;
    tool_calls?: ToolCallDelta[];
  };
  finishReason: string | null;
}

/**
 * Reads an OpenAI-style SSE response body and yields the JSON payload of
 * each `data: ...` line, stopping at the terminal `data: [DONE]` line.
 */
async function* parseSseJsonStream(
  response: Response
): AsyncGenerator<unknown> {
  if (!response.body) {
    throw new Error("Chat completions response has no readable body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        const line = buffer.trim();
        if (line.startsWith("data:")) {
          const payload = line.slice("data:".length).trim();
          if (payload && payload !== "[DONE]") {
            yield JSON.parse(payload);
          }
        }
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice("data:".length).trim();
        if (payload === "[DONE]") {
          return;
        }

        yield JSON.parse(payload);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Yields the first choice of each chunk with a single normalized
 * `finishReason`. A non-streaming (`application/json`) response is treated
 * as a stream of one chunk, so servers that ignore `stream: true` still work.
 */
async function* streamChoices(
  response: Response
): AsyncGenerator<StreamedChoice> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const completion = chatCompletionSchema.parse(await response.json());
    const choice = completion.choices[0];
    if (!choice) {
      return;
    }
    yield {
      delta: {
        content: choice.message.content,
        tool_calls: choice.message.tool_calls?.map((call, index) => ({
          index,
          id: call.id,
          function: call.function,
        })),
      },
      finishReason: choice.finish_reason ?? choice.stop_reason ?? "stop",
    };
    return;
  }

  for await (const payload of parseSseJsonStream(response)) {
    const chunk = chatCompletionChunkSchema.parse(payload);
    const choice = chunk.choices[0];
    if (!choice) {
      continue;
    }

    yield {
      delta: choice.delta ?? {},
      finishReason: choice.finish_reason ?? choice.stop_reason ?? null,
    };
  }
}

/** Converts Seed Bible tools into the `tools` array of a completions request. */
export function toChatCompletionTools(tools: AIProviderFunctionTool[] = []) {
  if (tools.length === 0) {
    return undefined;
  }
  return tools.map((t) => ({
    type: t.type,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      strict: true,
    },
  }));
}

/**
 * Maps the chat's text messages to completion messages: messages from the
 * given provider become `assistant` turns and everything else `user` turns.
 */
export function toChatCompletionMessages(
  chatContext: Pick<ChatContext, "messages" | "participants">,
  providerId: string
): ChatCompletionMessage[] {
  const messages: ChatCompletionMessage[] = [];
  for (const m of chatContext.messages) {
    if (m.type !== "text") {
      continue;
    }
    const authors = resolveMessageAuthors(chatContext.participants, m);
    const fromProvider =
      !authors.some((a) => a.isSelf) &&
      authors.some((a) => a.isAI && a.providerId === providerId);
    messages.push({
      role: fromProvider ? "assistant" : "user",
      content: m.text,
    });
  }
  return messages;
}

async function runToolCall(
  call: ChatCompletionToolCall,
  tools: AIProviderFunctionTool[],
  toolCallContext: AIToolCallContext | undefined
): Promise<string> {
  const tool = tools.find((t) => t.name === call.function.name);
  try {
    if (!tool) {
      throw new Error(`Tool not found: ${call.function.name}`);
    }
    const args: unknown = call.function.arguments
      ? JSON.parse(call.function.arguments)
      : {};
    return JSON.stringify((await tool.function(args, toolCallContext)) ?? null);
  } catch (err) {
    // Reported back to the model rather than thrown, so it can recover
    // (retry with fixed arguments, or answer without the tool).
    console.error(`[ChatCompletions] Tool ${call.function.name} failed`, err);
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface ChatCompletionToolLoopOptions {
  /**
   * The conversation so far. Assistant tool calls and tool results are
   * appended to it as the loop runs.
   */
  messages: ChatCompletionMessage[];

  /** The tools the model may call. */
  tools?: AIProviderFunctionTool[];

  /** Passed to each tool so it knows which chat and provider called it. */
  toolCallContext?: AIToolCallContext;

  /**
   * Sends one completions request with the current `messages` and returns
   * the raw response (streaming SSE or plain JSON).
   */
  requestCompletion: (messages: ChatCompletionMessage[]) => Promise<Response>;

  /**
   * Bounds the loop so a model that keeps calling tools (or never answers)
   * can't hang the response forever. Using up every turn throws, so
   * ChatsManager posts its error message instead of leaving the chat silent.
   * Defaults to 25.
   */
  maxTurns?: number;
}

/**
 * Runs completion requests until the model answers with text, executing any
 * tool calls it makes in between. Yields a `tool_call` message per executed
 * tool and finally a streaming `text` message with the answer.
 */
export async function* runChatCompletionToolLoop(
  options: ChatCompletionToolLoopOptions
): AsyncGenerator<ChatProviderMessageOptions> {
  const {
    messages,
    requestCompletion,
    toolCallContext,
    maxTurns = 25,
  } = options;
  const tools = options.tools ?? [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await requestCompletion(messages);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Chat completions request failed (${response.status})${
          body ? `: ${body}` : ""
        }`
      );
    }

    const stream = streamChoices(response);

    // Skip leading deltas that carry no content, no tool_calls, and no finish
    // reason (e.g. the initial `{ role: "assistant" }`-only delta) so we can
    // tell whether this turn is a tool-call turn or a content turn.
    let next = await stream.next();
    while (
      !next.done &&
      !next.value.delta.content &&
      !next.value.delta.tool_calls?.length &&
      !next.value.finishReason
    ) {
      next = await stream.next();
    }

    if (next.done) {
      return;
    }

    const first = next.value;

    if (first.delta.tool_calls?.length) {
      const pending = new Map<
        number,
        { id: string; name: string; args: string }
      >();

      let current: StreamedChoice | null = first;
      while (current) {
        for (const delta of current.delta.tool_calls ?? []) {
          const existing = pending.get(delta.index) ?? {
            id: "",
            name: "",
            args: "",
          };
          if (delta.id) {
            existing.id = delta.id;
          }
          if (delta.function?.name) {
            existing.name += delta.function.name;
          }
          if (delta.function?.arguments) {
            existing.args += delta.function.arguments;
          }
          pending.set(delta.index, existing);
        }
        if (current.finishReason) {
          break;
        }
        const n = await stream.next();
        current = n.done ? null : n.value;
      }

      const toolCalls: ChatCompletionToolCall[] = Array.from(pending.values())
        .filter((tc) => tc.name)
        .map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.args },
        }));

      messages.push({
        role: "assistant",
        content: null,
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: await runToolCall(call, tools, toolCallContext),
        });

        yield { type: "tool_call", name: call.function.name };
      }

      continue;
    }

    if (!first.delta.content) {
      if (first.finishReason === "stop") {
        return;
      }
      continue;
    }

    async function* textDeltas() {
      let assembled = "";
      let current: StreamedChoice | null = first;
      while (current) {
        if (current.delta.content) {
          assembled += current.delta.content;
          yield current.delta.content;
        }
        if (current.finishReason) {
          break;
        }
        const n = await stream.next();
        current = n.done ? null : n.value;
      }
      messages.push({ role: "assistant", content: assembled });
    }

    yield { type: "text", text: textDeltas() };
    return;
  }

  throw new Error(
    `stopped after ${maxTurns} rounds of tool calls without an answer`
  );
}
