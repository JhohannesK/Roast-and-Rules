import { anthropic } from "@ai-sdk/anthropic";

const DEFAULT_MODEL = "claude-sonnet-4-6";

export function getAnthropicModel() {
  const id = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  return anthropic(id);
}
