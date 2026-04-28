import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { 
  Shield, Users, Mail, Key, Gift, Settings, Activity, 
  ToggleLeft, ToggleRight, Check, X, Plus, Trash2, 
  Download, RefreshCw, Clock, ChevronDown, ChevronRight, ArrowLeft,
  UserPlus, Crown, Search, Package, Upload, Edit, DollarSign, Eye, EyeOff, Image, Megaphone
} from "lucide-react";
import { PromoPageRenderer, type PromoTemplate, PROMO_TYPE_META } from "@/components/promo/PromoPageStudio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description?: string;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name?: string;
  status: string;
  source?: string;
  createdAt: string;
}

interface InviteCode {
  id: string;
  code: string;
  type: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface AppSumoCode {
  id: string;
  code: string;
  tier: string;
  status: string;
  redeemedBy?: string;
  redeemedAt?: string;
  purchaseEmail?: string;
  createdAt: string;
}

interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: any;
  createdAt: string;
}

interface DashboardStats {
  totalUsers: number;
  adminCount: number;
  creatorCount: number;
  waitlistPending: number;
  waitlistApproved: number;
  waitlistRejected: number;
  featureFlags: FeatureFlag[];
  settings: any[];
  recentLogs: AdminLog[];
}

export default function AdminControlRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newInviteCode, setNewInviteCode] = useState({ code: "", maxUses: 1, type: "standard" });
  const [newAppSumoCode, setNewAppSumoCode] = useState({ code: "", purchaseEmail: "" });
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [showCreateAppSumo, setShowCreateAppSumo] = useState(false);

  const { data: dashboardStats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    enabled: user?.role === "admin",
  });

  const { data: waitlist = [], isLoading: loadingWaitlist } = useQuery<WaitlistEntry[]>({
    queryKey: ["/api/admin/waitlist"],
    enabled: user?.role === "admin" && activeTab === "waitlist",
  });

  const { data: inviteCodes = [], isLoading: loadingCodes } = useQuery<InviteCode[]>({
    queryKey: ["/api/admin/invite-codes"],
    enabled: user?.role === "admin" && activeTab === "invites",
  });

  const { data: appSumoCodes = [], isLoading: loadingAppSumo } = useQuery<AppSumoCode[]>({
    queryKey: ["/api/admin/appsumo-codes"],
    enabled: user?.role === "admin" && activeTab === "appsumo",
  });

  const { data: adminLogs = [], isLoading: loadingLogs } = useQuery<AdminLog[]>({
    queryKey: ["/api/admin/logs"],
    enabled: user?.role === "admin" && activeTab === "logs",
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await fetch(`/api/admin/feature-flags/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update feature flag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast.success("Feature flag updated");
    },
    onError: () => toast.error("Failed to update feature flag"),
  });

  const approveWaitlistMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/waitlist/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast.success("Waitlist entry approved");
    },
    onError: () => toast.error("Failed to approve entry"),
  });

  const rejectWaitlistMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/waitlist/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waitlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast.success("Waitlist entry rejected");
    },
    onError: () => toast.error("Failed to reject entry"),
  });

  const createInviteCodeMutation = useMutation({
    mutationFn: async (data: { code: string; maxUses: number; type: string }) => {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create invite code");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-codes"] });
      setShowCreateInvite(false);
      setNewInviteCode({ code: "", maxUses: 1, type: "standard" });
      toast.success("Invite code created");
    },
    onError: () => toast.error("Failed to create invite code"),
  });

  const deactivateInviteCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/invite-codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to deactivate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-codes"] });
      toast.success("Invite code deactivated");
    },
    onError: () => toast.error("Failed to deactivate invite code"),
  });

  const createAppSumoCodeMutation = useMutation({
    mutationFn: async (data: { code: string; purchaseEmail: string }) => {
      const res = await fetch("/api/admin/appsumo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create AppSumo code");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appsumo-codes"] });
      setShowCreateAppSumo(false);
      setNewAppSumoCode({ code: "", purchaseEmail: "" });
      toast.success("AppSumo code created");
    },
    onError: () => toast.error("Failed to create AppSumo code"),
  });

  if (!user || user.role !== "admin") {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Card className="bg-zinc-950 border-4 border-white shadow-[8px_8px_0_#fff]">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 text-white mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white font-space-grotesk mb-2">ACCESS DENIED</h1>
              <p className="text-zinc-400">Admin privileges required</p>
              <Link href="/"><Button variant="outline" className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Button></Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="min-h-screen bg-black text-white font-inter p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin"><button className="p-2 hover:bg-zinc-800 border border-zinc-700" data-testid="button-back-admin"><ArrowLeft className="w-5 h-5" /></button></Link>
          <div className="p-3 bg-white">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-space-grotesk tracking-tight">CONTROL ROOM</h1>
            <p className="text-zinc-400">Platform administration and monetization</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border-2 border-white mb-6">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-dashboard">
              <Activity className="w-4 h-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="flags" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-flags">
              <ToggleRight className="w-4 h-4 mr-2" /> Feature Flags
            </TabsTrigger>
            <TabsTrigger value="waitlist" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-waitlist">
              <Mail className="w-4 h-4 mr-2" /> Waitlist
            </TabsTrigger>
            <TabsTrigger value="invites" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-invites">
              <Key className="w-4 h-4 mr-2" /> Invite Codes
            </TabsTrigger>
            <TabsTrigger value="appsumo" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-appsumo">
              <Gift className="w-4 h-4 mr-2" /> AppSumo
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-logs">
              <Clock className="w-4 h-4 mr-2" /> Activity Logs
            </TabsTrigger>
            <TabsTrigger value="team-access" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-team-access">
              <Crown className="w-4 h-4 mr-2" /> Team Access
            </TabsTrigger>
            <TabsTrigger value="asset-store" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-asset-store">
              <Package className="w-4 h-4 mr-2" /> Asset Store
            </TabsTrigger>
            <TabsTrigger value="promo" className="data-[state=active]:bg-white data-[state=active]:text-black" data-testid="tab-promo">
              <Megaphone className="w-4 h-4 mr-2" /> Promo Pages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {loadingStats ? (
              <div className="text-center py-8 text-zinc-400">Loading dashboard...</div>
            ) : dashboardStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-zinc-400 text-sm">TOTAL USERS</p>
                          <p className="text-3xl font-bold font-space-grotesk" data-testid="stat-total-users">{dashboardStats.totalUsers}</p>
                        </div>
                        <Users className="w-10 h-10 text-white" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-zinc-400 text-sm">CREATORS</p>
                          <p className="text-3xl font-bold font-space-grotesk" data-testid="stat-creators">{dashboardStats.creatorCount}</p>
                        </div>
                        <Users className="w-10 h-10 text-white" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-zinc-400 text-sm">WAITLIST PENDING</p>
                          <p className="text-3xl font-bold font-space-grotesk" data-testid="stat-waitlist">{dashboardStats.waitlistPending}</p>
                        </div>
                        <Mail className="w-10 h-10 text-white" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-zinc-400 text-sm">ADMINS</p>
                          <p className="text-3xl font-bold font-space-grotesk" data-testid="stat-admins">{dashboardStats.adminCount}</p>
                        </div>
                        <Shield className="w-10 h-10 text-white" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
                    <CardHeader>
                      <CardTitle className="font-space-grotesk flex items-center gap-2">
                        <ToggleRight className="w-5 h-5" /> Quick Feature Toggles
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {dashboardStats.featureFlags.map((flag) => (
                        <div key={flag.key} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800">
                          <div>
                            <p className="font-medium text-white">{flag.key.replace(/_/g, " ").toUpperCase()}</p>
                            <p className="text-xs text-zinc-400">{flag.description}</p>
                          </div>
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={(enabled) => toggleFeatureMutation.mutate({ key: flag.key, enabled })}
                            data-testid={`toggle-${flag.key}`}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
                    <CardHeader>
                      <CardTitle className="font-space-grotesk flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dashboardStats.recentLogs.length === 0 ? (
                        <p className="text-zinc-400 text-center py-4">No recent activity</p>
                      ) : (
                        dashboardStats.recentLogs.map((log) => (
                          <div key={log.id} className="p-3 bg-zinc-900 border border-zinc-800 text-sm">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="bg-zinc-800 text-white border-white">
                                {log.action.replace(/_/g, " ")}
                              </Badge>
                              <span className="text-xs text-zinc-500">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {log.targetType && (
                              <p className="text-zinc-400 mt-1">
                                {log.targetType}: {log.targetId}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="flags">
            <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
              <CardHeader>
                <CardTitle className="font-space-grotesk">FEATURE FLAGS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingStats ? (
                  <p className="text-center py-8 text-zinc-400">Loading feature flags...</p>
                ) : !dashboardStats?.featureFlags || dashboardStats.featureFlags.length === 0 ? (
                  <p className="text-center py-8 text-zinc-400">No feature flags found</p>
                ) : (
                  dashboardStats.featureFlags.map((flag) => (
                    <div key={flag.key} className="flex items-center justify-between p-4 bg-zinc-900 border-2 border-zinc-700" data-testid={`flag-row-${flag.key}`}>
                      <div className="flex-1">
                        <p className="font-bold text-white font-space-grotesk">{flag.key.replace(/_/g, " ").toUpperCase()}</p>
                        <p className="text-sm text-zinc-400">{flag.description || "No description"}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={flag.enabled ? "default" : "secondary"} className={flag.enabled ? "bg-white text-black" : "bg-zinc-700"}>
                          {flag.enabled ? "ENABLED" : "DISABLED"}
                        </Badge>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(enabled) => toggleFeatureMutation.mutate({ key: flag.key, enabled })}
                          data-testid={`toggle-flag-${flag.key}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waitlist">
            <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-space-grotesk">WAITLIST MANAGEMENT</CardTitle>
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/waitlist"] })}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingWaitlist ? (
                  <p className="text-center py-8 text-zinc-400">Loading waitlist...</p>
                ) : waitlist.length === 0 ? (
                  <p className="text-center py-8 text-zinc-400">No waitlist entries</p>
                ) : (
                  <div className="space-y-3">
                    {waitlist.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 bg-zinc-900 border-2 border-zinc-700" data-testid={`waitlist-entry-${entry.id}`}>
                        <div>
                          <p className="font-bold text-white">{entry.email}</p>
                          {entry.name && <p className="text-sm text-zinc-400">{entry.name}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={
                              entry.status === "approved" ? "bg-white text-black border-white" :
                              entry.status === "rejected" ? "bg-zinc-700 text-white border-zinc-500" :
                              "bg-zinc-800 text-white border-white"
                            }>
                              {entry.status.toUpperCase()}
                            </Badge>
                            {entry.source && <span className="text-xs text-zinc-500">Source: {entry.source}</span>}
                          </div>
                        </div>
                        {entry.status === "pending" && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-white text-black hover:bg-zinc-200 border-2 border-white"
                              onClick={() => approveWaitlistMutation.mutate(entry.id)}
                              disabled={approveWaitlistMutation.isPending}
                              data-testid={`approve-${entry.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-zinc-500 text-zinc-400 hover:bg-zinc-800"
                              onClick={() => rejectWaitlistMutation.mutate(entry.id)}
                              disabled={rejectWaitlistMutation.isPending}
                              data-testid={`reject-${entry.id}`}
                            >
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites">
            <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-space-grotesk">INVITE CODES</CardTitle>
                  <Dialog open={showCreateInvite} onOpenChange={setShowCreateInvite}>
                    <DialogTrigger asChild>
                      <Button className="bg-white text-black hover:bg-zinc-200 border-2 border-white" data-testid="button-create-invite">
                        <Plus className="w-4 h-4 mr-2" /> Create Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-950 border-4 border-white">
                      <DialogHeader>
                        <DialogTitle className="font-space-grotesk text-white">CREATE INVITE CODE</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label className="text-white">Code (leave blank to auto-generate)</Label>
                          <Input
                            value={newInviteCode.code}
                            onChange={(e) => setNewInviteCode({ ...newInviteCode, code: e.target.value.toUpperCase() })}
                            placeholder="AUTO-GENERATED"
                            className="bg-zinc-900 border-white text-white"
                            data-testid="input-invite-code"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Max Uses</Label>
                          <Input
                            type="number"
                            value={newInviteCode.maxUses}
                            onChange={(e) => setNewInviteCode({ ...newInviteCode, maxUses: parseInt(e.target.value) || 1 })}
                            className="bg-zinc-900 border-white text-white"
                            data-testid="input-invite-max-uses"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Type</Label>
                          <Select value={newInviteCode.type} onValueChange={(value) => setNewInviteCode({ ...newInviteCode, type: value })}>
                            <SelectTrigger className="bg-zinc-900 border-white text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white">
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                              <SelectItem value="beta">Beta Tester</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          className="w-full bg-white text-black hover:bg-zinc-200"
                          onClick={() => createInviteCodeMutation.mutate(newInviteCode)}
                          disabled={createInviteCodeMutation.isPending}
                          data-testid="button-submit-invite"
                        >
                          Create Invite Code
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCodes ? (
                  <p className="text-center py-8 text-zinc-400">Loading invite codes...</p>
                ) : inviteCodes.length === 0 ? (
                  <p className="text-center py-8 text-zinc-400">No invite codes created yet</p>
                ) : (
                  <div className="space-y-3">
                    {inviteCodes.map((code) => (
                      <div key={code.id} className="flex items-center justify-between p-4 bg-zinc-900 border-2 border-zinc-700" data-testid={`invite-code-${code.id}`}>
                        <div>
                          <p className="font-mono font-bold text-white text-lg">{code.code}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="bg-zinc-800 text-white border-zinc-500">
                              {code.type.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-zinc-400">
                              Used: {code.usedCount}/{code.maxUses || "∞"}
                            </span>
                            {!code.isActive && <Badge className="bg-zinc-700 text-zinc-400">INACTIVE</Badge>}
                          </div>
                        </div>
                        {code.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-500 text-zinc-400 hover:bg-zinc-800"
                            onClick={() => deactivateInviteCodeMutation.mutate(code.id)}
                            disabled={deactivateInviteCodeMutation.isPending}
                            data-testid={`deactivate-${code.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appsumo">
            <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-space-grotesk">APPSUMO CODES</CardTitle>
                  <Dialog open={showCreateAppSumo} onOpenChange={setShowCreateAppSumo}>
                    <DialogTrigger asChild>
                      <Button className="bg-white text-black hover:bg-zinc-200 border-2 border-white" data-testid="button-create-appsumo">
                        <Plus className="w-4 h-4 mr-2" /> Create Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-950 border-4 border-white">
                      <DialogHeader>
                        <DialogTitle className="font-space-grotesk text-white">CREATE APPSUMO CODE</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label className="text-white">Code (leave blank to auto-generate)</Label>
                          <Input
                            value={newAppSumoCode.code}
                            onChange={(e) => setNewAppSumoCode({ ...newAppSumoCode, code: e.target.value.toUpperCase() })}
                            placeholder="APPSUMO-XXXXXXXX"
                            className="bg-zinc-900 border-white text-white"
                            data-testid="input-appsumo-code"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Purchase Email (optional)</Label>
                          <Input
                            type="email"
                            value={newAppSumoCode.purchaseEmail}
                            onChange={(e) => setNewAppSumoCode({ ...newAppSumoCode, purchaseEmail: e.target.value })}
                            placeholder="customer@example.com"
                            className="bg-zinc-900 border-white text-white"
                            data-testid="input-appsumo-email"
                          />
                        </div>
                        <Button
                          className="w-full bg-white text-black hover:bg-zinc-200"
                          onClick={() => createAppSumoCodeMutation.mutate(newAppSumoCode)}
                          disabled={createAppSumoCodeMutation.isPending}
                          data-testid="button-submit-appsumo"
                        >
                          Create AppSumo Code
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAppSumo ? (
                  <p className="text-center py-8 text-zinc-400">Loading AppSumo codes...</p>
                ) : appSumoCodes.length === 0 ? (
                  <p className="text-center py-8 text-zinc-400">No AppSumo codes created yet</p>
                ) : (
                  <div className="space-y-3">
                    {appSumoCodes.map((code) => (
                      <div key={code.id} className="flex items-center justify-between p-4 bg-zinc-900 border-2 border-zinc-700" data-testid={`appsumo-code-${code.id}`}>
                        <div>
                          <p className="font-mono font-bold text-white text-lg">{code.code}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={code.status === "redeemed" ? "bg-white text-black border-white" : "bg-zinc-800 text-white border-zinc-500"}>
                              {code.status.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="bg-zinc-800 text-white border-zinc-500">
                              {code.tier.toUpperCase()}
                            </Badge>
                            {code.purchaseEmail && (
                              <span className="text-sm text-zinc-400">{code.purchaseEmail}</span>
                            )}
                          </div>
                          {code.redeemedAt && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Redeemed: {new Date(code.redeemedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-space-grotesk">ACTIVITY LOGS</CardTitle>
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] })}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <p className="text-center py-8 text-zinc-400">Loading logs...</p>
                ) : adminLogs.length === 0 ? (
                  <p className="text-center py-8 text-zinc-400">No activity logs</p>
                ) : (
                  <div className="space-y-2">
                    {adminLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-zinc-900 border border-zinc-800" data-testid={`log-${log.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-zinc-800 text-white border-white font-mono">
                              {log.action}
                            </Badge>
                            {log.targetType && (
                              <span className="text-sm text-zinc-400">
                                {log.targetType}: {log.targetId}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {log.details && (
                          <pre className="mt-2 text-xs text-zinc-500 bg-zinc-950 p-2 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team-access">
            <TeamAccessPanel />
          </TabsContent>

          <TabsContent value="asset-store">
            <AssetStorePanel />
          </TabsContent>

          <TabsContent value="promo">
            <PromoPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </Layout>
  );
}

function TeamAccessPanel() {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: allSubs = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["/api/admin/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subscriptions");
      if (!res.ok) throw new Error("Failed to load subscriptions");
      return res.json();
    },
  });

  const fullAccessUsers = allSubs.filter((s: any) => s.subscription?.tier === "lifetime" && s.subscription?.status === "active");

  async function handleSearch() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed");
      const users = await res.json();
      const matches = users.filter((u: any) =>
        u.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchEmail.toLowerCase())
      );
      setSearchResults(matches);
    } catch {
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  }

  async function grantFullAccess(userId: string, email: string) {
    setGrantingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "lifetime",
          status: "active",
          entitlements: { export: true, commercial: true, ai: true, batch: true },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Full access granted to ${email}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      setSearchResults([]);
      setSearchEmail("");
    } catch {
      toast.error("Failed to grant access");
    } finally {
      setGrantingId(null);
    }
  }

  async function revokeAccess(userId: string, email: string) {
    setRevokingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "free",
          status: "active",
          entitlements: { export: false, commercial: false, ai: false, batch: false },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Access revoked for ${email}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
    } catch {
      toast.error("Failed to revoke access");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
        <CardHeader>
          <CardTitle className="font-space-grotesk flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> GRANT FULL ACCESS
          </CardTitle>
          <p className="text-sm text-zinc-400">Search by email or name to give someone lifetime all-access (no payment needed)</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Search by email or name..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-zinc-900 border-2 border-zinc-700 text-white flex-1"
              data-testid="input-team-search"
            />
            <Button
              onClick={handleSearch}
              disabled={searching || !searchEmail.trim()}
              className="bg-white text-black hover:bg-zinc-200 border-2 border-white font-bold"
              data-testid="button-team-search"
            >
              <Search className="w-4 h-4 mr-2" /> {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((user: any) => {
                const existingSub = allSubs.find((s: any) => s.userId === user.id);
                const hasFullAccess = existingSub?.subscription?.tier === "lifetime" && existingSub?.subscription?.status === "active";
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-zinc-900 border-2 border-zinc-700" data-testid={`team-result-${user.id}`}>
                    <div>
                      <p className="font-bold text-white">{user.name || "No name"}</p>
                      <p className="text-sm text-zinc-400">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${user.role === "admin" ? "border-amber-400 text-amber-400" : "border-zinc-600 text-zinc-400"}`}>
                          {user.role}
                        </Badge>
                        {existingSub && (
                          <Badge variant="outline" className={`text-xs ${hasFullAccess ? "border-emerald-400 text-emerald-400" : "border-zinc-600 text-zinc-400"}`}>
                            {existingSub.subscription?.tier || "free"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {hasFullAccess ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500">
                        <Check className="w-3 h-3 mr-1" /> Full Access
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => grantFullAccess(user.id, user.email)}
                        disabled={grantingId === user.id}
                        className="bg-emerald-500 text-black hover:bg-emerald-400 font-bold border-2 border-emerald-400"
                        data-testid={`button-grant-${user.id}`}
                      >
                        <Crown className="w-4 h-4 mr-2" /> {grantingId === user.id ? "Granting..." : "Grant Full Access"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {searchResults.length === 0 && searchEmail && !searching && (
            <p className="mt-4 text-center text-zinc-500 text-sm">No results. Try searching by email or name.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-4 border-white shadow-[6px_6px_0_#fff]">
        <CardHeader>
          <CardTitle className="font-space-grotesk flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" /> CURRENT FULL ACCESS USERS
          </CardTitle>
          <p className="text-sm text-zinc-400">{fullAccessUsers.length} user{fullAccessUsers.length !== 1 ? "s" : ""} with lifetime all-access</p>
        </CardHeader>
        <CardContent>
          {loadingSubs ? (
            <p className="text-center py-4 text-zinc-400">Loading...</p>
          ) : fullAccessUsers.length === 0 ? (
            <p className="text-center py-4 text-zinc-500">No full access users yet</p>
          ) : (
            <div className="space-y-2">
              {fullAccessUsers.map((sub: any) => (
                <div key={sub.userId} className="flex items-center justify-between p-4 bg-zinc-900 border-2 border-zinc-700" data-testid={`team-user-${sub.userId}`}>
                  <div>
                    <p className="font-bold text-white">{sub.name || "Unknown"}</p>
                    <p className="text-sm text-zinc-400">{sub.email}</p>
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-400 mt-1">
                      LIFETIME
                    </Badge>
                  </div>
                  <Button
                    onClick={() => revokeAccess(sub.userId, sub.email)}
                    disabled={revokingId === sub.userId}
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white font-bold"
                    data-testid={`button-revoke-${sub.userId}`}
                  >
                    <X className="w-4 h-4 mr-2" /> {revokingId === sub.userId ? "Revoking..." : "Revoke"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface PlatformAssetData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  tags: string[] | null;
  priceInCents: number;
  isFree: boolean;
  isActive: boolean;
  downloadCount: number;
  sourceType: string;
  rightsClass: string;
  usageMode: string;
  downloadAllowed: boolean;
  publishAllowed: boolean;
  editableByUser: boolean;
  unlockType: string;
  xpRequired: number;
  allowedOutputs: string[] | null;
  schoolSafe: boolean;
  licenseNotes: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

const ASSET_CATEGORIES = ["general", "characters", "backgrounds", "effects", "ui", "audio", "fonts", "templates", "stickers", "borders"];
const ASSET_TYPES = ["image", "audio", "video", "font", "template", "svg", "sprite-sheet"];
const SOURCE_TYPES = ["original", "licensed-restricted", "creator-owned", "system-only", "xp-unlockable", "premium-paid", "admin-only"];
const RIGHTS_CLASSES = ["safe-redistributable", "system-use-only", "embedded-output-only", "creator-owned", "restricted-commercial", "internal-testing"];
const USAGE_MODES = ["preview-only", "system-use-only", "system-use-and-export", "publish-only", "downloadable", "admin-only"];
const UNLOCK_TYPES = ["free", "xp", "premium", "hybrid", "founders-pass"];
const ALLOWED_OUTPUT_OPTIONS = ["comic", "hop", "vn", "cyoa", "card", "motion", "cover"];

type AssetFormData = {
  name: string;
  description: string;
  category: string;
  type: string;
  fileUrl: string;
  thumbnailUrl: string;
  tags: string[];
  priceInCents: number;
  isFree: boolean;
  isActive: boolean;
  sourceType: string;
  rightsClass: string;
  usageMode: string;
  downloadAllowed: boolean;
  publishAllowed: boolean;
  editableByUser: boolean;
  unlockType: string;
  xpRequired: number;
  allowedOutputs: string[];
  schoolSafe: boolean;
  licenseNotes: string;
};

const emptyAssetForm = (): AssetFormData => ({
  name: "",
  description: "",
  category: "general",
  type: "image",
  fileUrl: "",
  thumbnailUrl: "",
  tags: [],
  priceInCents: 0,
  isFree: true,
  isActive: true,
  sourceType: "original",
  rightsClass: "safe-redistributable",
  usageMode: "system-use-and-export",
  downloadAllowed: false,
  publishAllowed: true,
  editableByUser: false,
  unlockType: "free",
  xpRequired: 0,
  allowedOutputs: [],
  schoolSafe: true,
  licenseNotes: "",
});

function AssetStorePanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PlatformAssetData | null>(null);
  const [form, setForm] = useState(emptyAssetForm());
  const [bulkJson, setBulkJson] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");

  const { data: assets = [], isLoading } = useQuery<PlatformAssetData[]>({
    queryKey: ["/api/admin/platform-assets", filterCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/platform-assets?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load assets");
      return res.json();
    },
  });

  const createAsset = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/platform-assets", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-assets"] }); setShowAdd(false); setForm(emptyAssetForm()); toast.success("Asset created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAsset = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/platform-assets/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-assets"] }); setEditingAsset(null); toast.success("Asset updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-assets/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-assets"] }); toast.success("Asset deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkCreate = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await fetch("/api/admin/platform-assets/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ assets: items }) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-assets"] }); setShowBulk(false); setBulkJson(""); toast.success(`${data.created} assets created`); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/admin/platform-assets/bulk/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ids }) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-assets"] }); setSelectedIds(new Set()); toast.success(`${data.deleted} assets deleted`); },
    onError: (e: any) => toast.error(e.message),
  });

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !(form.tags || []).includes(t)) {
      setForm(f => ({ ...f, tags: [...(f.tags || []), t] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === assets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(assets.map(a => a.id)));
  };

  const handleSubmitCreate = () => {
    if (!form.name || !form.fileUrl) { toast.error("Name and File URL are required"); return; }
    createAsset.mutate({ ...form, priceInCents: form.isFree ? 0 : form.priceInCents });
  };

  const handleSubmitUpdate = () => {
    if (!editingAsset) return;
    updateAsset.mutate({ id: editingAsset.id, data: { ...form, priceInCents: form.isFree ? 0 : form.priceInCents } });
  };

  const handleBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      if (items.length === 0) { toast.error("No items found"); return; }
      const hasRequired = items.every((i: any) => i.name && i.fileUrl);
      if (!hasRequired) { toast.error("Each item needs at least name and fileUrl"); return; }
      bulkCreate.mutate(items);
    } catch { toast.error("Invalid JSON format"); }
  };

  const startEdit = (asset: PlatformAssetData) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      description: asset.description || "",
      category: asset.category,
      type: asset.type,
      fileUrl: asset.fileUrl,
      thumbnailUrl: asset.thumbnailUrl || "",
      tags: asset.tags || [],
      priceInCents: asset.priceInCents,
      isFree: asset.isFree,
      isActive: asset.isActive,
      sourceType: asset.sourceType || "original",
      rightsClass: asset.rightsClass || "safe-redistributable",
      usageMode: asset.usageMode || "system-use-and-export",
      downloadAllowed: asset.downloadAllowed ?? false,
      publishAllowed: asset.publishAllowed ?? true,
      editableByUser: asset.editableByUser ?? false,
      unlockType: asset.unlockType || "free",
      xpRequired: asset.xpRequired || 0,
      allowedOutputs: asset.allowedOutputs || [],
      schoolSafe: asset.schoolSafe ?? true,
      licenseNotes: asset.licenseNotes || "",
    });
  };

  const AssetForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Name *</Label>
          <Input className="bg-zinc-900 border-zinc-700" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-asset-name" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Category</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700" data-testid="select-asset-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-zinc-400 text-xs uppercase tracking-wider">Description</Label>
        <Textarea className="bg-zinc-900 border-zinc-700 min-h-[60px]" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-asset-description" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">File URL *</Label>
          <Input className="bg-zinc-900 border-zinc-700" value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." data-testid="input-asset-file-url" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Thumbnail URL</Label>
          <Input className="bg-zinc-900 border-zinc-700" value={form.thumbnailUrl || ""} onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="https://..." data-testid="input-asset-thumbnail" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Type</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700" data-testid="select-asset-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Tags</Label>
          <div className="flex gap-2">
            <Input className="bg-zinc-900 border-zinc-700 flex-1" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add tag..." data-testid="input-asset-tag" />
            <Button variant="outline" onClick={addTag} className="border-zinc-700 shrink-0">+</Button>
          </div>
          {(form.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(form.tags || []).map(t => (
                <Badge key={t} variant="outline" className="border-zinc-600 text-zinc-300 cursor-pointer hover:border-red-500 hover:text-red-400" onClick={() => removeTag(t)}>{t} x</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-2 border-zinc-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Pricing</Label>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${form.isFree ? "text-green-400" : "text-zinc-500"}`}>FREE</span>
            <Switch checked={!form.isFree} onCheckedChange={v => setForm(f => ({ ...f, isFree: !v, priceInCents: !v ? 0 : f.priceInCents }))} data-testid="switch-asset-paid" />
            <span className={`text-xs ${!form.isFree ? "text-amber-400" : "text-zinc-500"}`}>PAID</span>
          </div>
        </div>
        {!form.isFree && (
          <div>
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Price (cents)</Label>
            <Input type="number" className="bg-zinc-900 border-zinc-700 w-40" value={form.priceInCents} onChange={e => setForm(f => ({ ...f, priceInCents: parseInt(e.target.value) || 0 }))} min={0} data-testid="input-asset-price" />
            <p className="text-xs text-zinc-500 mt-1">${((form.priceInCents || 0) / 100).toFixed(2)} USD</p>
          </div>
        )}
      </div>
      <div className="border-2 border-zinc-800 p-4 space-y-3">
        <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Rights & Governance</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Source Type</Label>
            <Select value={form.sourceType} onValueChange={v => setForm(f => ({ ...f, sourceType: v }))}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700" data-testid="select-asset-source-type"><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Rights Class</Label>
            <Select value={form.rightsClass} onValueChange={v => setForm(f => ({ ...f, rightsClass: v }))}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700" data-testid="select-asset-rights-class"><SelectValue /></SelectTrigger>
              <SelectContent>{RIGHTS_CLASSES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Usage Mode</Label>
            <Select value={form.usageMode} onValueChange={v => setForm(f => ({ ...f, usageMode: v }))}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700" data-testid="select-asset-usage-mode"><SelectValue /></SelectTrigger>
              <SelectContent>{USAGE_MODES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Unlock Type</Label>
            <Select value={form.unlockType} onValueChange={v => setForm(f => ({ ...f, unlockType: v }))}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700" data-testid="select-asset-unlock-type"><SelectValue /></SelectTrigger>
              <SelectContent>{UNLOCK_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {(form.unlockType === "xp" || form.unlockType === "hybrid") && (
          <div>
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">XP Required</Label>
            <Input type="number" className="bg-zinc-900 border-zinc-700 w-40" value={form.xpRequired} onChange={e => setForm(f => ({ ...f, xpRequired: parseInt(e.target.value) || 0 }))} min={0} data-testid="input-asset-xp" />
          </div>
        )}
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">Allowed Outputs</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ALLOWED_OUTPUT_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={() => setForm(f => {
                const has = f.allowedOutputs.includes(opt);
                return { ...f, allowedOutputs: has ? f.allowedOutputs.filter(o => o !== opt) : [...f.allowedOutputs, opt] };
              })} className={`px-2 py-1 text-[10px] border transition ${form.allowedOutputs.includes(opt) ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>{opt}</button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">Leave empty = all outputs allowed</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={form.downloadAllowed} onCheckedChange={v => setForm(f => ({ ...f, downloadAllowed: v }))} data-testid="switch-download-allowed" />
            <span className="text-xs text-zinc-300">Download Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.publishAllowed} onCheckedChange={v => setForm(f => ({ ...f, publishAllowed: v }))} data-testid="switch-publish-allowed" />
            <span className="text-xs text-zinc-300">Publish Allowed</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={form.editableByUser} onCheckedChange={v => setForm(f => ({ ...f, editableByUser: v }))} data-testid="switch-editable" />
            <span className="text-xs text-zinc-300">Editable by User</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.schoolSafe} onCheckedChange={v => setForm(f => ({ ...f, schoolSafe: v }))} data-testid="switch-school-safe" />
            <span className="text-xs text-zinc-300">School Safe</span>
          </div>
        </div>
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">License Notes</Label>
          <Textarea className="bg-zinc-900 border-zinc-700 min-h-[40px] text-xs" value={form.licenseNotes} onChange={e => setForm(f => ({ ...f, licenseNotes: e.target.value }))} placeholder="License info, restrictions, attribution..." data-testid="input-license-notes" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-asset-active" />
        <span className="text-sm text-zinc-300">{form.isActive ? "Active (visible in store)" : "Inactive (hidden)"}</span>
      </div>
      {form.fileUrl && (form.type === "image" || form.type === "svg" || form.type === "sprite-sheet") && (
        <div className="border-2 border-zinc-800 p-2">
          <p className="text-xs text-zinc-500 mb-1">Preview</p>
          <img src={form.thumbnailUrl || form.fileUrl} alt="preview" className="max-h-32 object-contain rounded" />
        </div>
      )}
      <Button onClick={onSubmit} className="w-full bg-white text-black hover:bg-zinc-200 font-bold" data-testid="button-submit-asset">{submitLabel}</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input className="bg-zinc-900 border-zinc-700 pl-10 w-64" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-assets" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 w-40" data-testid="select-filter-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="border-zinc-600 text-zinc-300">{assets.length} assets</Badge>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white font-bold" onClick={() => { if (confirm(`Delete ${selectedIds.size} selected assets?`)) bulkDelete.mutate([...selectedIds]); }} data-testid="button-bulk-delete">
              <Trash2 className="w-4 h-4 mr-2" /> Delete {selectedIds.size}
            </Button>
          )}
          <Dialog open={showBulk} onOpenChange={v => { setShowBulk(v); if (!v) setBulkJson(""); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black font-bold" data-testid="button-bulk-add">
                <Upload className="w-4 h-4 mr-2" /> Bulk Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-2 border-white max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-bold text-xl tracking-tight">BULK ADD ASSETS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Paste a JSON array of assets. Each object needs at least <code className="bg-zinc-800 px-1 text-xs">name</code> and <code className="bg-zinc-800 px-1 text-xs">fileUrl</code>.</p>
                <Textarea className="bg-zinc-900 border-zinc-700 min-h-[200px] font-mono text-xs" value={bulkJson} onChange={e => setBulkJson(e.target.value)} placeholder={`[\n  {\n    "name": "Cool BG Pack",\n    "fileUrl": "https://...",\n    "category": "backgrounds",\n    "type": "image",\n    "isFree": true\n  },\n  ...\n]`} data-testid="textarea-bulk-json" />
                <Button onClick={handleBulkImport} disabled={!bulkJson.trim() || bulkCreate.isPending} className="w-full bg-white text-black hover:bg-zinc-200 font-bold" data-testid="button-submit-bulk">
                  {bulkCreate.isPending ? "Importing..." : "Import Assets"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) { setForm(emptyAssetForm()); setTagInput(""); } }}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-zinc-200 font-bold" data-testid="button-add-asset">
                <Plus className="w-4 h-4 mr-2" /> Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-2 border-white max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-bold text-xl tracking-tight">ADD ASSET</DialogTitle>
              </DialogHeader>
              <AssetForm onSubmit={handleSubmitCreate} submitLabel={createAsset.isPending ? "Creating..." : "Create Asset"} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-400">Loading assets...</div>
      ) : assets.length === 0 ? (
        <Card className="bg-zinc-950 border-2 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-400 font-bold">No assets yet</p>
            <p className="text-zinc-600 text-sm mt-1">Add your first asset to get the store started.</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={selectedIds.size === assets.length && assets.length > 0} onChange={selectAll} className="accent-white w-4 h-4" data-testid="checkbox-select-all" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Select All</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {assets.map(asset => (
              <Card key={asset.id} className={`bg-zinc-950 border-2 ${selectedIds.has(asset.id) ? "border-white" : "border-zinc-800"} transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelect(asset.id)} className="accent-white w-4 h-4 mt-1 shrink-0" data-testid={`checkbox-asset-${asset.id}`} />
                    {(asset.thumbnailUrl || asset.fileUrl) && (asset.type === "image" || asset.type === "svg" || asset.type === "sprite-sheet") && (
                      <img src={asset.thumbnailUrl || asset.fileUrl} alt={asset.name} className="w-16 h-16 object-cover border-2 border-zinc-700 rounded shrink-0" />
                    )}
                    {(asset.type !== "image" && asset.type !== "svg" && asset.type !== "sprite-sheet") && (
                      <div className="w-16 h-16 bg-zinc-900 border-2 border-zinc-700 rounded flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-zinc-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm truncate">{asset.name}</h3>
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-[10px]">{asset.category}</Badge>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px]">{asset.type}</Badge>
                        {asset.isFree ? (
                          <Badge className="bg-green-900/50 text-green-400 border border-green-700 text-[10px]">FREE</Badge>
                        ) : (
                          <Badge className="bg-amber-900/50 text-amber-400 border border-amber-700 text-[10px]">${(asset.priceInCents / 100).toFixed(2)}</Badge>
                        )}
                        {!asset.isActive && (
                          <Badge className="bg-red-900/50 text-red-400 border border-red-700 text-[10px]">HIDDEN</Badge>
                        )}
                        {!asset.schoolSafe && (
                          <Badge className="bg-orange-900/50 text-orange-400 border border-orange-700 text-[10px]">18+</Badge>
                        )}
                      </div>
                      {asset.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{asset.description}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 border border-zinc-700">{asset.sourceType}</span>
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 border border-zinc-700">{asset.rightsClass}</span>
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 border border-zinc-700">{asset.usageMode}</span>
                        {asset.unlockType !== "free" && (
                          <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 border border-purple-800">{asset.unlockType}{asset.xpRequired > 0 ? ` (${asset.xpRequired} XP)` : ""}</span>
                        )}
                        {asset.downloadAllowed && <span className="text-[9px] bg-cyan-900/30 text-cyan-400 px-1 border border-cyan-800">DL</span>}
                        {!asset.publishAllowed && <span className="text-[9px] bg-red-900/30 text-red-400 px-1 border border-red-800">NO PUB</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                        <span><Download className="w-3 h-3 inline mr-1" />{asset.downloadCount} downloads</span>
                        <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                        {(asset.tags || []).length > 0 && <span>{(asset.tags || []).join(", ")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-zinc-800" onClick={() => {
                        updateAsset.mutate({ id: asset.id, data: { isActive: !asset.isActive } });
                      }} data-testid={`button-toggle-${asset.id}`}>
                        {asset.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-zinc-600" />}
                      </Button>
                      <Dialog open={editingAsset?.id === asset.id} onOpenChange={v => { if (!v) { setEditingAsset(null); setForm(emptyAssetForm()); setTagInput(""); } }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-zinc-800" onClick={() => startEdit(asset)} data-testid={`button-edit-${asset.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-950 border-2 border-white max-w-lg max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="font-bold text-xl tracking-tight">EDIT ASSET</DialogTitle>
                          </DialogHeader>
                          <AssetForm onSubmit={handleSubmitUpdate} submitLabel={updateAsset.isPending ? "Updating..." : "Update Asset"} />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-900" onClick={() => { if (confirm(`Delete "${asset.name}"?`)) deleteAsset.mutate(asset.id); }} data-testid={`button-delete-${asset.id}`}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PromoPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"pending_review" | "approved" | "rejected" | "all">("pending_review");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<PromoTemplate[]>({
    queryKey: ["admin-promo-templates", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/promo/admin/templates" : `/api/promo/admin/templates?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load templates");
      return res.json();
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: "approve" | "reject"; notes?: string }) => {
      const res = await fetch(`/api/promo/templates/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "approve" ? "approved" : "rejected",
          notes: notes || "",
          ...(action === "approve" ? { isSchoolSafe: true } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to ${action}`);
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "approve" ? "Template approved" : "Template rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-promo-templates"] });
    },
    onError: (err: any) => toast.error(err?.message || "Moderation failed"),
  });

  const toggleSchoolSafe = useMutation({
    mutationFn: async ({ id, isSchoolSafe }: { id: string; isSchoolSafe: boolean }) => {
      const res = await fetch(`/api/promo/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSchoolSafe }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["admin-promo-templates"] });
    },
    onError: () => toast.error("Update failed"),
  });

  const previewTpl = templates.find(t => t.id === previewId) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">PROMO PAGES MODERATION</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Review user-submitted promo templates. Only approved + school-safe templates appear to students.
            Sponsor templates require both <code className="text-amber-400">promo_sponsors_enabled</code> and approval.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white" data-testid="select-promo-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-zinc-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded">
          No templates in this status.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {templates.map(t => {
            const meta = PROMO_TYPE_META[t.type];
            return (
              <Card key={t.id} className="bg-zinc-950 border-zinc-800" data-testid={`card-promo-${t.id}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="aspect-[8.5/11] bg-zinc-800 overflow-hidden border border-zinc-700">
                    <div className="w-full h-full origin-top-left">
                      <PromoPageRenderer template={t} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate">{t.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <Badge variant="outline" className="text-[9px] border-zinc-700">{meta.label}</Badge>
                      <Badge variant="outline" className={`text-[9px] ${t.status === "approved" ? "border-green-700 text-green-400" : t.status === "rejected" ? "border-red-700 text-red-400" : "border-amber-700 text-amber-400"}`}>{t.status}</Badge>
                      {t.isSchoolSafe && <Badge variant="outline" className="text-[9px] border-cyan-700 text-cyan-400">school-safe</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] hover:bg-zinc-800" onClick={() => setPreviewId(t.id)} data-testid={`button-preview-${t.id}`}>
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </Button>
                    {t.status !== "approved" && (
                      <Button size="sm" className="h-7 text-[11px] bg-green-700 hover:bg-green-600" onClick={() => moderate.mutate({ id: t.id, action: "approve" })} data-testid={`button-approve-${t.id}`}>
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    {t.status !== "rejected" && (
                      <Button size="sm" className="h-7 text-[11px] bg-red-700 hover:bg-red-600" onClick={() => {
                        const notes = prompt("Rejection notes (shown to creator):") || "";
                        moderate.mutate({ id: t.id, action: "reject", notes });
                      }} data-testid={`button-reject-${t.id}`}>
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-[11px] border-zinc-700" onClick={() => toggleSchoolSafe.mutate({ id: t.id, isSchoolSafe: !t.isSchoolSafe })} data-testid={`button-school-safe-${t.id}`}>
                      {t.isSchoolSafe ? "Mark not school-safe" : "Mark school-safe"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewTpl} onOpenChange={(v) => !v && setPreviewId(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{previewTpl?.title}</DialogTitle>
          </DialogHeader>
          {previewTpl && (
            <div className="aspect-[8.5/11] border border-zinc-700">
              <PromoPageRenderer template={previewTpl} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
