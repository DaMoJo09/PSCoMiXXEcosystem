import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useState } from "react";
import { 
  Rocket, Plus, ChevronRight, Globe, School, Building2, 
  Users, Eye, Heart, Settings, Upload
} from "lucide-react";
import { toast } from "sonner";

export default function PublishModule() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelSlug, setChannelSlug] = useState("");
  const [channelDescription, setChannelDescription] = useState("");

  const { data: myChannels } = useQuery({
    queryKey: ["ecosystem", "my-channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/my-channels");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: allChannels } = useQuery({
    queryKey: ["ecosystem", "channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ecosystem/channels");
      return res.json();
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; description: string }) => {
      const res = await apiRequest("POST", "/api/ecosystem/channels", data);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Channel created successfully!");
      setShowCreateChannel(false);
      setChannelName("");
      setChannelSlug("");
      setChannelDescription("");
      queryClient.invalidateQueries({ queryKey: ["ecosystem", "my-channels"] });
      queryClient.invalidateQueries({ queryKey: ["ecosystem", "channels"] });
    },
    onError: () => {
      toast.error("Failed to create channel");
    },
  });

  const handleCreateChannel = () => {
    if (!channelName.trim() || !channelSlug.trim()) {
      toast.error("Channel name and slug are required");
      return;
    }
    createChannelMutation.mutate({ 
      name: channelName, 
      slug: channelSlug.toLowerCase().replace(/\s+/g, "-"), 
      description: channelDescription 
    });
  };

  const publishDestinations = [
    { 
      id: "personal", 
      name: "Personal Channel", 
      icon: Globe, 
      description: "Your personal creator channel"
    },
    { 
      id: "school", 
      name: "School Station", 
      icon: School, 
      description: "Publish through your school"
    },
    { 
      id: "hub", 
      name: "Community Hub", 
      icon: Building2, 
      description: "Local creator hub channel"
    },
    { 
      id: "global", 
      name: "PSStreaming Global", 
      icon: Users, 
      description: "Reach the global audience"
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-8">
            <Link 
              href="/ecosystem" 
              className="text-zinc-400 hover:text-white text-sm mb-4 inline-flex items-center gap-2"
              data-testid="link-back-ecosystem"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Ecosystem
            </Link>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h1 className="text-3xl font-black" data-testid="text-page-title">PUBLISH</h1>
                  <p className="text-zinc-400 font-mono text-sm">
                    Share your work with the world
                  </p>
                </div>
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="px-4 py-2 bg-white text-black font-bold flex items-center gap-2 hover:bg-zinc-200"
                  data-testid="button-open-create-channel"
                >
                  <Plus className="w-4 h-4" /> Create Channel
                </button>
              )}
            </div>
          </header>

          {showCreateChannel && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border-4 border-white max-w-md w-full p-6">
                <h2 className="text-xl font-black mb-4" data-testid="text-modal-title">CREATE CHANNEL</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Channel Name</label>
                    <input
                      type="text"
                      value={channelName}
                      onChange={(e) => {
                        setChannelName(e.target.value);
                        setChannelSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                      }}
                      className="w-full bg-black border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none"
                      placeholder="My Awesome Channel"
                      data-testid="input-channel-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Channel URL</label>
                    <div className="flex items-center bg-black border-2 border-zinc-700">
                      <span className="px-3 text-zinc-500 text-sm">psstreaming.online/</span>
                      <input
                        type="text"
                        value={channelSlug}
                        onChange={(e) => setChannelSlug(e.target.value)}
                        className="flex-1 bg-transparent px-2 py-2 focus:outline-none"
                        placeholder="my-channel"
                        data-testid="input-channel-slug"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Description</label>
                    <textarea
                      value={channelDescription}
                      onChange={(e) => setChannelDescription(e.target.value)}
                      className="w-full bg-black border-2 border-zinc-700 px-4 py-2 focus:border-white outline-none h-24 resize-none"
                      placeholder="What content will you publish?"
                      data-testid="input-channel-description"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowCreateChannel(false)}
                      className="flex-1 py-3 border-2 border-zinc-700 font-bold hover:border-white"
                      data-testid="button-cancel-create-channel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateChannel}
                      disabled={createChannelMutation.isPending}
                      className="flex-1 py-3 bg-white text-black font-bold hover:bg-zinc-200 disabled:opacity-50"
                      data-testid="button-create-channel"
                    >
                      {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="mb-12">
            <h2 className="text-xl font-black mb-6" data-testid="text-section-destinations">PUBLISH DESTINATIONS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {publishDestinations.map((dest) => {
                const Icon = dest.icon;
                return (
                  <button
                    key={dest.id}
                    className="bg-zinc-900 border-4 border-zinc-800 hover:border-white p-6 text-left transition-all"
                    data-testid={`button-dest-${dest.id}`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center mb-4 bg-white">
                      <Icon className="w-6 h-6 text-black" />
                    </div>
                    <h3 className="font-black mb-1">{dest.name}</h3>
                    <p className="text-sm text-zinc-400">{dest.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {isAuthenticated && myChannels?.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-black mb-6" data-testid="text-section-my-channels">MY CHANNELS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myChannels.map((channel: any) => (
                  <div
                    key={channel.id}
                    className="bg-zinc-900 border-4 border-zinc-600 p-4"
                    data-testid={`card-my-channel-${channel.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-black text-lg">
                        {channel.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold" data-testid={`text-channel-name-${channel.id}`}>{channel.name}</h3>
                        <p className="text-xs text-zinc-400">/{channel.slug}</p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">{channel.description || "No description"}</p>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {channel.subscriberCount || 0} subscribers
                      </span>
                      {channel.verified && (
                        <span className="border border-zinc-600 px-2 py-0.5">VERIFIED</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 py-2 bg-white text-black text-sm font-bold flex items-center justify-center gap-1"
                        data-testid={`button-publish-${channel.id}`}
                      >
                        <Upload className="w-3 h-3" /> Publish
                      </button>
                      <button 
                        className="py-2 px-3 bg-zinc-800 text-sm font-bold hover:bg-zinc-700"
                        data-testid={`button-settings-${channel.id}`}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-black mb-6" data-testid="text-section-discover">DISCOVER CHANNELS</h2>
            {allChannels?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allChannels.filter((c: any) => c.ownerId !== user?.id).slice(0, 6).map((channel: any) => (
                  <div
                    key={channel.id}
                    className="bg-zinc-900 border-4 border-zinc-800 hover:border-white p-4 transition-all"
                    data-testid={`card-channel-${channel.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-zinc-700 flex items-center justify-center font-black">
                        {channel.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold" data-testid={`text-discover-channel-${channel.id}`}>{channel.name}</h3>
                        <p className="text-xs text-zinc-400">
                          {channel.subscriberCount || 0} subscribers
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{channel.description || "No description"}</p>
                    <button 
                      className="w-full py-2 border-2 border-zinc-700 hover:border-white font-bold text-sm flex items-center justify-center gap-2"
                      data-testid={`button-view-channel-${channel.id}`}
                    >
                      <Eye className="w-4 h-4" /> View Channel
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900 border-2 border-zinc-800">
                <Globe className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                <h3 className="font-bold mb-2">No Channels Yet</h3>
                <p className="text-zinc-400 text-sm mb-4">Be the first to create a channel and start publishing!</p>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowCreateChannel(true)}
                    className="px-6 py-2 bg-white text-black font-bold"
                    data-testid="button-create-first-channel"
                  >
                    Create First Channel
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
