import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface SyncEvent {
  id: string;
  eventType: string;
  targetApp: string;
  status: string;
  createdAt: string;
  error?: string;
}

interface SyncStatusData {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  recentEvents: SyncEvent[];
}

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sync/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRetry = async (syncId: string) => {
    setRetrying(syncId);
    try {
      await fetch(`/api/sync/retry/${syncId}`, { method: "POST", credentials: "include" });
      await fetchStatus();
    } catch {} finally {
      setRetrying(null);
    }
  };

  if (!status) return null;

  const hasIssues = status.failed > 0 || status.retrying > 0;
  const isActive = status.pending > 0 || status.processing > 0;

  const getStatusIcon = () => {
    if (isActive) return <Loader2 className="w-3 h-3 animate-spin" data-testid="sync-icon-active" />;
    if (hasIssues) return <AlertTriangle className="w-3 h-3" data-testid="sync-icon-warning" />;
    return <CheckCircle className="w-3 h-3" data-testid="sync-icon-ok" />;
  };

  const getStatusColor = () => {
    if (hasIssues) return "text-orange-500";
    if (isActive) return "text-blue-500";
    return "text-green-500";
  };

  const getEventStatusIcon = (eventStatus: string) => {
    switch (eventStatus) {
      case "completed": return <CheckCircle className="w-3 h-3 text-green-500" />;
      case "failed": return <XCircle className="w-3 h-3 text-red-500" />;
      case "retrying": return <RefreshCw className="w-3 h-3 text-orange-500" />;
      case "processing": return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      default: return <Loader2 className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="relative" data-testid="sync-status-indicator">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-white/10 hover:bg-white/5 transition-colors ${getStatusColor()}`}
        data-testid="button-sync-toggle"
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">Sync</span>
        {hasIssues && <span className="bg-orange-500 text-white text-[10px] px-1 rounded" data-testid="sync-issue-count">{status.failed + status.retrying}</span>}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-black border border-white/20 rounded-lg shadow-xl z-50 p-3" data-testid="sync-status-dropdown">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">Ecosystem Sync</span>
            <button onClick={fetchStatus} className="text-white/50 hover:text-white" data-testid="button-sync-refresh">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 mb-3 text-[10px]">
            <div className="bg-white/5 rounded p-1.5 text-center">
              <div className="text-green-400 font-bold" data-testid="sync-count-completed">{status.completed}</div>
              <div className="text-white/40">Done</div>
            </div>
            <div className="bg-white/5 rounded p-1.5 text-center">
              <div className="text-blue-400 font-bold" data-testid="sync-count-pending">{status.pending + status.processing}</div>
              <div className="text-white/40">Active</div>
            </div>
            <div className="bg-white/5 rounded p-1.5 text-center">
              <div className={`font-bold ${status.failed > 0 ? "text-red-400" : "text-white/40"}`} data-testid="sync-count-failed">{status.failed}</div>
              <div className="text-white/40">Failed</div>
            </div>
          </div>

          {status.recentEvents && status.recentEvents.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {status.recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-[10px] p-1.5 bg-white/5 rounded" data-testid={`sync-event-${event.id}`}>
                  {getEventStatusIcon(event.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-white/80 truncate">{event.eventType}</div>
                    <div className="text-white/30">{event.targetApp} - {new Date(event.createdAt).toLocaleTimeString()}</div>
                  </div>
                  {event.status === "failed" && (
                    <button
                      onClick={() => handleRetry(event.id)}
                      disabled={retrying === event.id}
                      className="text-orange-400 hover:text-orange-300 p-0.5"
                      data-testid={`button-retry-${event.id}`}
                    >
                      <RefreshCw className={`w-3 h-3 ${retrying === event.id ? "animate-spin" : ""}`} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
