'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function TelegramProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const init = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Удаление системных иконок Next.js
        const interval = setInterval(() => {
          const el = document.querySelector('nextjs-portal');
          if (el) (el as HTMLElement).style.display = 'none';
        }, 1000);
        
        return () => clearInterval(interval);
      }
    };

    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        init();
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  return (
    <>
      <Script 
        src="https://telegram.org/js/telegram-web-app.js" 
        strategy="beforeInteractive" 
      />
      {children}
    </>
  );
}