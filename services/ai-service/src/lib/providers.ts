import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

import { env } from '../config/env.js'

// ── MiniMax client (OpenAI-compatible) ───────────────────────────────────────
export const minimaxClient = new OpenAI({
  apiKey: env.MINIMAX_API_KEY,
  baseURL: env.MINIMAX_BASE_URL,
})

export const MINIMAX_MODEL = env.MINIMAX_MODEL

// ── DeepSeek V3.2 (OpenAI-compatible) ───────────────────────────────────────
export const deepseekClient = new OpenAI({
  apiKey: env.DEEPSEEK_API_KEY,
  baseURL: env.DEEPSEEK_BASE_URL,
})

export const DEEPSEEK_MODEL = env.DEEPSEEK_MODEL

// ── DeepSeek R1 (reasoning) ─────────────────────────────────────────────────
export const deepseekR1Client = new OpenAI({
  apiKey: env.DEEPSEEK_R1_API_KEY ?? env.DEEPSEEK_API_KEY,
  baseURL: env.DEEPSEEK_R1_BASE_URL ?? env.DEEPSEEK_BASE_URL,
})

export const DEEPSEEK_R1_MODEL = env.DEEPSEEK_R1_MODEL

// ── Gemini Flash (summarisation / recovery) ─────────────────────────────────
export const geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY)

export const GEMINI_MODEL = env.GEMINI_MODEL

// ── Streaming (OpenAI-compatible) ─────────────────────────────────────────────
export async function* streamChat(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens = 8192,
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    stream: true,
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

/** Collect streamed text, optional token usage, and forward chunks to SSE. */
export async function streamChatCollect(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
  onChunk: (chunk: string) => void,
): Promise<{ fullText: string; promptTokens: number; completionTokens: number }> {
  let fullText = ''
  let promptTokens = 0
  let completionTokens = 0

  const stream = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) {
      fullText += text
      onChunk(text)
    }
    if (chunk.usage) {
      promptTokens = chunk.usage.prompt_tokens ?? 0
      completionTokens = chunk.usage.completion_tokens ?? 0
    }
  }

  if (promptTokens === 0 && completionTokens === 0 && fullText.length > 0) {
    const msgLen = messages.reduce((acc, m) => acc + JSON.stringify(m.content).length, 0)
    promptTokens = Math.max(1, Math.ceil(msgLen / 4))
    completionTokens = Math.max(1, Math.ceil(fullText.length / 4))
  }

  return { fullText, promptTokens, completionTokens }
}

export async function chatComplete(
  client: OpenAI,
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
  maxTokens = 2048,
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    stream: false,
  })

  return response.choices[0]?.message?.content ?? ''
}

export async function chatCompleteWithUsage(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    stream: false,
  })
  const text = response.choices[0]?.message?.content ?? ''
  const u = response.usage
  return {
    text,
    promptTokens: u?.prompt_tokens ?? Math.ceil(JSON.stringify(messages).length / 4),
    completionTokens: u?.completion_tokens ?? Math.ceil(text.length / 4),
  }
}

export async function geminiComplete(prompt: string, maxTokens = 4096): Promise<string> {
  const m = geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { maxOutputTokens: maxTokens },
  })
  const result = await m.generateContent(prompt)
  return result.response.text()
}
