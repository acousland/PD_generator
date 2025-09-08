import React from 'react';
import { motion } from 'framer-motion';
import type { Role } from '../types';

interface Props {
  role: Role;
  text: string;
}

export default function ChatMessage({ role, text }: Props) {
  const side = role === 'user' ? 'user' : 'assistant';
  const nodes = linkify(text);
  return (
    <div className={`row ${side}`}>
      <motion.div
        className={`bubble ${side}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {nodes}
      </motion.div>
    </div>
  );
}

function linkify(input: string): React.ReactNode {
  // Recognize absolute and root-relative URLs
  const urlRe = /(https?:\/\/[^\s)]+|\/[A-Za-z0-9._~#%\-\/=?&:+]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(input)) !== null) {
    const [url] = match;
    const start = match.index;
    if (start > lastIndex) parts.push(input.slice(lastIndex, start));
    const href = url;
    parts.push(
      <a key={`${start}-${href}`} href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
        {href}
      </a>
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < input.length) parts.push(input.slice(lastIndex));
  return parts.length ? parts : input;
}
