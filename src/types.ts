export type Role = 'user' | 'assistant' | 'system';

export type MessageKind = 'message' | 'tool_call' | 'tool_result';

export interface ToolCall {
  name: string;
  args?: Record<string, unknown> | string;
}

export interface ToolResult {
  name: string;
  output: string;
  summary?: string;
}

export interface Message {
  role: Role;
  content?: string;
  kind?: MessageKind; // default 'message'
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  durationMs?: number; // optional animation duration for non-typing kinds
}

export interface ScriptOptions {
  typingSpeed?: number; // characters per second
  messageDelayMs?: number; // delay between messages
}

export interface ChatScript {
  title?: string;
  messages: Message[];
  options?: ScriptOptions;
}
