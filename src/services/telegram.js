const https = require('https');
const dns = require('dns').promises;

const TELEGRAM_HOST = 'api.telegram.org';
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(err) {
  const code = err?.code || err?.errno || '';
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND' || code === 'EAI_AGAIN';
}

function postJson({ hostname, path, hostHeader, body, timeoutMs }) {
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: 'POST',
        family: 4,
        servername: TELEGRAM_HOST,
        headers: {
          Host: hostHeader,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload)
        },
        timeout: timeoutMs
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(text));
            } catch {
              resolve({});
            }
            return;
          }
          reject(new Error(`Telegram API HTTP ${res.statusCode} ${res.statusMessage}: ${text}`));
        });
      }
    );

    req.on('timeout', () => {
      const err = new Error('connect ETIMEDOUT');
      err.code = 'ETIMEDOUT';
      req.destroy(err);
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function resolveTelegramIpv4() {
  const ips = await dns.resolve4(TELEGRAM_HOST);
  if (!Array.isArray(ips) || ips.length === 0) {
    throw new Error(`Telegram IPv4 lookup failed: no A records for ${TELEGRAM_HOST}`);
  }
  return ips;
}

async function sendMessage({ token, chatId, text }) {
  const path = `/bot${token}/sendMessage`;
  const body = { chat_id: chatId, text };
  const ipv4List = await resolveTelegramIpv4();

  let lastErr = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ip = ipv4List[attempt % ipv4List.length];
    try {
      const result = await postJson({
        hostname: ip,
        path,
        hostHeader: TELEGRAM_HOST,
        body,
        timeoutMs: REQUEST_TIMEOUT_MS
      });
      console.log('Telegram sent via IPv4:', JSON.stringify({ ip, attempt: attempt + 1 }));
      return result;
    } catch (err) {
      lastErr = err;
      if (!isRetryableNetworkError(err) || attempt === MAX_ATTEMPTS - 1) throw err;
      const delayMs = 1000 * (attempt + 1);
      console.log(
        'Telegram transient error, retrying:',
        JSON.stringify({ ip, attempt: attempt + 1, delayMs, code: err?.code })
      );
      await sleep(delayMs);
    }
  }

  throw lastErr || new Error('Telegram API failed');
}

module.exports = {
  sendMessage
};
