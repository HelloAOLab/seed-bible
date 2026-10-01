import {
  runChatCompletionToolLoop,
  toChatCompletionMessages,
  toChatCompletionTools,
  type ChatCompletionMessage,
} from "@packages/seed-bible/seed-bible/managers/ChatCompletions";
import type {
  ChatParticipant,
  ChatProviderMessageOptions,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { AIProviderFunctionTool } from "@packages/seed-bible/seed-bible/managers/AIManager";

function sseResponse(chunks: unknown[]): Response {
  const body =
    chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") +
    "data: [DONE]\n\n";
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textChunk(content: string, finish: string | null = null) {
  return { choices: [{ delta: { content }, finish_reason: finish }] };
}

function toolCallChunk(
  delta: Record<string, unknown>,
  finish: string | null = null
) {
  return {
    choices: [{ delta: { tool_calls: [delta] }, finish_reason: finish }],
  };
}

function makeTool(
  name: string,
  fn: (args: unknown) => Promise<unknown>
): AIProviderFunctionTool {
  return {
    name,
    type: "function",
    description: `The ${name} tool`,
    parameters: {
      type: "object",
      properties: {},
    } as unknown as AIProviderFunctionTool["parameters"],
    function: fn,
  };
}

/** Drains the loop, collecting tool call names and the final text. */
async function collect(stream: AsyncGenerator<ChatProviderMessageOptions>) {
  const toolCalls: string[] = [];
  let text: string | null = null;
  for await (const message of stream) {
    if (message.type === "tool_call") {
      toolCalls.push(message.name);
    } else if (message.type === "text") {
      if (typeof message.text === "string") {
        text = message.text;
      } else {
        text = "";
        for await (const chunk of message.text as AsyncIterable<string>) {
          text += chunk;
        }
      }
    }
  }
  return { toolCalls, text };
}

/** Records a deep copy of the messages sent with each request. */
function recordingRequester(responses: Response[]) {
  const requests: ChatCompletionMessage[][] = [];
  const requestCompletion = async (messages: ChatCompletionMessage[]) => {
    requests.push(structuredClone(messages));
    const response = responses.shift();
    if (!response) {
      throw new Error("Unexpected extra request");
    }
    return response;
  };
  return { requests, requestCompletion };
}

describe("runChatCompletionToolLoop", () => {
  it("streams a plain text answer", async () => {
    const { requests, requestCompletion } = recordingRequester([
      sseResponse([
        { choices: [{ delta: { role: "assistant" } }] },
        textChunk("In the "),
        textChunk("beginning", "stop"),
      ]),
    ]);

    const result = await collect(
      runChatCompletionToolLoop({
        messages: [{ role: "user", content: "Genesis 1:1?" }],
        requestCompletion,
      })
    );

    expect(result).toEqual({ toolCalls: [], text: "In the beginning" });
    expect(requests).toHaveLength(1);
  });

  it("runs a streamed tool call and sends the result back before answering", async () => {
    const lookup = vi.fn(async (args: unknown) => ({
      verse: "In the beginning God created the heavens and the earth.",
      args,
    }));
    const { requests, requestCompletion } = recordingRequester([
      sseResponse([
        toolCallChunk({
          index: 0,
          id: "call_1",
          function: { name: "lookup", arguments: '{"book":' },
        }),
        toolCallChunk(
          { index: 0, function: { arguments: '"GEN"}' } },
          "tool_calls"
        ),
      ]),
      sseResponse([textChunk("It says God created everything.", "stop")]),
    ]);

    const result = await collect(
      runChatCompletionToolLoop({
        messages: [{ role: "user", content: "What does Genesis 1:1 say?" }],
        tools: [makeTool("lookup", lookup)],
        requestCompletion,
      })
    );

    expect(result).toEqual({
      toolCalls: ["lookup"],
      text: "It says God created everything.",
    });
    expect(lookup).toHaveBeenCalledWith({ book: "GEN" });
    expect(requests[1]).toEqual([
      { role: "user", content: "What does Genesis 1:1 say?" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "lookup", arguments: '{"book":"GEN"}' },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        name: "lookup",
        content: JSON.stringify({
          verse: "In the beginning God created the heavens and the earth.",
          args: { book: "GEN" },
        }),
      },
    ]);
  });

  it("handles a non-streaming JSON response with tool calls", async () => {
    const { requests, requestCompletion } = recordingRequester([
      jsonResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_a",
                  type: "function",
                  function: { name: "now", arguments: "{}" },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      }),
      jsonResponse({
        choices: [
          { message: { content: "It is noon." }, finish_reason: "stop" },
        ],
      }),
    ]);

    const result = await collect(
      runChatCompletionToolLoop({
        messages: [{ role: "user", content: "Time?" }],
        tools: [makeTool("now", async () => "12:00")],
        requestCompletion,
      })
    );

    expect(result).toEqual({ toolCalls: ["now"], text: "It is noon." });
    expect(requests[1]?.[2]).toEqual({
      role: "tool",
      tool_call_id: "call_a",
      name: "now",
      content: '"12:00"',
    });
  });

  it("reports a failing or unknown tool back to the model instead of aborting", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { requests, requestCompletion } = recordingRequester([
      sseResponse([
        toolCallChunk({
          index: 0,
          id: "call_1",
          function: { name: "broken", arguments: "{}" },
        }),
        toolCallChunk({
          index: 1,
          id: "call_2",
          function: { name: "missing", arguments: "{}" },
        }),
        toolCallChunk({ index: 1 }, "tool_calls"),
      ]),
      sseResponse([textChunk("Sorry, I couldn't look that up.", "stop")]),
    ]);

    const result = await collect(
      runChatCompletionToolLoop({
        messages: [{ role: "user", content: "Look it up" }],
        tools: [
          makeTool("broken", async () => {
            throw new Error("Network down");
          }),
        ],
        requestCompletion,
      })
    );

    expect(result.text).toBe("Sorry, I couldn't look that up.");
    expect(requests[1]?.slice(2)).toEqual([
      {
        role: "tool",
        tool_call_id: "call_1",
        name: "broken",
        content: JSON.stringify({ error: "Network down" }),
      },
      {
        role: "tool",
        tool_call_id: "call_2",
        name: "missing",
        content: JSON.stringify({ error: "Tool not found: missing" }),
      },
    ]);
  });

  it("throws with the response body when the request fails", async () => {
    const { requestCompletion } = recordingRequester([
      new Response("invalid tool schema", { status: 400 }),
    ]);

    await expect(
      collect(
        runChatCompletionToolLoop({
          messages: [{ role: "user", content: "Hi" }],
          requestCompletion,
        })
      )
    ).rejects.toThrow(
      "Chat completions request failed (400): invalid tool schema"
    );
  });

  it("stops after maxTurns when the model keeps calling tools", async () => {
    const loopingCall = () =>
      sseResponse([
        toolCallChunk(
          { index: 0, id: "c", function: { name: "again", arguments: "{}" } },
          "tool_calls"
        ),
      ]);
    const { requests, requestCompletion } = recordingRequester([
      loopingCall(),
      loopingCall(),
      loopingCall(),
    ]);

    const result = await collect(
      runChatCompletionToolLoop({
        messages: [{ role: "user", content: "Go" }],
        tools: [makeTool("again", async () => "ok")],
        requestCompletion,
        maxTurns: 2,
      })
    );

    expect(result).toEqual({ toolCalls: ["again", "again"], text: null });
    expect(requests).toHaveLength(2);
  });
});

describe("toChatCompletionMessages", () => {
  const participants = [
    { id: "me", isSelf: true, isAI: false },
    { id: "bonfire", isSelf: false, isAI: true, providerId: "bonfire" },
    { id: "other-ai", isSelf: false, isAI: true, providerId: "other" },
  ] as ChatParticipant[];

  const message = (id: string, author: string, text: string) => ({
    type: "text" as const,
    id,
    authors: [author],
    timeMs: 0,
    targets: true as const,
    text,
  });

  it("maps this provider's messages to assistant turns and the rest to user turns", () => {
    expect(
      toChatCompletionMessages(
        {
          participants,
          messages: [
            message("1", "me", "Hi"),
            message("2", "bonfire", "Hello!"),
            message("3", "other-ai", "I'm another AI"),
            {
              type: "tool_call",
              id: "4",
              authors: ["bonfire"],
              timeMs: 0,
              targets: [],
              name: "lookup",
            },
          ],
        },
        "bonfire"
      )
    ).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello!" },
      { role: "user", content: "I'm another AI" },
    ]);
  });
});

describe("toChatCompletionTools", () => {
  it("omits tools entirely when there are none", () => {
    expect(toChatCompletionTools(undefined)).toBeUndefined();
    expect(toChatCompletionTools([])).toBeUndefined();
  });

  it("wraps each tool in the OpenAI function shape", () => {
    expect(
      toChatCompletionTools([makeTool("lookup", async () => null)])
    ).toEqual([
      {
        type: "function",
        function: {
          name: "lookup",
          description: "The lookup tool",
          parameters: { type: "object", properties: {} },
          strict: true,
        },
      },
    ]);
  });
});
