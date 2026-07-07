// Force-clear PWA cache on load, then register fresh SW
if("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => caches.delete(n)));
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
    navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });
}
