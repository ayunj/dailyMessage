import 'dotenv/config';
import express from 'express';

import { env } from './config/env.js';
import { telegramRouter } from './routes/telegram.js';
import { jobsRouter } from './routes/jobs.js';

const app = express();

// Telegram sends JSON; keep limit modest for safety.
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.status(200).type('text').send(
    [
      'dailyMessage is running.',
      '',
      'GET /healthz',
      'POST /telegram/webhook',
      'POST /jobs/ask-now (requires X-Jobs-Api-Key)',
      '',
    ].join('\n')
  );
});

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

app.use('/telegram', telegramRouter);
app.use('/jobs', jobsRouter);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`listening on :${env.PORT}`);
});

