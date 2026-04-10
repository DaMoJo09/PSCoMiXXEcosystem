export type Platform = "ios" | "android" | "web";

export function getPlatform(): Platform {
  const ua = navigator.userAgent || "";
  if (
    (window as any).Capacitor?.isNativePlatform?.() ||
    (window as any).Capacitor?.isPluginAvailable?.("App")
  ) {
    if (/iPad|iPhone|iPod/.test(ua)) return "ios";
    if (/android/i.test(ua)) return "android";
  }
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/android/i.test(ua)) return "android";
  return "web";
}

export function isNativeApp(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function isIOSApp(): boolean {
  return isNativeApp() && getPlatform() === "ios";
}

export function isAndroidApp(): boolean {
  return isNativeApp() && getPlatform() === "android";
}

export function shouldBlockDirectPayments(): boolean {
  return isNativeApp();
}
