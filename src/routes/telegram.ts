import express from 'express';
import { z } from 'zod';

import { verifyTelegramSecret, telegramSendMessage } from '../services/telegram.js';
import { upsertChat } from '../repos/chatRepo.js';
import type { ChatLanguage } from '../domain/chat.js';

export const telegramRouter = express.Router();

const UpdateSchema = z.object({
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({
        id: z.union([z.number(), z.string()]),
      }),
    })
    .optional(),
});

function normalizeChatId(id: string | number) {
  return typeof id === 'number' ? String(id) : id;
}

function parseLang(text: string): ChatLanguage | null {
  const m = text.trim().match(/^\/lang\s+(ja|en|zh)\s*$/i);
  if (!m) return null;
  return m[1].toLowerCase() as ChatLanguage;
}

telegramRouter.post('/webhook', async (req, res) => {
  try {
    if (!verifyTelegramSecret(req)) {
      return res.status(401).send('unauthorized');
    }

    const update = UpdateSchema.parse(req.body);
    const msg = update.message;
    if (!msg) return res.status(200).send('ok');

    const chatId = normalizeChatId(msg.chat.id);
    const text = (msg.text ?? '').trim();

    if (!text) return res.status(200).send('ok');

    if (text === '/ping') {
      await telegramSendMessage(chatId, 'pong');
      return res.status(200).send('ok');
    }

    if (text === '/register') {
      await upsertChat(chatId, { enabled: true });
      await telegramSendMessage(chatId, '등록 완료! 이제 메시지를 받을게요.');
      return res.status(200).send('ok');
    }

    if (text === '/unregister') {
      await upsertChat(chatId, { enabled: false });
      await telegramSendMessage(chatId, '해제 완료! 더 이상 메시지를 보내지 않을게요.');
      return res.status(200).send('ok');
    }

    const lang = parseLang(text);
    if (lang) {
      await upsertChat(chatId, { lang, enabled: true });
      await telegramSendMessage(chatId, `언어 설정 완료: ${lang}`);
      return res.status(200).send('ok');
    }

    // Unknown command: ignore (keep webhook fast + cheap)
    return res.status(200).send('ok');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('telegram webhook error', e);
    return res.status(200).send('ok');
  }
});

