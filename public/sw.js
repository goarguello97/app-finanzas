// Service worker mínimo: habilita la instalación como PWA.
// Sin offline en el MVP, así que no intercepta pedidos ni cachea nada.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
