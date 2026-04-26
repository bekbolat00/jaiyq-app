"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { SplashScreen, SPLASH_DURATION_MS } from "./SplashScreen";

export default function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [appLoaded, setAppLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <AnimatePresence onExitComplete={() => setAppLoaded(true)}>
        {showSplash ? <SplashScreen key="splash" /> : null}
      </AnimatePresence>
      {appLoaded ? children : null}
    </>
  );
}
