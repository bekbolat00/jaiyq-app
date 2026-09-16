type TelegramHapticImpact = "light" | "medium" | "heavy" | "rigid" | "soft";
type TelegramHapticNotification = "error" | "success" | "warning";

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
        version?: string;
        platform?: string;
        isVersionAtLeast?: (version: string) => boolean;
        ready?: () => void;
        expand?: () => void;
        disableVerticalSwipes?: () => void;
        requestWriteAccess?: (callback?: (granted: boolean) => void) => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        setBottomBarColor?: (color: string) => void;
        BackButton?: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: TelegramHapticImpact) => void;
          notificationOccurred: (type: TelegramHapticNotification) => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export {};
