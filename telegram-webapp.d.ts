declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        /** Подписанная строка для серверной проверки — см. lib/telegram/verifyInitData.ts */
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
            last_name?: string;
            photo_url?: string;
          };
        };
      };
    };
  }
}

export {};
