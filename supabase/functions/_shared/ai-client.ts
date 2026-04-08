/**
 * Shared AI client for Supabase Edge Functions.
 * Routes requests through the Lovable AI gateway (OpenAI-compatible endpoint).
 * Tries the specified Anthropic model first; falls back to the Lovable/Google model.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type MultimodalPart =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string };

interface AITextOptions {
  systemPrompt: string;
  userMessage: string;
  anthropicModel: string;
  lovableModel: string;
  maxTokens?: number;
}

interface AIMultimodalOptions {
  systemPrompt: string;
  parts: MultimodalPart[];
  anthropicModel: string;
  lovableModel: string;
  maxTokens?: number;
}

function getKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

async function callGateway(
  model: string,
  messages: object[],
  maxTokens: number,
  apiKey: string,
): Promise<string | null> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, temperature: 0, max_tokens: maxTokens, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gateway error (${model}): ${res.status} — ${err.substring(0, 300)}`);
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? null;
}

/**
 * Text-only AI call. Tries anthropicModel first, falls back to lovableModel.
 */
export async function callAIText(opts: AITextOptions): Promise<string | null> {
  const { systemPrompt, userMessage, anthropicModel, lovableModel, maxTokens = 4096 } = opts;
  const apiKey = getKey();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    return await callGateway(anthropicModel, messages, maxTokens, apiKey);
  } catch (primaryErr) {
    console.warn(`Primary model (${anthropicModel}) failed, trying fallback:`, primaryErr);
    return await callGateway(lovableModel, messages, maxTokens, apiKey);
  }
}

/**
 * Multimodal AI call (text + images). Tries anthropicModel first, falls back to lovableModel.
 */
export async function callAIMultimodal(opts: AIMultimodalOptions): Promise<string | null> {
  const { systemPrompt, parts, anthropicModel, lovableModel, maxTokens = 16384 } = opts;
  const apiKey = getKey();

  // Convert MultimodalPart[] to OpenAI-compatible content array
  const userContent = parts.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    } else {
      return {
        type: "image_url",
        image_url: { url: `data:${part.mimeType};base64,${part.base64}` },
      };
    }
  });

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  try {
    return await callGateway(anthropicModel, messages, maxTokens, apiKey);
  } catch (primaryErr) {
    console.warn(`Primary model (${anthropicModel}) failed, trying fallback:`, primaryErr);
    return await callGateway(lovableModel, messages, maxTokens, apiKey);
  }
}
