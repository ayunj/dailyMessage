import type { Request } from 'express';

import { env, requireEnv } from '../config/env.js';

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
  result?: unknown;
};

export function verifyTelegramSecret(req: Request): boolean {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return true;
  const got = req.header('x-telegram-bot-api-secret-token');
  return got === env.TELEGRAM_WEBHOOK_SECRET;
}

export async function telegramSendMessage(chatId: string, text: string) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = (await resp.json()) as TelegramSendMessageResponse;
  if (!data.ok) {
    throw new Error(`Telegram sendMessage failed: ${data.description ?? 'unknown error'}`);
  }
}

