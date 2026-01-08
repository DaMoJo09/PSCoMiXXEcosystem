import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Shield, Users, Mail, Key, Gift, Settings, Activity, 
  ToggleLeft, ToggleRight, Check, X, Plus, Trash2, 
  Download, RefreshCw, Clock, ChevronDown, ChevronRight
} from "lucide-react";
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-zinc-950 border-4 border-white shadow-[8px_8px_0_#fff]">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-white mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white font-space-grotesk mb-2">ACCESS DENIED</h1>
            <p className="text-zinc-400">Admin privileges required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-inter p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
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
                {dashboardStats?.featureFlags.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between p-4 bg-zinc-900 border-2 border-zinc-700">
                    <div className="flex-1">
                      <p className="font-bold text-white font-space-grotesk">{flag.key}</p>
                      <p className="text-sm text-zinc-400">{flag.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={flag.enabled ? "default" : "secondary"} className={flag.enabled ? "bg-white text-black" : "bg-zinc-700"}>
                        {flag.enabled ? "ENABLED" : "DISABLED"}
                      </Badge>
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(enabled) => toggleFeatureMutation.mutate({ key: flag.key, enabled })}
                      />
                    </div>
                  </div>
                ))}
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
        </Tabs>
      </div>
    </div>
  );
}
