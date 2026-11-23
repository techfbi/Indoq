import Groq from "groq-sdk";
import { env } from "../../config/env.js";
import { AIError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

/*
  Primary and fallback models.
  If the primary model is rate limited, unavailable, or retired,
  the fallback is automatically tried before giving up.

  Groq retired both Llama models (llama 3.3 70b versatile and
  llama 3.1 8b instant) and returns 404 model_not_found for them.
  gpt oss 120b and 20b are the closest replacements on Groq and
  were verified against the real system prompt on 2026-11-23.
*/
const PRIMARY_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "openai/gpt-oss-20b";

export interface StreamOptions {
  systemPrompt: string;
  contextSection: string;
  conversationHistory: ConversationMessage[];
  userQuery: string;
  onToken: (token: string) => void;
  // model is the one that actually answered, primary or fallback
  onComplete: (fullText: string, model: string) => void | Promise<void>;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/*
  Builds the message array for the Groq API call.
  Message order is critical for both correctness and security:
  1. System prompt (application controlled, model behaviour rules)
  2. Context section (retrieved document content, labelled as reference)
  3. Conversation history (previous turns in this conversation)
  4. Current user query

  The context is injected as a user turn followed by an assistant
  acknowledgement rather than appended to the system prompt.
  This keeps the system prompt clean and works better with
  instruction-tuned models that expect system/user/assistant turns.
*/
const buildMessages = (options: StreamOptions): Groq.Chat.ChatCompletionMessageParam[] => {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: options.systemPrompt,
    },
  ];

  if (options.contextSection) {
    messages.push(
      {
        role: "user",
        content: options.contextSection,
      },
      {
        role: "assistant",
        content: "I have read the document context and will use it to answer your questions accurately.",
      }
    );
  }

  for (const msg of options.conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({
    role: "user",
    content: options.userQuery,
  });

  return messages;
};

/*
  Streams a response from Groq with automatic fallback to the
  smaller model if the primary model is rate limited (429) or
  temporarily unavailable (503).
  Calls onToken for each streamed chunk and onComplete when done.
*/
export const streamGroqResponse = async (
  options: StreamOptions,
  useModel = PRIMARY_MODEL
): Promise<void> => {
  try {
    const messages = buildMessages(options);

    const stream = await groq.chat.completions.create({
      model: useModel,
      messages,
      max_tokens: 2000,
      temperature: 0.2,
      stream: true,
    });

    let fullText = "";

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        fullText += token;
        options.onToken(token);
      }
    }

    /*
      Awaited so a failure while saving the message or writing the
      done event surfaces in the catch below and reaches the client
      as an SSE error event, instead of an unhandled rejection.
    */
    await options.onComplete(fullText, useModel);
  } catch (err: unknown) {
    const isRateLimit = err instanceof Groq.APIError && err.status === 429;
    const isUnavailable = err instanceof Groq.APIError && err.status === 503;
    // 404 means the model was retired, the fallback may still exist
    const isModelMissing = err instanceof Groq.APIError && err.status === 404;

    if (
      (isRateLimit || isUnavailable || isModelMissing) &&
      useModel === PRIMARY_MODEL
    ) {
      logger.warn("Groq primary model unavailable, falling back", {
        model: PRIMARY_MODEL,
        fallback: FALLBACK_MODEL,
        status: err instanceof Groq.APIError ? err.status : "unknown",
      });
      return streamGroqResponse(options, FALLBACK_MODEL);
    }

    logger.error("Groq streaming failed", {
      model: useModel,
      error: err instanceof Error ? err.message : String(err),
    });

    throw new AIError();
  }
};