"use client";

import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("[pwa] No se pudo registrar el service worker:", error);
    });
  }, []);

  return null;
}
