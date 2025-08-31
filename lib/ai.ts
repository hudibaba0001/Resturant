// lib/ai.ts
import 'server-only';
import OpenAI from 'openai';
import { env } from './env';

export const CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

// Lazily create the client when actually used (runtime, not build time).
export function getOpenAI() {
  return new OpenAI({ apiKey: env.openaiKey() });
}
