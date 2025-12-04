import { Layout } from "@/components/layout/Layout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, Download, TrendingUp, ShieldCheck } from "lucide-react";
import { useAdminStats, useAdminUsers, useAdminProjects } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { formatDistanceToNow } from "date-fns";

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

  const isLoading = statsLoading || usersLoading || projectsLoading;

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
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-black text-white text-xs px-2 py-0.5 font-mono font-bold">ADMIN MODE</span>
          </div>
          <h1 className="text-4xl font-display font-bold" data-testid="text-admin-title">Analytics Console</h1>
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
      </div>
    </Layout>
  );
}
