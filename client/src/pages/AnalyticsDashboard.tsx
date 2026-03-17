import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Users, TrendingUp, DollarSign, Zap, Heart,
  Activity, Target, BookOpen, ShoppingCart, Brain, Shield,
  ArrowUp, ArrowDown, Minus, Clock, Star, Layers,
  Eye, MessageSquare, ThumbsUp, Share2, Award, Gauge
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, Legend
} from "recharts";

const COLORS = ["#9945FF", "#14F195", "#FF4D8D", "#FFD700", "#00BFFF", "#FF6B35", "#4ECDC4", "#F7DC6F", "#BB86FC"];

function MetricCard({ label, value, subtext, trend, icon: Icon, color = "white", large = false }: {
  label: string; value: string | number; subtext?: string; trend?: string; icon: any; color?: string; large?: boolean;
}) {
  const trendColor = trend?.startsWith("+") || trend?.startsWith("↑") ? "text-green-400" : trend?.startsWith("-") || trend?.startsWith("↓") ? "text-red-400" : "text-zinc-500";
  return (
    <div className={`bg-zinc-900 border border-zinc-800 p-4 ${large ? "col-span-2" : ""}`} data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
        <Icon className={`w-4 h-4 opacity-40`} style={{ color }} />
      </div>
      <div className="text-2xl font-display font-bold text-white">{value}</div>
      {subtext && <p className="text-[10px] text-zinc-500 mt-1">{subtext}</p>}
      {trend && <span className={`text-[10px] font-bold ${trendColor} mt-1 block`}>{trend}</span>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, color }: { title: string; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
      <div className="w-8 h-8 flex items-center justify-center border" style={{ borderColor: color, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-lg font-display font-bold uppercase tracking-wider" style={{ color }}>{title}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.2 }} />
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "growth" | "engagement" | "content" | "revenue" | "ai" | "health">("overview");

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["/api/analytics/platform"],
    enabled: user?.role === "admin",
    refetchInterval: 60000,
  });

  if (!user || user.role !== "admin") {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-display font-bold mb-2">Admin Access Required</h1>
            <p className="text-zinc-500">This dashboard is restricted to platform administrators.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-display font-bold">Platform Analytics</h1>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !analytics) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6 text-center">
          <p className="text-red-400">Failed to load analytics data.</p>
        </div>
      </Layout>
    );
  }

  const d = analytics as any;

  const tabs = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "growth", label: "Growth", icon: TrendingUp },
    { id: "engagement", label: "Engagement", icon: Heart },
    { id: "content", label: "Content", icon: BookOpen },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "ai", label: "AI & Platform", icon: Brain },
    { id: "health", label: "User Health", icon: Activity },
  ] as const;

  const signupData = Object.entries(d.growth?.userSignupTimeline || {}).map(([month, count]) => ({ month, users: count })).slice(-12);
  const projectData = Object.entries(d.content?.projectCreationTimeline || {}).map(([month, count]) => ({ month, projects: count })).slice(-12);
  const projectTypeData = Object.entries(d.content?.projectsByType || {}).map(([type, count]) => ({ name: type, value: count }));
  const tierData = Object.entries(d.revenue?.subscriptionsByTier || {}).map(([tier, count]) => ({ name: tier, value: count }));
  const levelData = Object.entries(d.userHealth?.levelDistribution || {}).map(([bucket, count]) => ({ name: `Lvl ${bucket}`, value: count }));
  const classData = Object.entries(d.userHealth?.creatorClassDistribution || {}).map(([cls, count]) => ({ name: cls, value: count }));
  const engagementTypeData = Object.entries(d.engagement?.engagementByType || {}).map(([type, count]) => ({ name: type, value: count }));
  const statusData = Object.entries(d.content?.projectsByStatus || {}).map(([status, count]) => ({ name: status, value: count }));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4 md:p-6" data-testid="analytics-dashboard">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 border border-purple-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold" data-testid="text-analytics-title">Platform Analytics & KPIs</h1>
              <p className="text-[10px] text-zinc-500 font-mono">Last updated: {new Date(d.generatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-600"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            <SectionHeader title="Key Performance Indicators" icon={Target} color="#9945FF" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Total Users" value={d.growth?.totalUsers?.toLocaleString() || 0} icon={Users} color="#9945FF" subtext={`+${d.growth?.usersLast7d || 0} this week`} />
              <MetricCard label="DAU / MAU" value={`${d.engagement?.dauMauRatio || 0}%`} icon={Activity} color="#14F195" subtext="Stickiness ratio" />
              <MetricCard label="Activation Rate" value={`${d.engagement?.activationRate || 0}%`} icon={Target} color="#FFD700" subtext="Users who created a project" />
              <MetricCard label="30-Day Retention" value={`${d.engagement?.day30Retention || 0}%`} icon={Heart} color="#FF4D8D" subtext="Return after signup" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Total Projects" value={d.content?.totalProjects?.toLocaleString() || 0} icon={Layers} color="#00BFFF" subtext={`+${d.content?.projectsLast7d || 0} this week`} />
              <MetricCard label="Publish Rate" value={`${d.content?.publishRate || 0}%`} icon={BookOpen} color="#4ECDC4" subtext="Draft to published" />
              <MetricCard label="Paid Conversion" value={`${d.revenue?.conversionRate || 0}%`} icon={DollarSign} color="#14F195" subtext={`${d.revenue?.paidSubscriptions || 0} paid users`} />
              <MetricCard label="AI Adoption" value={`${d.aiPlatform?.aiAdoptionRate || 0}%`} icon={Brain} color="#BB86FC" subtext={`${d.aiPlatform?.uniqueAIUsers || 0} unique AI users`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Content Velocity" value={`${d.content?.contentVelocity || 0}`} icon={Zap} color="#FF6B35" subtext="Projects per active user (30d)" />
              <MetricCard label="Cross-Tool Adoption" value={`${d.userHealth?.crossToolAdoption || 0}%`} icon={Layers} color="#F7DC6F" subtext="Users with 2+ project types" />
              <MetricCard label="Power Creators" value={d.userHealth?.powerCreators || 0} icon={Star} color="#FFD700" subtext="300+ mins & 1000+ XP" />
              <MetricCard label="At-Risk Users" value={d.userHealth?.atRiskUsers || 0} icon={Activity} color="#FF4D8D" subtext="Active history, 30d inactive" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">User Growth (Monthly)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={signupData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" tick={{ fill: "#666", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                    <Area type="monotone" dataKey="users" stroke="#9945FF" fill="#9945FF" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Projects by Type</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={projectTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {projectTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === "growth" && (
          <>
            <SectionHeader title="Growth Metrics" icon={TrendingUp} color="#14F195" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Total Users" value={d.growth?.totalUsers?.toLocaleString() || 0} icon={Users} color="#14F195" />
              <MetricCard label="Students" value={d.growth?.studentUsers || 0} icon={Users} color="#9945FF" subtext="Ages 6-17" />
              <MetricCard label="Creators" value={d.growth?.creatorUsers || 0} icon={Users} color="#00BFFF" subtext="Ages 18+" />
              <MetricCard label="Admins" value={d.growth?.adminUsers || 0} icon={Shield} color="#FFD700" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <MetricCard label="New Users (7d)" value={d.growth?.usersLast7d || 0} icon={ArrowUp} color="#14F195" />
              <MetricCard label="New Users (30d)" value={d.growth?.usersLast30d || 0} icon={ArrowUp} color="#14F195" />
              <MetricCard label="Growth Rate (30d)" value={`${d.growth?.userGrowthRate || "N/A"}%`} icon={TrendingUp} color="#14F195" subtext="vs. previous 30 days" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4">
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">User Signup Timeline</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={signupData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" tick={{ fill: "#666", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                  <Bar dataKey="users" fill="#14F195" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeTab === "engagement" && (
          <>
            <SectionHeader title="Engagement & Retention" icon={Heart} color="#FF4D8D" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="DAU (Today)" value={d.engagement?.dau || 0} icon={Activity} color="#FF4D8D" />
              <MetricCard label="WAU (7d)" value={d.engagement?.wau || 0} icon={Activity} color="#FF4D8D" />
              <MetricCard label="MAU (30d)" value={d.engagement?.mau || 0} icon={Activity} color="#FF4D8D" />
              <MetricCard label="DAU/MAU Ratio" value={`${d.engagement?.dauMauRatio || 0}%`} icon={Gauge} color="#14F195" subtext="Target: >20% for creative tools" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Avg Time Spent" value={`${d.engagement?.avgTimeSpentMinutes || 0} min`} icon={Clock} color="#FFD700" subtext="Per user (lifetime)" />
              <MetricCard label="Total Platform Hours" value={`${Math.round((d.engagement?.totalPlatformMinutes || 0) / 60).toLocaleString()}`} icon={Clock} color="#FFD700" />
              <MetricCard label="Avg XP / User" value={d.engagement?.avgXpPerUser?.toLocaleString() || 0} icon={Star} color="#9945FF" />
              <MetricCard label="Activation Rate" value={`${d.engagement?.activationRate || 0}%`} icon={Target} color="#14F195" subtext="Created at least 1 project" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <MetricCard label="30-Day Retention" value={`${d.engagement?.day30Retention || 0}%`} icon={Heart} color="#FF4D8D" subtext="Industry avg: 15-25%" />
              <MetricCard label="Engagement Events (7d)" value={d.engagement?.engagementLast7d?.toLocaleString() || 0} icon={Eye} color="#00BFFF" />
              <MetricCard label="Engagement Events (30d)" value={d.engagement?.engagementLast30d?.toLocaleString() || 0} icon={Eye} color="#00BFFF" />
            </div>
            {engagementTypeData.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Engagement by Type</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={engagementTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" tick={{ fill: "#666", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#666", fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                    <Bar dataKey="value" fill="#FF4D8D" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {activeTab === "content" && (
          <>
            <SectionHeader title="Content Production" icon={BookOpen} color="#00BFFF" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Total Projects" value={d.content?.totalProjects?.toLocaleString() || 0} icon={Layers} color="#00BFFF" />
              <MetricCard label="New (7d)" value={d.content?.projectsLast7d || 0} icon={ArrowUp} color="#00BFFF" />
              <MetricCard label="New (30d)" value={d.content?.projectsLast30d || 0} icon={ArrowUp} color="#00BFFF" />
              <MetricCard label="Avg per User" value={d.content?.avgProjectsPerUser || 0} icon={Users} color="#9945FF" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Publish Rate" value={`${d.content?.publishRate || 0}%`} icon={BookOpen} color="#4ECDC4" subtext="Draft to published" />
              <MetricCard label="Total Views" value={d.content?.totalContentViews?.toLocaleString() || 0} icon={Eye} color="#FFD700" />
              <MetricCard label="Avg Views/Published" value={d.content?.avgViewsPerProject || 0} icon={Eye} color="#FFD700" />
              <MetricCard label="Content Velocity" value={d.content?.contentVelocity || 0} icon={Zap} color="#FF6B35" subtext="Projects/active user (30d)" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Projects by Type</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={projectTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {projectTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Projects by Status</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 mt-4">
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Project Creation Timeline</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={projectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" tick={{ fill: "#666", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                  <Area type="monotone" dataKey="projects" stroke="#00BFFF" fill="#00BFFF" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeTab === "revenue" && (
          <>
            <SectionHeader title="Revenue & Monetization" icon={DollarSign} color="#14F195" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Total Revenue" value={`$${((d.revenue?.totalRevenueCents || 0) / 100).toFixed(2)}`} icon={DollarSign} color="#14F195" />
              <MetricCard label="Revenue (30d)" value={`$${((d.revenue?.revenueLast30dCents || 0) / 100).toFixed(2)}`} icon={DollarSign} color="#14F195" />
              <MetricCard label="ARPU" value={`$${d.revenue?.arpu || "0"}`} icon={Users} color="#FFD700" subtext="Avg revenue per paid user" />
              <MetricCard label="Paid Conversion" value={`${d.revenue?.conversionRate || 0}%`} icon={Target} color="#9945FF" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Marketplace Listings" value={d.revenue?.totalListings || 0} icon={ShoppingCart} color="#FF6B35" subtext={`${d.revenue?.activeListings || 0} active`} />
              <MetricCard label="Total Sales" value={d.revenue?.totalMarketplaceSales || 0} icon={ShoppingCart} color="#FF6B35" />
              <MetricCard label="Marketplace Revenue" value={`$${((d.revenue?.totalMarketplaceRevenueCents || 0) / 100).toFixed(2)}`} icon={DollarSign} color="#14F195" />
              <MetricCard label="Avg Price Point" value={`$${((d.revenue?.avgPricePointCents || 0) / 100).toFixed(2)}`} icon={DollarSign} color="#FFD700" />
            </div>
            {tierData.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Subscriptions by Tier</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={tierData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                    <Bar dataKey="value" fill="#14F195" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {activeTab === "ai" && (
          <>
            <SectionHeader title="AI & Platform Usage" icon={Brain} color="#BB86FC" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="AI Generations (Today)" value={d.aiPlatform?.aiUsageToday || 0} icon={Brain} color="#BB86FC" />
              <MetricCard label="AI Generations (Month)" value={d.aiPlatform?.aiUsageMonth?.toLocaleString() || 0} icon={Brain} color="#BB86FC" />
              <MetricCard label="Exports (Month)" value={d.aiPlatform?.exportUsageMonth?.toLocaleString() || 0} icon={BookOpen} color="#00BFFF" />
              <MetricCard label="AI Adoption Rate" value={`${d.aiPlatform?.aiAdoptionRate || 0}%`} icon={Zap} color="#14F195" subtext="% of users using AI" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <MetricCard label="Unique AI Users" value={d.aiPlatform?.uniqueAIUsers || 0} icon={Users} color="#BB86FC" />
              <MetricCard label="AI Gens / AI User" value={d.aiPlatform?.uniqueAIUsers > 0 ? (d.aiPlatform.aiUsageMonth / d.aiPlatform.uniqueAIUsers).toFixed(1) : "0"} icon={Zap} color="#BB86FC" subtext="Monthly avg per AI user" />
              <MetricCard label="Export / Active User" value={d.engagement?.mau > 0 ? (d.aiPlatform.exportUsageMonth / d.engagement.mau).toFixed(1) : "0"} icon={BookOpen} color="#00BFFF" subtext="Monthly avg per MAU" />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 mt-4">
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Forward-Thinking AI Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="border border-zinc-700 p-3">
                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">AI-Assisted vs Manual Ratio</span>
                    <p className="text-zinc-400 text-xs">Track what % of content uses AI generation vs pure manual creation. Higher AI adoption = better product-market fit for AI tools.</p>
                  </div>
                  <div className="border border-zinc-700 p-3">
                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">AI Quality Score</span>
                    <p className="text-zinc-400 text-xs">Measure how often AI-generated content gets published vs discarded. Higher publish rate = AI producing usable content.</p>
                  </div>
                  <div className="border border-zinc-700 p-3">
                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">Time-to-First-AI</span>
                    <p className="text-zinc-400 text-xs">How quickly new users try AI features after signup. Shorter = better onboarding for AI discovery.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="border border-zinc-700 p-3">
                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">AI Cost per Creation</span>
                    <p className="text-zinc-400 text-xs">Track API costs per AI generation. Optimize model selection and caching to reduce cost while maintaining quality.</p>
                  </div>
                  <div className="border border-zinc-700 p-3">
                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">Prompt Sophistication Index</span>
                    <p className="text-zinc-400 text-xs">Analyze prompt complexity over time. More sophisticated prompts = users learning to get better results.</p>
                  </div>
                  <div className="border border-zinc-700 p-3">
                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">FX Studio Import Rate</span>
                    <p className="text-zinc-400 text-xs">How often users import effects from FX Studio. Measures cross-platform ecosystem engagement.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "health" && (
          <>
            <SectionHeader title="User Health & Ecosystem" icon={Activity} color="#4ECDC4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Power Creators" value={d.userHealth?.powerCreators || 0} icon={Star} color="#FFD700" subtext="300+ mins, 1000+ XP" />
              <MetricCard label="At-Risk Users" value={d.userHealth?.atRiskUsers || 0} icon={Activity} color="#FF4D8D" subtext="Were active, now 30d silent" />
              <MetricCard label="Cross-Tool Adoption" value={`${d.userHealth?.crossToolAdoption || 0}%`} icon={Layers} color="#4ECDC4" subtext="2+ project types" />
              <MetricCard label="Consent Completion" value={`${d.compliance?.consentCompletionRate || 0}%`} icon={Shield} color="#14F195" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Level Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={levelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                    <Bar dataKey="value" fill="#9945FF" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Creator Class Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={classData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`}>
                      {classData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {d.userHealth?.topCreators?.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Top 10 Creators</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800">
                        <th className="text-left py-2 px-2">#</th>
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-right py-2 px-2">Level</th>
                        <th className="text-right py-2 px-2">XP</th>
                        <th className="text-right py-2 px-2">Minutes</th>
                        <th className="text-right py-2 px-2">Projects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.userHealth.topCreators.map((c: any, i: number) => (
                        <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="py-2 px-2 text-zinc-500">{i + 1}</td>
                          <td className="py-2 px-2 font-bold text-white">{c.name}</td>
                          <td className="py-2 px-2 text-right text-purple-400">{c.level}</td>
                          <td className="py-2 px-2 text-right text-yellow-400">{c.xp?.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-zinc-400">{c.minutes?.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-cyan-400">{c.projects}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 p-4 mt-4">
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Future Ecosystem KPIs to Track</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Creator Economy Index</span>
                  <p className="text-zinc-500">% of creators earning revenue. Target: 10% of active creators monetizing within 90 days.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Virality Coefficient (K-Factor)</span>
                  <p className="text-zinc-500">How many new users each user brings via shares, portfolios, and community reads. K {'>'} 1 = viral growth.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Net Promoter Score (NPS)</span>
                  <p className="text-zinc-500">Survey-based loyalty metric. Would users recommend PSCoMiXX? Target: {'>'} 50 for creative tools.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Student-to-Creator Pipeline</span>
                  <p className="text-zinc-500">% of student accounts that upgrade to creator accounts after turning 18. Measures long-term retention.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">School District Expansion</span>
                  <p className="text-zinc-500">Track SSO configs, classroom assignments, and PSLMS integrations for B2B growth signals.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Content Discovery Rate</span>
                  <p className="text-zinc-500">% of published content that gets views within 7 days. Measures marketplace/community health.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Series Completion Rate</span>
                  <p className="text-zinc-500">% of readers who finish multi-issue series. Higher = better storytelling and engagement loops.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">PWA Install Rate</span>
                  <p className="text-zinc-500">% of users who install the PWA. Indicates commitment and enables offline engagement tracking.</p>
                </div>
                <div className="border border-zinc-700 p-3">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">Ecosystem Gravity</span>
                  <p className="text-zinc-500">Users active across PSCoMiXX + Mad Mixed Media + FX Studio. Measures ecosystem lock-in and cross-platform value.</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 border-t border-zinc-800 pt-4 text-center">
          <p className="text-[9px] text-zinc-600 font-mono">PSCoMiXX Analytics Engine v1.0 | Data refreshes every 60 seconds | Admin eyes only</p>
        </div>
      </div>
    </Layout>
  );
}
