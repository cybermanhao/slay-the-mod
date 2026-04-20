#!/usr/bin/env node
// SessionStart hook: reads unread inbox messages and injects into Claude context
import fs from 'fs';

const INBOX = 'C:/code/slay-the-mod/agent-workspace/inbox.json';

try {
  if (!fs.existsSync(INBOX)) process.exit(0);

  const messages = JSON.parse(fs.readFileSync(INBOX, 'utf8'));
  const unread = messages.filter(m => !m.read);

  if (unread.length === 0) process.exit(0);

  // Mark as read
  const updated = messages.map(m => ({ ...m, read: true }));
  fs.writeFileSync(INBOX, JSON.stringify(updated, null, 2), 'utf8');

  const lines = unread.map(m => {
    const time = new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
    return `[${time}] ${m.message}`;
  }).join('\n');

  const context = `📬 用户通过 Inbox 发来 ${unread.length} 条消息（已标记为已读）：\n${lines}\n\n请在回复前先回应这些消息。`;

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context,
    }
  }));
} catch {
  process.exit(0);
}
