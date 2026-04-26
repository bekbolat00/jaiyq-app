declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
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
