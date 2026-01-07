import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Send, Plus, Search, User } from "lucide-react";

interface DmThread {
  id: string;
  isGroup: boolean;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  participants: {
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name: string;
      avatar?: string | null;
    };
  }[];
}

interface DmMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  attachments: any[] | null;
  createdAt: string;
}

function ThreadList({ onSelectThread }: { onSelectThread: (thread: DmThread) => void }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: threads = [], isLoading } = useQuery<DmThread[]>({
    queryKey: ["/api/dm/threads"],
    queryFn: async () => {
      const res = await fetch("/api/dm/threads");
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
  });

  const filteredThreads = threads.filter(thread => {
    const otherParticipants = thread.participants.filter(p => p.userId !== user?.id);
    const names = otherParticipants.map(p => p.user?.name || "").join(" ");
    return names.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getThreadDisplayName = (thread: DmThread) => {
    if (thread.isGroup && thread.name) return thread.name;
    const otherParticipants = thread.participants.filter(p => p.userId !== user?.id);
    return otherParticipants.map(p => p.user?.name).join(", ") || "Unknown";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b-4 border-white">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/social")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-black text-xl">MESSAGES</h1>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 bg-white/10 border-2 border-black text-white placeholder:text-white/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p className="text-white/50">No conversations yet</p>
            <p className="text-white/30 text-sm mt-1">Start chatting with other creators!</p>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const otherParticipant = thread.participants.find(p => p.userId !== user?.id);
            const avatarUrl = otherParticipant?.user?.avatar;
            return (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className="w-full p-4 border-b-2 border-white/10 hover:bg-white/5 transition-colors text-left"
                data-testid={`thread-${thread.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-bold overflow-hidden bg-zinc-800">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/70">{getThreadDisplayName(thread).charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{getThreadDisplayName(thread)}</p>
                    <p className="text-white/50 text-sm">
                      {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}

function ConversationView({ thread, onBack }: { thread: DmThread; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<DmMessage[]>({
    queryKey: ["/api/dm/threads", thread.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/dm/threads/${thread.id}/messages`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/dm/threads/${thread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/threads", thread.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/threads"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
      setMessage("");
    }
  };

  const getThreadDisplayName = () => {
    if (thread.isGroup && thread.name) return thread.name;
    const otherParticipants = thread.participants.filter(p => p.userId !== user?.id);
    return otherParticipants.map(p => p.user?.name).join(", ") || "Unknown";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b-4 border-white flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="w-10 h-10 bg-white/20 border-2 border-black flex items-center justify-center font-bold">
          {getThreadDisplayName().charAt(0).toUpperCase()}
        </div>
        <h1 className="font-bold text-lg flex-1 truncate">{getThreadDisplayName()}</h1>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 border-2 border-black ${
                    isOwn 
                      ? "bg-white text-black" 
                      : "bg-white/10 text-white"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  <p>{msg.body}</p>
                  <p className={`text-xs mt-1 ${isOwn ? "text-black/50" : "text-white/50"}`}>
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t-4 border-white">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 border-2 border-black text-white placeholder:text-white/50"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            data-testid="message-input"
          />
          <Button 
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-white text-black border-2 border-black hover:bg-white/90 font-bold"
            data-testid="send-message-button"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SocialMessages() {
  const [selectedThread, setSelectedThread] = useState<DmThread | null>(null);
  const params = useParams<{ threadId?: string }>();

  const { data: threads = [] } = useQuery<DmThread[]>({
    queryKey: ["/api/dm/threads"],
    queryFn: async () => {
      const res = await fetch("/api/dm/threads");
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
  });

  useEffect(() => {
    if (params.threadId && threads.length > 0) {
      const thread = threads.find(t => t.id === params.threadId);
      if (thread) setSelectedThread(thread);
    }
  }, [params.threadId, threads]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-screen max-w-lg mx-auto">
        {selectedThread ? (
          <ConversationView 
            thread={selectedThread} 
            onBack={() => setSelectedThread(null)} 
          />
        ) : (
          <ThreadList onSelectThread={setSelectedThread} />
        )}
      </div>
    </div>
  );
}
