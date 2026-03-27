// Google Analytics integration - from javascript_google_analytics blueprint

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

let _sessionId: string | null = null;
function getSessionId() {
  if (!_sessionId) {
    _sessionId = sessionStorage.getItem("ps_session_id");
    if (!_sessionId) {
      _sessionId = crypto.randomUUID();
      sessionStorage.setItem("ps_session_id", _sessionId);
    }
  }
  return _sessionId;
}

const eventQueue: Array<{ eventType: string; eventCategory: string; metadata?: any }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushEvents() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, 20);
  const sessionId = getSessionId();
  for (const evt of batch) {
    fetch("/api/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...evt, sessionId }),
      keepalive: true,
    }).catch(() => {});
  }
}

export function trackPlatformEvent(eventType: string, eventCategory: string, metadata?: Record<string, any>) {
  eventQueue.push({ eventType, eventCategory, metadata });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushEvents, 2000);
}

export function trackPageVisit(path: string) {
  trackPlatformEvent("page_view", "navigation", { path });
  trackPageView(path);
}

export function trackFeatureUse(feature: string, details?: Record<string, any>) {
  trackPlatformEvent("feature_use", "engagement", { feature, ...details });
}

export function trackToolOpen(tool: string) {
  trackPlatformEvent("tool_open", "creator_tools", { tool });
}

export function trackExportAction(format: string, tool: string) {
  trackPlatformEvent("export", "creator_tools", { format, tool });
}

export function trackAIGeneration(type: string, tool: string) {
  trackPlatformEvent("ai_generation", "ai", { type, tool });
}
