import type { ChatScript, Message } from '../types';

// Supported format examples:
// User: Hello there
// Assistant: Hi! How can I help?
//
// Lines without a recognized prefix are appended to the previous message body.
// Empty lines preserved as line breaks.

export function parseTextScript(text: string, title = 'Text Script'): ChatScript {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: Message[] = [];
  const push = (role: Message['role'], content: string) => {
    out.push({ role, content: content.trimEnd() });
  };

  let current: Message | null = null;
  for (const raw of lines) {
    const line = raw;
    const m = /^(user|assistant|system)\s*:\s*(.*)$/i.exec(line);
    if (m) {
      if (current) out.push(current);
      const role = m[1].toLowerCase() as Message['role'];
      current = { role, content: m[2] ?? '' };
      continue;
    }
    if (!current) {
      // default to assistant if first line is free-form
      current = { role: 'assistant', content: line };
    } else {
      current.content += '\n' + line;
    }
  }
  if (current) out.push(current);

  return {
    title,
    messages: out,
    options: { typingSpeed: 35, messageDelayMs: 500 },
  };
}
