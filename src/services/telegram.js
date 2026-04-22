const fetch = require('node-fetch');

async function sendMessage({ token, chatId, text }) {
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Telegram API HTTP ${resp.status} ${resp.statusText}: ${errText}`);
  }

  return await resp.json().catch(() => ({}));
}

module.exports = {
  sendMessage
};

