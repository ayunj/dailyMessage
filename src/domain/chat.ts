export type ChatLanguage = 'ja' | 'en' | 'zh';

export type ChatSettings = {
  chatId: string;
  enabled: boolean;
  lang: ChatLanguage;
  updatedAtMs: number;
};

