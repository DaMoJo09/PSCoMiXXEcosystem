import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, Bell, Heart, MessageCircle, UserPlus, 
  Zap, AtSign, CheckCheck, Sparkles
} from "lucide-react";

interface Notification {
  id: string;
  userId: string;
  actorId: string | null;
  type: string;
  metadata: any;
  read: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
  };
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "like":
      return <Heart className="w-5 h-5 text-red-400" />;
    case "comment":
      return <MessageCircle className="w-5 h-5 text-blue-400" />;
    case "follow":
      return <UserPlus className="w-5 h-5 text-green-400" />;
    case "collab_invite":
      return <Zap className="w-5 h-5 text-yellow-400" />;
    case "mention":
      return <AtSign className="w-5 h-5 text-purple-400" />;
    default:
      return <Bell className="w-5 h-5 text-white/50" />;
  }
}

function getNotificationMessage(notification: Notification): string {
  const actorName = notification.actor?.name || "Someone";
  
  switch (notification.type) {
    case "like":
      return `${actorName} liked your post`;
    case "comment":
      return `${actorName} commented on your post`;
    case "follow":
      return `${actorName} started following you`;
    case "collab_invite":
      return `${actorName} invited you to collaborate`;
    case "mention":
      return `${actorName} mentioned you`;
    case "chain_contribution":
      return `${actorName} added to your chain`;
    default:
      return "New notification";
  }
}

function NotificationCard({ notification, onRead }: { notification: Notification; onRead: () => void }) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
    
    if (notification.type === "follow" && notification.actorId) {
      navigate(`/social/profile/${notification.actorId}`);
    } else if (notification.metadata?.postId) {
      navigate(`/social`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 border-4 border-black cursor-pointer transition-colors ${
        notification.read 
          ? "bg-white/5 hover:bg-white/10" 
          : "bg-white/10 hover:bg-white/15"
      }`}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 border-2 border-black ${notification.read ? "bg-white/10" : "bg-white/20"}`}>
          <NotificationIcon type={notification.type} />
        </div>
        <div className="flex-1">
          <p className={`text-sm ${notification.read ? "text-white/70" : "text-white font-bold"}`}>
            {getNotificationMessage(notification)}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </div>
    </div>
  );
}

export default function Notifications() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => 
        fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 bg-black border-b-4 border-white p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/social")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-xl tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5" />
            NOTIFICATIONS
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 border border-black">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
          )}
          {unreadCount === 0 && <div className="w-10" />}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p className="text-white/70">No notifications yet</p>
            <p className="text-white/50 text-sm">We'll let you know when something happens!</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {notifications.map((notification) => (
              <NotificationCard 
                key={notification.id} 
                notification={notification}
                onRead={() => markReadMutation.mutate(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
