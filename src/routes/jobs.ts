import express from 'express';

import { env, requireEnv } from '../config/env.js';
import { listEnabledChats } from '../repos/chatRepo.js';
import { telegramSendMessage } from '../services/telegram.js';
import { generateDailyJapanese } from '../services/gemini.js';

export const jobsRouter = express.Router();

function verifyJobsKey(req: express.Request) {
  // If not configured, always deny.
  if (!env.JOBS_API_KEY) return false;
  const got = req.header('x-jobs-api-key');
  return got && got === env.JOBS_API_KEY;
}

jobsRouter.post('/ask-now', async (req, res) => {
  try {
    if (!verifyJobsKey(req)) {
      return res.status(401).send('unauthorized');
    }

    // Ensure required secrets exist (gives clearer error than "container won't start").
    requireEnv('JOBS_API_KEY');
    const chats = await listEnabledChats();
    if (chats.length === 0) {
      return res.status(200).json({ ok: true, sent: 0 });
    }

    // For now: only JA daily message (matches your original source)
    const body = await generateDailyJapanese();
    const message = `💌 오늘도 일본어 도착했어요!\n\n${body}`;

    // Sequential send keeps it simple; can parallelize later if needed.
    let sent = 0;
    for (const c of chats) {
      // Only send to chats configured for Japanese.
      if (c.lang !== 'ja') continue;
      await telegramSendMessage(c.chatId, message);
      sent += 1;
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('jobs ask-now error', e);
    return res.status(500).send('error');
  }
});

