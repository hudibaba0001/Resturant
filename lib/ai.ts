// lib/ai.ts
import 'server-only';
import OpenAI from 'openai';
import { serverEnv } from './env';

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

export function getOpenAI() {
  return new OpenAI({ apiKey: serverEnv.openaiApiKey() });
}
