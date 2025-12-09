import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Users, Copy, Send, Zap, MousePointer2,
  Pencil, Eraser, Square, Circle, Type, Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CollabSession {
  id: string;
  ownerId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  inviteCode: string;
  maxEditors: number;
  pageCount: number;
  status: string;
  settings: any;
  createdAt: string;
  updatedAt: string;
  members?: CollabMember[];
}

interface CollabMember {
  id: string;
  sessionId: string;
  userId: string;
  role: string;
  color: string;
  joinedAt: string;
  user?: { id: string; name: string; };
}

interface Participant {
  userId: string;
  userName: string;
  color: string;
  cursor?: { x: number; y: number; pageId: string };
  activeTool?: string;
}

interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export default function CollabSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [connected, setConnected] = useState(false);
  const [myColor, setMyColor] = useState("#fff");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTool, setActiveTool] = useState("select");
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; color: string; name: string }>>({});
  
  const { data: session, isLoading } = useQuery<CollabSession>({
    queryKey: ["/api/collab/sessions", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/collab/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    enabled: !!sessionId,
  });
  
  const connectWebSocket = useCallback(() => {
    if (!sessionId || !user || wsRef.current) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/collab`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        sessionId,
        userId: user.id,
        userName: user.name,
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case "joined":
          setConnected(true);
          setMyColor(data.color);
          setParticipants(data.participants);
          toast({ title: "Connected!", description: "You're now in the session" });
          break;
          
        case "user_joined":
          setParticipants(prev => [...prev, {
            userId: data.userId,
            userName: data.userName,
            color: data.color,
          }]);
          toast({ 
            title: `${data.userName} joined`, 
            description: "A new collaborator has entered" 
          });
          break;
          
        case "user_left":
          setParticipants(prev => prev.filter(p => p.userId !== data.userId));
          setCursors(prev => {
            const updated = { ...prev };
            delete updated[data.userId];
            return updated;
          });
          break;
          
        case "cursor_update":
          setCursors(prev => ({
            ...prev,
            [data.userId]: {
              x: data.cursor.x,
              y: data.cursor.y,
              color: data.color,
              name: data.userName,
            },
          }));
          break;
          
        case "tool_update":
          setParticipants(prev => prev.map(p => 
            p.userId === data.userId ? { ...p, activeTool: data.tool } : p
          ));
          break;
          
        case "chat":
          setChatMessages(prev => [...prev, {
            userId: data.userId,
            userName: data.userName,
            message: data.message,
            timestamp: data.timestamp,
          }]);
          break;
          
        case "error":
          toast({ title: "Error", description: data.message, variant: "destructive" });
          break;
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };
    
    ws.onerror = () => {
      toast({ title: "Connection error", variant: "destructive" });
    };
    
    wsRef.current = ws;
  }, [sessionId, user, toast]);
  
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!wsRef.current || !connected || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    wsRef.current.send(JSON.stringify({
      type: "cursor_move",
      cursor: { x, y, pageId: "page1" },
    }));
  }, [connected]);
  
  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({
        type: "tool_change",
        tool,
      }));
    }
  };
  
  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current || !connected) return;
    
    wsRef.current.send(JSON.stringify({
      type: "chat",
      text: chatInput,
    }));
    setChatInput("");
  };
  
  const copyInviteCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.inviteCode);
      toast({ title: "Copied!", description: "Invite code copied" });
    }
  };
  
  const tools = [
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "pencil", icon: Pencil, label: "Draw" },
    { id: "eraser", icon: Eraser, label: "Erase" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "ellipse", icon: Circle, label: "Ellipse" },
    { id: "text", icon: Type, label: "Text" },
  ];
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold mb-4">Session not found</p>
          <Button onClick={() => navigate("/social/collab")} className="bg-white text-black">
            Back to Collab Hub
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="sticky top-0 z-50 bg-black border-b-4 border-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/social/collab")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="font-black">{session.title}</span>
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
              </div>
              <p className="text-xs text-white/50">{session.pageCount} pages</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: p.color, borderColor: p.color }}
                  title={p.userName}
                >
                  {p.userName.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={copyInviteCode}
              className="border-2 border-white text-white hover:bg-white/10"
              data-testid="copy-session-code"
            >
              <Copy className="w-4 h-4 mr-1" />
              {session.inviteCode}
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex">
        <div className="w-14 bg-neutral-900 border-r-4 border-black p-2 flex flex-col gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolChange(tool.id)}
              className={`p-2 rounded ${
                activeTool === tool.id 
                  ? "bg-white text-black" 
                  : "text-white/70 hover:bg-white/10"
              }`}
              title={tool.label}
              data-testid={`tool-${tool.id}`}
            >
              <tool.icon className="w-5 h-5" />
            </button>
          ))}
          <div className="flex-1" />
          <button
            className="p-2 text-white/70 hover:bg-white/10 rounded"
            title="Layers"
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>
        
        <div 
          ref={canvasRef}
          className="flex-1 bg-neutral-800 relative overflow-hidden"
          onMouseMove={handleMouseMove}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[600px] h-[900px] bg-white shadow-2xl relative">
              <div className="absolute inset-0 flex items-center justify-center text-black/20">
                <p className="text-xl font-bold">Canvas Area</p>
              </div>
              
              {Object.entries(cursors).map(([id, cursor]) => (
                <div
                  key={id}
                  className="absolute pointer-events-none transition-all duration-75"
                  style={{ 
                    left: `${cursor.x}%`, 
                    top: `${cursor.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <MousePointer2 
                    className="w-5 h-5" 
                    style={{ color: cursor.color, fill: cursor.color }}
                  />
                  <span 
                    className="text-xs font-bold px-1 rounded whitespace-nowrap"
                    style={{ backgroundColor: cursor.color, color: "#000" }}
                  >
                    {cursor.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="w-64 bg-neutral-900 border-l-4 border-black flex flex-col">
          <div className="p-3 border-b border-white/20">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              PARTICIPANTS ({participants.length})
            </h3>
          </div>
          <div className="p-2 border-b border-white/20 max-h-32 overflow-auto">
            {participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-2 py-1 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: p.color }}
                />
                <span className={p.userId === user?.id ? "font-bold" : ""}>
                  {p.userName} {p.userId === user?.id && "(you)"}
                </span>
                {p.activeTool && (
                  <span className="text-xs text-white/50">({p.activeTool})</span>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3 border-b border-white/20">
              <h3 className="font-bold text-sm">CHAT</h3>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <span className="font-bold" style={{ color: participants.find(p => p.userId === msg.userId)?.color }}>
                    {msg.userName}:
                  </span>{" "}
                  <span className="text-white/80">{msg.message}</span>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <p className="text-white/30 text-xs text-center py-4">No messages yet</p>
              )}
            </div>
            <div className="p-2 border-t border-white/20">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/10 border-2 border-black text-white text-sm"
                  data-testid="chat-input"
                />
                <Button 
                  size="icon" 
                  onClick={sendChat}
                  className="bg-white text-black hover:bg-white/90"
                  data-testid="send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
