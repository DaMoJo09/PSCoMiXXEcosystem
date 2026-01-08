import { Layout } from "@/components/layout/Layout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, Download, TrendingUp, ShieldCheck, Megaphone, Plus, Trash2, Edit, Star, Calendar, Settings } from "lucide-react";
import { Link } from "wouter";
import { useAdminStats, useAdminUsers, useAdminProjects } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useAllAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "@/hooks/useAnnouncements";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'];

const StatCard = ({ title, value, icon: Icon, subtitle }: any) => (
  <div className="p-6 border border-border bg-card shadow-sm hover:shadow-hard transition-shadow" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold font-display mt-2">{value}</h3>
      </div>
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
    {subtitle && (
      <div className="mt-4 text-xs text-muted-foreground">
        {subtitle}
      </div>
    )}
  </div>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: projects, isLoading: projectsLoading } = useAdminProjects();
  const { data: announcements, isLoading: announcementsLoading } = useAllAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    linkText: "",
    eventType: "event",
    isFeatured: true,
    isActive: true,
    startDate: "",
    endDate: "",
  });

  const isLoading = statsLoading || usersLoading || projectsLoading;

  const resetEventForm = () => {
    setEventForm({
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      linkText: "",
      eventType: "event",
      isFeatured: true,
      isActive: true,
      startDate: "",
      endDate: "",
    });
    setEditingEvent(null);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const data = {
        ...eventForm,
        startDate: eventForm.startDate ? new Date(eventForm.startDate).toISOString() : null,
        endDate: eventForm.endDate ? new Date(eventForm.endDate).toISOString() : null,
      };

      if (editingEvent) {
        await updateAnnouncement.mutateAsync({ id: editingEvent.id, data });
        toast.success("Event updated");
      } else {
        await createAnnouncement.mutateAsync(data);
        toast.success("Event created");
      }
      setEventDialogOpen(false);
      resetEventForm();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || "",
      description: event.description || "",
      imageUrl: event.imageUrl || "",
      linkUrl: event.linkUrl || "",
      linkText: event.linkText || "",
      eventType: event.eventType || "event",
      isFeatured: event.isFeatured ?? true,
      isActive: event.isActive ?? true,
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
    });
    setEventDialogOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteAnnouncement.mutateAsync(id);
      toast.success("Event deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (user?.role !== "admin") {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShieldCheck className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold font-display">Admin Access Required</h2>
            <p className="text-muted-foreground">You need admin privileges to view this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="size-12" />
        </div>
      </Layout>
    );
  }

  const projectTypeData = stats?.projectsByType?.map((item, index) => ({
    name: item.type.toUpperCase(),
    value: item.count,
    fill: COLORS[index % COLORS.length],
  })) || [];

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-black text-white text-xs px-2 py-0.5 font-mono font-bold">ADMIN MODE</span>
              </div>
              <h1 className="text-4xl font-display font-bold" data-testid="text-admin-title">Analytics Console</h1>
            </div>
            <Link href="/admin/control">
              <Button className="bg-black text-white hover:bg-zinc-800 border-2 border-black shadow-[4px_4px_0_#000]" data-testid="button-control-room">
                <Settings className="w-4 h-4 mr-2" /> Control Room
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Users" 
            value={stats?.totalUsers || 0} 
            icon={Users} 
            subtitle="Registered creators"
          />
          <StatCard 
            title="Total Projects" 
            value={stats?.totalProjects || 0} 
            icon={FileText} 
            subtitle="Across all types"
          />
          <StatCard 
            title="Comics" 
            value={stats?.projectsByType?.find(p => p.type === 'comic')?.count || 0} 
            icon={Download} 
            subtitle="Comic projects"
          />
          <StatCard 
            title="Cards" 
            value={stats?.projectsByType?.find(p => p.type === 'card')?.count || 0} 
            icon={TrendingUp} 
            subtitle="Card projects"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border border-border p-6 bg-card">
            <h3 className="font-display font-bold text-lg mb-6">Projects by Type</h3>
            <div className="h-[300px] w-full">
              {projectTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectTypeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0px' }}
                      cursor={{ fill: '#f5f5f5' }}
                    />
                    <Bar dataKey="value" fill="#000000" radius={[0, 0, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No project data yet
                </div>
              )}
            </div>
          </div>

          <div className="border border-border p-6 bg-card">
            <h3 className="font-display font-bold text-lg mb-6">Project Distribution</h3>
            <div className="h-[300px] w-full">
              {projectTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {projectTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No project data yet
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border border-border p-6 bg-card">
          <h3 className="font-display font-bold text-lg mb-6">Recent Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-mono text-xs uppercase">Name</th>
                  <th className="text-left py-3 px-4 font-mono text-xs uppercase">Email</th>
                  <th className="text-left py-3 px-4 font-mono text-xs uppercase">Role</th>
                  <th className="text-left py-3 px-4 font-mono text-xs uppercase">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users?.slice(0, 10).map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 px-4 font-medium">{user.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 ${user.role === 'admin' ? 'bg-black text-white' : 'bg-secondary'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!users || users.length === 0) && (
              <p className="text-center py-8 text-muted-foreground">No users yet</p>
            )}
          </div>
        </div>

        <div className="border border-border p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Press Start Events
            </h3>
            <Dialog open={eventDialogOpen} onOpenChange={(open) => {
              setEventDialogOpen(open);
              if (!open) resetEventForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-black text-white hover:bg-zinc-800" data-testid="button-add-event">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/20 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingEvent ? "Edit Event" : "Create Press Start Event"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label className="text-white">Title *</Label>
                    <Input
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      placeholder="Spring Creator Festival 2026"
                      className="bg-zinc-900 border-white/20 text-white"
                      data-testid="input-event-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Description</Label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      placeholder="Join us for our biggest event of the year..."
                      className="w-full bg-zinc-900 border border-white/20 text-white p-2 rounded min-h-[80px]"
                      data-testid="input-event-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Event Type</Label>
                      <select
                        value={eventForm.eventType}
                        onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/20 text-white p-2 rounded"
                        data-testid="select-event-type"
                      >
                        <option value="event">Event</option>
                        <option value="announcement">Announcement</option>
                        <option value="contest">Contest</option>
                        <option value="release">New Release</option>
                        <option value="featured">Featured</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Image URL</Label>
                      <Input
                        value={eventForm.imageUrl}
                        onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="bg-zinc-900 border-white/20 text-white"
                        data-testid="input-event-image"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Link URL</Label>
                      <Input
                        value={eventForm.linkUrl}
                        onChange={(e) => setEventForm({ ...eventForm, linkUrl: e.target.value })}
                        placeholder="https://..."
                        className="bg-zinc-900 border-white/20 text-white"
                        data-testid="input-event-link"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Link Text</Label>
                      <Input
                        value={eventForm.linkText}
                        onChange={(e) => setEventForm({ ...eventForm, linkText: e.target.value })}
                        placeholder="Learn More"
                        className="bg-zinc-900 border-white/20 text-white"
                        data-testid="input-event-link-text"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Start Date</Label>
                      <Input
                        type="datetime-local"
                        value={eventForm.startDate}
                        onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                        className="bg-zinc-900 border-white/20 text-white"
                        data-testid="input-event-start"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">End Date</Label>
                      <Input
                        type="datetime-local"
                        value={eventForm.endDate}
                        onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                        className="bg-zinc-900 border-white/20 text-white"
                        data-testid="input-event-end"
                      />
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-white">
                      <input
                        type="checkbox"
                        checked={eventForm.isFeatured}
                        onChange={(e) => setEventForm({ ...eventForm, isFeatured: e.target.checked })}
                        className="w-4 h-4"
                        data-testid="checkbox-featured"
                      />
                      <Star className="w-4 h-4" />
                      Featured (Press Start)
                    </label>
                    <label className="flex items-center gap-2 text-white">
                      <input
                        type="checkbox"
                        checked={eventForm.isActive}
                        onChange={(e) => setEventForm({ ...eventForm, isActive: e.target.checked })}
                        className="w-4 h-4"
                        data-testid="checkbox-active"
                      />
                      Active
                    </label>
                  </div>
                  <Button 
                    onClick={handleSaveEvent} 
                    className="w-full bg-white text-black hover:bg-zinc-200"
                    disabled={createAnnouncement.isPending || updateAnnouncement.isPending}
                    data-testid="button-save-event"
                  >
                    {createAnnouncement.isPending || updateAnnouncement.isPending ? "Saving..." : (editingEvent ? "Update Event" : "Create Event")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {announcementsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="size-6" />
              </div>
            ) : announcements && announcements.length > 0 ? (
              announcements.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-4 border border-border hover:bg-secondary/10"
                  data-testid={`event-item-${event.id}`}
                >
                  <div className="flex items-center gap-4">
                    {event.imageUrl && (
                      <img src={event.imageUrl} alt="" className="w-16 h-12 object-cover border border-border" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {event.isFeatured && (
                          <span className="bg-black text-white text-xs px-1.5 py-0.5 font-mono flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            PS
                          </span>
                        )}
                        <span className="text-xs font-mono uppercase text-muted-foreground">{event.eventType}</span>
                        {!event.isActive && (
                          <span className="text-xs px-1.5 py-0.5 bg-zinc-200 text-zinc-600">INACTIVE</span>
                        )}
                      </div>
                      <h4 className="font-bold">{event.title}</h4>
                      {event.startDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.startDate).toLocaleDateString()}
                          {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditEvent(event)}
                      className="p-2 hover:bg-secondary transition-colors"
                      data-testid={`button-edit-event-${event.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 hover:bg-red-100 hover:text-red-600 transition-colors"
                      data-testid={`button-delete-event-${event.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No events yet. Create your first Press Start event!
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
