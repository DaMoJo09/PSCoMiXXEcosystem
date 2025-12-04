import { Layout } from "@/components/layout/Layout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, FileText, Download, TrendingUp } from "lucide-react";

const data = [
  { name: 'Mon', projects: 4, views: 240 },
  { name: 'Tue', projects: 3, views: 139 },
  { name: 'Wed', projects: 9, views: 980 },
  { name: 'Thu', projects: 6, views: 390 },
  { name: 'Fri', projects: 8, views: 480 },
  { name: 'Sat', projects: 12, views: 680 },
  { name: 'Sun', projects: 15, views: 800 },
];

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <div className="p-6 border border-border bg-card shadow-sm hover:shadow-hard transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold font-display mt-2">{value}</h3>
      </div>
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
    <div className="mt-4 text-xs font-medium text-green-600 flex items-center gap-1">
      <TrendingUp className="w-3 h-3" /> {trend}
    </div>
  </div>
);

export default function AdminDashboard() {
  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="border-b border-border pb-6">
          <div className="flex items-center gap-2 mb-2">
             <span className="bg-black text-white text-xs px-2 py-0.5 font-mono font-bold">ADMIN MODE</span>
          </div>
          <h1 className="text-4xl font-display font-bold">Analytics Console</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value="12,345" icon={Users} trend="+12% this week" />
          <StatCard title="Projects Created" value="8,230" icon={FileText} trend="+5% this week" />
          <StatCard title="Total Exports" value="45,201" icon={Download} trend="+18% this week" />
          <StatCard title="Revenue" value="$12,450" icon={TrendingUp} trend="+8% this week" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border border-border p-6 bg-card">
            <h3 className="font-display font-bold text-lg mb-6">Project Creation Activity</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0px' }}
                    cursor={{ fill: '#f5f5f5' }}
                  />
                  <Bar dataKey="projects" fill="#000000" radius={[0, 0, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-border p-6 bg-card">
            <h3 className="font-display font-bold text-lg mb-6">Community Engagement</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0px' }}
                  />
                  <Line type="monotone" dataKey="views" stroke="#000000" strokeWidth={2} dot={{ r: 4, fill: "#000" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
