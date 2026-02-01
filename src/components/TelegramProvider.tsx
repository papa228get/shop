'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function TelegramProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import the SDK to avoid SSR issues
    const initWebApp = async () => {
      try {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();
        WebApp.expand();
        setIsLoaded(true);
      } catch (e) {
        console.error('Error initializing Telegram WebApp SDK', e);
      }
    };

    initWebApp();
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
