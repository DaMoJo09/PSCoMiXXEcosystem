import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { 
  Calendar, MapPin, Clock, ExternalLink, ChevronRight, 
  Filter, Users, Image as ImageIcon, Plus, X, Edit2, Trash2, Check
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";

interface Exhibition {
  id: string;
  userId?: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  startDate: string | Date;
  endDate: string | Date | null;
  eventType: "exhibition" | "workshop" | "talk" | "opening";
  status: "upcoming" | "ongoing" | "past";
  images: string[];
  externalLink?: string;
  rsvpEnabled: boolean;
}

const EVENT_TYPE_STYLES = {
  exhibition: { label: "Exhibition" },
  workshop: { label: "Workshop" },
  talk: { label: "Talk" },
  opening: { label: "Opening" }
};

const STATUS_STYLES = {
  upcoming: { label: "Upcoming" },
  ongoing: { label: "Now Open" },
  past: { label: "Past" }
};

export default function ExhibitionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "ongoing" | "past">("all");
  const [filterType, setFilterType] = useState<"all" | "exhibition" | "workshop" | "talk" | "opening">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExhibition, setEditingExhibition] = useState<Exhibition | null>(null);
  const [selectedExhibition, setSelectedExhibition] = useState<Exhibition | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpEmail, setRsvpEmail] = useState("");
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    venue: string;
    address: string;
    city: string;
    country: string;
    startDate: string;
    endDate: string;
    eventType: "exhibition" | "workshop" | "talk" | "opening";
    status: "upcoming" | "ongoing" | "past";
    images: string[];
    externalLink: string;
    rsvpEnabled: boolean;
  }>({
    title: "",
    description: "",
    venue: "",
    address: "",
    city: "",
    country: "",
    startDate: "",
    endDate: "",
    eventType: "exhibition",
    status: "upcoming",
    images: [""],
    externalLink: "",
    rsvpEnabled: true
  });

  const { data: exhibitions = [], isLoading } = useQuery<Exhibition[]>({
    queryKey: ["/api/exhibitions"],
    queryFn: async () => {
      const res = await fetch("/api/exhibitions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/exhibitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create exhibition");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exhibitions"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Exhibition created");
    },
    onError: () => toast.error("Failed to create exhibition"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/exhibitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update exhibition");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exhibitions"] });
      setEditingExhibition(null);
      resetForm();
      toast.success("Exhibition updated");
    },
    onError: () => toast.error("Failed to update exhibition"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/exhibitions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete exhibition");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exhibitions"] });
      toast.success("Exhibition deleted");
    },
    onError: () => toast.error("Failed to delete exhibition"),
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      venue: "",
      address: "",
      city: "",
      country: "",
      startDate: "",
      endDate: "",
      eventType: "exhibition",
      status: "upcoming",
      images: [""],
      externalLink: "",
      rsvpEnabled: true
    });
  };

  const openEditDialog = (exhibition: Exhibition) => {
    setEditingExhibition(exhibition);
    const startDate = new Date(exhibition.startDate);
    const endDate = exhibition.endDate ? new Date(exhibition.endDate) : null;
    setFormData({
      title: exhibition.title,
      description: exhibition.description || "",
      venue: exhibition.venue || "",
      address: exhibition.address || "",
      city: exhibition.city || "",
      country: exhibition.country || "",
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate ? endDate.toISOString().split('T')[0] : "",
      eventType: exhibition.eventType,
      status: exhibition.status,
      images: exhibition.images?.length ? exhibition.images : [""],
      externalLink: exhibition.externalLink || "",
      rsvpEnabled: exhibition.rsvpEnabled ?? true
    });
  };

  const handleSubmit = () => {
    const data = {
      title: formData.title,
      description: formData.description || null,
      venue: formData.venue,
      address: formData.address,
      city: formData.city,
      country: formData.country,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      eventType: formData.eventType,
      status: formData.status,
      images: formData.images.filter(img => img.trim()),
      externalLink: formData.externalLink || null,
      rsvpEnabled: formData.rsvpEnabled
    };

    if (editingExhibition) {
      updateMutation.mutate({ id: editingExhibition.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRsvp = () => {
    if (!rsvpName || !rsvpEmail) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success(`RSVP confirmed for ${selectedExhibition?.title}! Check your email for confirmation.`);
    setShowRsvpModal(false);
    setRsvpName("");
    setRsvpEmail("");
    setSelectedExhibition(null);
  };

  const filteredExhibitions = exhibitions.filter((ex: Exhibition) => {
    const matchesStatus = filterStatus === "all" || ex.status === filterStatus;
    const matchesType = filterType === "all" || ex.eventType === filterType;
    return matchesStatus && matchesType;
  });

  const upcomingCount = exhibitions.filter((e: Exhibition) => e.status === "upcoming").length;
  const ongoingCount = exhibitions.filter((e: Exhibition) => e.status === "ongoing").length;

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <header className="border-b-4 border-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>EXHIBITIONS & EVENTS</h1>
              <p className="text-zinc-400">Upcoming shows, workshops, talks, and openings</p>
            </div>
            {user && (
              <Dialog open={isAddDialogOpen || !!editingExhibition} onOpenChange={(open) => {
                if (!open) {
                  setIsAddDialogOpen(false);
                  setEditingExhibition(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-white text-black hover:bg-zinc-200 font-bold border-2 border-white"
                    data-testid="btn-add-exhibition"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ADD EVENT
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-4 border-white text-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">{editingExhibition ? "EDIT EVENT" : "ADD EVENT"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-white">Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        data-testid="input-exhibition-title"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        data-testid="input-exhibition-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Venue</Label>
                        <Input
                          value={formData.venue}
                          onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Address</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">City</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Country</Label>
                        <Input
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Start Date *</Label>
                        <Input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">End Date</Label>
                        <Input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="bg-zinc-900 border-white text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Event Type</Label>
                        <Select value={formData.eventType} onValueChange={(v: any) => setFormData({ ...formData, eventType: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white">
                            <SelectItem value="exhibition" className="text-white">Exhibition</SelectItem>
                            <SelectItem value="workshop" className="text-white">Workshop</SelectItem>
                            <SelectItem value="talk" className="text-white">Talk</SelectItem>
                            <SelectItem value="opening" className="text-white">Opening</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white">Status</Label>
                        <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger className="bg-zinc-900 border-white text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white">
                            <SelectItem value="upcoming" className="text-white">Upcoming</SelectItem>
                            <SelectItem value="ongoing" className="text-white">Ongoing</SelectItem>
                            <SelectItem value="past" className="text-white">Past</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <ImageUpload
                      label="Event Image"
                      value={formData.images[0]}
                      onChange={(value) => setFormData({ ...formData, images: [value] })}
                    />
                    <div>
                      <Label className="text-white">External Link</Label>
                      <Input
                        value={formData.externalLink}
                        onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                        className="bg-zinc-900 border-white text-white"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.rsvpEnabled}
                        onChange={(e) => setFormData({ ...formData, rsvpEnabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>Enable RSVP</span>
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.title || !formData.startDate || createMutation.isPending || updateMutation.isPending}
                      className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
                      data-testid="btn-save-exhibition"
                    >
                      {editingExhibition ? "UPDATE EVENT" : "ADD EVENT"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="flex gap-4 mt-4">
            <div className="px-4 py-2 border-4 border-white">
              <span className="text-2xl font-black">{upcomingCount}</span>
              <span className="text-sm text-zinc-400 ml-2">Upcoming</span>
            </div>
            <div className="px-4 py-2 border-4 border-white">
              <span className="text-2xl font-black">{ongoingCount}</span>
              <span className="text-sm text-zinc-400 ml-2">Now Open</span>
            </div>
          </div>
        </header>

        <div className="p-6 border-b-2 border-zinc-800">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-bold">Filter:</span>
            </div>
            
            <div className="flex border-2 border-white">
              {(["all", "upcoming", "ongoing", "past"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ${
                    filterStatus === status ? "bg-white text-black" : "hover:bg-zinc-900"
                  }`}
                  data-testid={`filter-status-${status}`}
                >
                  {status === "all" ? "All" : status}
                </button>
              ))}
            </div>

            <div className="flex border-2 border-white">
              {(["all", "exhibition", "workshop", "talk", "opening"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase ${
                    filterType === type ? "bg-white text-black" : "hover:bg-zinc-900"
                  }`}
                  data-testid={`filter-type-${type}`}
                >
                  {type === "all" ? "All Types" : type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-white border-t-transparent animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-6">
              {filteredExhibitions.map((exhibition: Exhibition) => (
                <div
                  key={exhibition.id}
                  className="border-4 border-white bg-zinc-900 hover:bg-zinc-800 transition-colors group"
                  data-testid={`exhibition-card-${exhibition.id}`}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-80 h-48 md:h-auto shrink-0 overflow-hidden bg-black">
                      {exhibition.images?.[0] ? (
                        <img
                          src={exhibition.images[0]}
                          alt={exhibition.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 p-6">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-1 text-xs font-bold bg-white text-black`}>
                          {STATUS_STYLES[exhibition.status]?.label || exhibition.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-bold border-2 border-zinc-600`}>
                          {EVENT_TYPE_STYLES[exhibition.eventType]?.label || exhibition.eventType}
                        </span>
                      </div>

                      <h2 className="text-2xl font-black mb-2">{exhibition.title}</h2>
                      <p className="text-zinc-400 mb-4 line-clamp-2">{exhibition.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold">{exhibition.venue}</p>
                            <p className="text-sm text-zinc-400">{exhibition.address}</p>
                            <p className="text-sm text-zinc-400">{exhibition.city}, {exhibition.country}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold">
                              {format(new Date(exhibition.startDate), "MMMM d, yyyy")}
                            </p>
                            {exhibition.endDate && (
                              <p className="text-sm text-zinc-400">
                                through {format(new Date(exhibition.endDate), "MMMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {exhibition.rsvpEnabled && exhibition.status !== "past" && (
                          <button 
                            onClick={() => { setSelectedExhibition(exhibition); setShowRsvpModal(true); }}
                            className="px-4 py-2 bg-white text-black font-bold text-sm flex items-center gap-2 hover:bg-zinc-200"
                            data-testid={`btn-rsvp-${exhibition.id}`}
                          >
                            <Users className="w-4 h-4" /> RSVP
                          </button>
                        )}
                        {exhibition.externalLink && (
                          <a
                            href={exhibition.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 border-2 border-white font-bold text-sm flex items-center gap-2 hover:bg-zinc-800"
                            data-testid={`btn-moreinfo-${exhibition.id}`}
                          >
                            <ExternalLink className="w-4 h-4" /> More Info
                          </a>
                        )}
                        <button 
                          onClick={() => { setSelectedExhibition(exhibition); setShowGallery(true); }}
                          className="px-4 py-2 border-2 border-white font-bold text-sm flex items-center gap-2 hover:bg-zinc-800"
                          data-testid={`btn-gallery-${exhibition.id}`}
                        >
                          <ImageIcon className="w-4 h-4" /> Gallery
                        </button>
                        {user && exhibition.userId === user.id && (
                          <>
                            <button
                              onClick={() => openEditDialog(exhibition)}
                              className="px-4 py-2 border-2 border-zinc-600 font-bold text-sm flex items-center gap-2 hover:border-white"
                              data-testid={`btn-edit-${exhibition.id}`}
                            >
                              <Edit2 className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(exhibition.id)}
                              className="px-4 py-2 border-2 border-zinc-600 font-bold text-sm flex items-center gap-2 hover:border-white"
                              data-testid={`btn-delete-${exhibition.id}`}
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredExhibitions.length === 0 && (
                <div className="text-center py-12 border-4 border-dashed border-zinc-700">
                  <p className="text-zinc-500 mb-4">No events match your filters</p>
                  {user && (
                    <Button onClick={() => setIsAddDialogOpen(true)} className="bg-white text-black">
                      <Plus className="w-4 h-4 mr-2" /> Add Your First Event
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {showRsvpModal && selectedExhibition && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-black border-4 border-white max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">RSVP</h2>
                <button onClick={() => { setShowRsvpModal(false); setSelectedExhibition(null); }} className="p-2 hover:bg-zinc-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-zinc-400 mb-4">Reserve your spot for <strong className="text-white">{selectedExhibition.title}</strong></p>
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Your Name</Label>
                  <Input
                    value={rsvpName}
                    onChange={(e) => setRsvpName(e.target.value)}
                    className="bg-zinc-900 border-white text-white"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label className="text-white">Email</Label>
                  <Input
                    type="email"
                    value={rsvpEmail}
                    onChange={(e) => setRsvpEmail(e.target.value)}
                    className="bg-zinc-900 border-white text-white"
                    placeholder="Enter your email"
                  />
                </div>
                <Button onClick={handleRsvp} className="w-full bg-white text-black hover:bg-zinc-200 font-bold">
                  <Check className="w-4 h-4 mr-2" /> Confirm RSVP
                </Button>
              </div>
            </div>
          </div>
        )}

        {showGallery && selectedExhibition && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-black border-4 border-white max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">{selectedExhibition.title} - Gallery</h2>
                <button onClick={() => { setShowGallery(false); setSelectedExhibition(null); }} className="p-2 hover:bg-zinc-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {selectedExhibition.images?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedExhibition.images.map((img, idx) => (
                    <div key={idx} className="aspect-video bg-zinc-900 border-2 border-zinc-700 overflow-hidden">
                      <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4" />
                  <p>No gallery images available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
