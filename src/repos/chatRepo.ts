import { firestore } from '../config/firestore.js';
import { env } from '../config/env.js';
import type { ChatLanguage, ChatSettings } from '../domain/chat.js';

type ChatDoc = {
  enabled: boolean;
  lang: ChatLanguage;
  updatedAtMs: number;
};

function docRef(chatId: string) {
  return firestore.collection(env.FIRESTORE_COLLECTION).doc(chatId);
}

export async function upsertChat(chatId: string, patch: Partial<ChatDoc>) {
  const now = Date.now();
  const base: ChatDoc = {
    enabled: true,
    lang: 'ja',
    updatedAtMs: now,
  };

  await docRef(chatId).set(
    {
      ...base,
      ...patch,
      updatedAtMs: now,
    },
    { merge: true }
  );
}

export async function getChat(chatId: string): Promise<ChatSettings | null> {
  const snap = await docRef(chatId).get();
  if (!snap.exists) return null;
  const data = snap.data() as ChatDoc;
  return {
    chatId,
    enabled: data.enabled,
    lang: data.lang,
    updatedAtMs: data.updatedAtMs,
  };
}

export async function listEnabledChats(): Promise<ChatSettings[]> {
  const qs = await firestore
    .collection(env.FIRESTORE_COLLECTION)
    .where('enabled', '==', true)
    .get();

  return qs.docs.map((d) => {
    const data = d.data() as ChatDoc;
    return {
      chatId: d.id,
      enabled: data.enabled,
      lang: data.lang,
      updatedAtMs: data.updatedAtMs,
    };
  });
}

