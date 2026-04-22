/**
 * Shared AI client for Orchestra Edge Functions.
 *
 * Priority: ANTHROPIC_API_KEY (Claude) → LOVABLE_API_KEY (Lovable AI Gateway / Gemini)
 *
 * This lets Edge Functions run on any Supabase deployment (set ANTHROPIC_API_KEY)
 * while remaining backward-compatible with Lovable Cloud (set LOVABLE_API_KEY).
 */

export interface ToolDefinition {
  /** Tool name — must match toolChoice */
  name: string;
  description: string;
  /** Anthropic-style input schema (JSON Schema object) */
  input_schema: Record<string, unknown>;
}

export interface AICallOptions {
  systemPrompt: string;
  userMessage: string;
  tools: ToolDefinition[];
  /** Name of the tool to force-call */
  toolChoice: string;
  /** Anthropic model override. Defaults to claude-sonnet-4-5 */
  anthropicModel?: string;
  /** Lovable/OpenAI-compat model override. Defaults to google/gemini-2.5-flash */
  lovableModel?: string;
}

/**
 * Call the AI layer, preferring Anthropic (Claude) when ANTHROPIC_API_KEY is set.
 * Returns the parsed tool input as a plain object.
 */
export async function callAI(options: AICallOptions): Promise<Record<string, unknown>> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (ANTHROPIC_API_KEY) {
    return callAnthropic(ANTHROPIC_API_KEY, options);
  } else if (LOVABLE_API_KEY) {
    return callLovable(LOVABLE_API_KEY, options);
  } else {
    throw new Error(
      "No AI API key configured. Set ANTHROPIC_API_KEY (recommended) or LOVABLE_API_KEY in your Supabase project secrets."
    );
  }
}

// ─── Anthropic (Claude) ───────────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  options: AICallOptions
): Promise<Record<string, unknown>> {
  const model = options.anthropicModel ?? "claude-sonnet-4-5";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: options.systemPrompt,
      messages: [{ role: "user", content: options.userMessage }],
      tools: options.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
      tool_choice: { type: "tool", name: options.toolChoice },
    }),
  });

  await assertOk(response, "Anthropic");

  const data = await response.json();
  const toolUse = data.content?.find(
    (c: { type: string }) => c.type === "tool_use"
  ) as { input: Record<string, unknown> } | undefined;

  if (!toolUse) throw new Error("Anthropic did not return a tool_use block");
  return toolUse.input;
}

// ─── Lovable AI Gateway (OpenAI-compat, Gemini backend) ──────────────────────

async function callLovable(
  apiKey: string,
  options: AICallOptions
): Promise<Record<string, unknown>> {
  const model = options.lovableModel ?? "google/gemini-2.5-flash";

  // Convert Anthropic-format tool definitions → OpenAI-style function tools
  const openAITools = options.tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userMessage },
        ],
        tools: openAITools,
        tool_choice: {
          type: "function",
          function: { name: options.toolChoice },
        },
      }),
    }
  );

  await assertOk(response, "Lovable AI gateway");

  const data = await response.json();
  const toolCall =
    data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall) throw new Error("Lovable AI did not return a tool call");
  return JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
}

// ─── Multimodal (vision) text response ───────────────────────────────────────

export interface ImageContent {
  type: "image";
  base64: string;
  mimeType: string;
}

export type MultimodalPart = ImageContent | { type: "text"; text: string };

export interface AIMultimodalOptions {
  systemPrompt: string;
  /** Parts in the user message (images + text blocks) */
  parts: MultimodalPart[];
  anthropicModel?: string;
  lovableModel?: string;
  maxTokens?: number;
}

/**
 * Call the AI with multimodal (vision) content and return raw text.
 * Automatically converts between Anthropic and OpenAI image formats.
 */
export async function callAIMultimodal(options: AIMultimodalOptions): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (ANTHROPIC_API_KEY) {
    // Anthropic format: { type: "image", source: { type: "base64", media_type, data } }
    const anthropicContent = options.parts.map((p) => {
      if (p.type === "image") {
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: p.mimeType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: p.base64,
          },
        };
      }
      return { type: "text" as const, text: p.text };
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: options.anthropicModel ?? "claude-opus-4-6", // Opus for vision accuracy
        max_tokens: options.maxTokens ?? 16384,
        system: options.systemPrompt,
        messages: [{ role: "user", content: anthropicContent }],
      }),
    });

    await assertOk(response, "Anthropic");
    const data = await response.json();
    const textBlock = data.content?.find(
      (c: { type: string }) => c.type === "text"
    ) as { text: string } | undefined;
    return textBlock?.text ?? "";

  } else if (LOVABLE_API_KEY) {
    // OpenAI-compat format: { type: "image_url", image_url: { url: "data:..." } }
    const openAIContent = options.parts.map((p) => {
      if (p.type === "image") {
        return {
          type: "image_url" as const,
          image_url: { url: `data:${p.mimeType};base64,${p.base64}` },
        };
      }
      return { type: "text" as const, text: p.text };
    });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.lovableModel ?? "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: openAIContent },
          ],
          max_tokens: options.maxTokens ?? 16384,
          temperature: 0,
        }),
      }
    );

    await assertOk(response, "Lovable AI gateway");
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";

  } else {
    throw new Error(
      "No AI API key configured. Set ANTHROPIC_API_KEY (recommended) or LOVABLE_API_KEY in your Supabase project secrets."
    );
  }
}

// ─── Text/JSON response (no tool use) ────────────────────────────────────────

export interface AITextOptions {
  systemPrompt: string;
  userMessage: string;
  anthropicModel?: string;
  lovableModel?: string;
  /** Max tokens for response (default 4096) */
  maxTokens?: number;
}

/**
 * Call the AI and return raw text content (for prompts that return JSON arrays, etc.)
 * Prefers Anthropic; falls back to Lovable Gateway.
 */
export async function callAIText(options: AITextOptions): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (ANTHROPIC_API_KEY) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: options.anthropicModel ?? "claude-sonnet-4-5",
        max_tokens: options.maxTokens ?? 4096,
        system: options.systemPrompt,
        messages: [{ role: "user", content: options.userMessage }],
      }),
    });
    await assertOk(response, "Anthropic");
    const data = await response.json();
    const textBlock = data.content?.find(
      (c: { type: string }) => c.type === "text"
    ) as { text: string } | undefined;
    return textBlock?.text ?? "";

  } else if (LOVABLE_API_KEY) {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.lovableModel ?? "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: options.userMessage },
          ],
          max_tokens: options.maxTokens ?? 4096,
        }),
      }
    );
    await assertOk(response, "Lovable AI gateway");
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";

  } else {
    throw new Error(
      "No AI API key configured. Set ANTHROPIC_API_KEY (recommended) or LOVABLE_API_KEY in your Supabase project secrets."
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertOk(response: Response, provider: string): Promise<void> {
  if (response.ok) return;

  if (response.status === 429) {
    throw Object.assign(
      new Error(`${provider}: rate limit exceeded — try again shortly`),
      { status: 429 }
    );
  }
  if (response.status === 402) {
    throw Object.assign(
      new Error(`${provider}: usage credits exhausted`),
      { status: 402 }
    );
  }

  const text = await response.text().catch(() => "(no body)");
  throw new Error(`${provider} API error ${response.status}: ${text}`);
}
