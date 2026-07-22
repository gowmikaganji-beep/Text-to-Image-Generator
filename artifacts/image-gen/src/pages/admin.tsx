import { useGetAnalyticsSummary, useGetDailyAnalytics, useGetStyleStats, getGetAnalyticsSummaryQueryKey, getGetDailyAnalyticsQueryKey, getGetStyleStatsQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Redirect } from "wouter";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2, Image as ImageIcon, Users, Folder, Heart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Fetch queries
  const { data: summary, isLoading: isLoadingSum } = useGetAnalyticsSummary({
    query: { enabled: !!user, queryKey: getGetAnalyticsSummaryQueryKey() }
  });
  
  const { data: daily, isLoading: isLoadingDaily } = useGetDailyAnalytics({ days: 30 }, {
    query: { enabled: !!user, queryKey: getGetDailyAnalyticsQueryKey({ days: 30 }) }
  });

  const { data: styles, isLoading: isLoadingStyle } = useGetStyleStats({
    query: { enabled: !!user, queryKey: getGetStyleStatsQueryKey() }
  });

  if (!isLoaded) return null;

  // Simple client-side admin check
  const isAdmin = user?.emailAddresses?.some(e => e.emailAddress.includes("admin"));
  if (!isAdmin) {
    return <Redirect to={`${basePath}/`} />;
  }

  const isLoading = isLoadingSum || isLoadingDaily || isLoadingStyle;

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform analytics and usage metrics.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Images" value={summary?.totalImages || 0} icon={ImageIcon} trend={`+${summary?.imagesThisWeek || 0} this week`} />
            <StatCard title="Total Users" value={summary?.totalUsers || 0} icon={Users} />
            <StatCard title="Total Collections" value={summary?.totalCollections || 0} icon={Folder} />
            <StatCard title="Total Favorites" value={summary?.totalFavorites || 0} icon={Heart} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <Card className="bg-card border-white/5 lg:col-span-2 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" /> 
                  Generation Volume (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={daily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} tickFormatter={(t) => t.split('-').slice(1).join('/')} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 8, fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Styles Chart */}
            <Card className="bg-card border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-white">Top Styles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={styles || []} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="style" type="category" stroke="rgba(255,255,255,0.8)" fontSize={12} width={90} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: any) {
  return (
    <Card className="bg-card/50 border-white/5 backdrop-blur-md overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Icon size={80} />
      </div>
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="h-8 w-8 rounded-md bg-white/5 flex items-center justify-center text-white/70">
            <Icon size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <h3 className="text-3xl font-bold text-white">{value.toLocaleString()}</h3>
          {trend && <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
