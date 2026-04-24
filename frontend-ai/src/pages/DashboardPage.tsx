import { useQuery } from "@apollo/client/react";
import {
  AlertTriangle,
  Shield,
  Activity,
  Ban,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  GET_DASHBOARD_STATS,
  GET_RECENT_EVENTS,
  GET_BLOCKED_IPS,
} from "../graphql/queries/incidents";
import type { LoginEvent } from "../types";
import { Link } from "react-router-dom";

const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

const DashboardPage = () => {
  const { data, loading } = useQuery(GET_DASHBOARD_STATS, {
    variables: { startOfDay: startOfDay.toISOString() },
    pollInterval: 5000,
    fetchPolicy: "cache-and-network",
  });

  const totalIncidents = (data as any)?.total?.aggregate?.count ?? 0;
  const activeThreats = (data as any)?.high_risk?.aggregate?.count ?? 0;
  const blockedIps = (data as any)?.blocked?.aggregate?.count ?? 0;
  const eventsToday = (data as any)?.today_events?.aggregate?.count ?? 0;

  const { data: eventsData, loading: eventsLoading } = useQuery(GET_RECENT_EVENTS, {
    variables: { limit: 10 },
    pollInterval: 3000,
    fetchPolicy: "cache-and-network",
  });

  const { data: blockedData, loading: blockedLoading } = useQuery(GET_BLOCKED_IPS, {
    variables: { limit: 10 },
    pollInterval: 5000,
    fetchPolicy: "cache-and-network",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-4xl font-black text-white">
              Security Operations Center
            </h1>
          </div>
          <p className="text-slate-400">Real-time threat monitoring and incident response</p>
        </div>




       

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Recent Login Events
              </h2>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-400 font-mono">LIVE</span>
                </div>
                <Link
                  to="/events"
                  className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {eventsLoading ? (
              <LoadingState />
            ) : (
              <div className="space-y-2">
                {(eventsData as any)?.login_events?.map((event: LoginEvent) => (
                  <EventRow key={event.id} event={event} />
                ))}
                {((eventsData as any)?.login_events?.length ?? 0) === 0 && (
                  <p className="text-slate-400 text-sm">No events yet.</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Threat Analysis
            </h2>

            <div className="space-y-4">
              <ThreatBar label="CRITICAL" percentage={0} color="red" />
              <ThreatBar label="HIGH" percentage={2} color="orange" />
              <ThreatBar label="MEDIUM" percentage={22} color="yellow" />
              <ThreatBar label="LOW" percentage={45} color="green" />
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Top Attack Vector</p>
              <p className="text-lg font-bold text-cyan-400">Brute Force Authentication</p>
              <p className="text-sm text-slate-500 font-mono mt-1">MITRE: T1110</p>
            </div>
          </div>


          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-cyan-400" />
                Blocked IPs
              </h2>

              <Link
                to="/blocked"
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {blockedLoading ? (
              <LoadingState />
            ) : ((blockedData as any)?.ip_blocks?.length ?? 0) === 0 ? (
              <div className="text-slate-400 text-sm">No blocked IPs yet.</div>
            ) : (
              <div className="space-y-2">
                {(blockedData as any).ip_blocks.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-mono text-sm">{b.ip ?? "Unknown IP"}</p>
                        <p className="text-slate-400 text-xs mt-1 line-clamp-2 whitespace-pre-wrap">
                          {b.reason ?? ""}
                        </p>
                      </div>
                      <p className="text-slate-500 text-xs whitespace-nowrap">
                        {b.created_at ? new Date(b.created_at).toLocaleTimeString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, trend, color, loading }: any) => {
  const colorClasses :any = {
    red: "from-red-500/20 to-red-600/20 border-red-500/30",
    yellow: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30",
    blue: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30",
    green: "from-green-500/20 to-green-600/20 border-green-500/30",
  };

  const iconColorClasses : any = {
    red: "text-red-400",
    yellow: "text-yellow-400",
    blue: "text-cyan-400",
    green: "text-green-400",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm border rounded-xl p-6 hover:scale-105 transition-transform`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 bg-slate-900/50 rounded-lg ${iconColorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-sm font-mono text-green-400">{trend}</span>
      </div>
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-20 bg-slate-800 rounded animate-pulse"></div>
      ) : (
        <p className="text-3xl font-black text-white">{value}</p>
      )}
    </div>
  );
};

const EventRow = ({ event }: { event: LoginEvent }) => (
  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${event.success ? "bg-green-400" : "bg-red-400"}`}></div>
      <div>
        <p className="text-white font-mono text-sm">{event.username}</p>
        <p className="text-slate-500 text-xs">{event.ip ?? "Unknown IP"}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`text-sm font-semibold ${event.success ? "text-green-400" : "text-red-400"}`}>
        {event.success ? "SUCCESS" : "FAILED"}
      </p>
      <p className="text-slate-500 text-xs">{new Date(event.created_at).toLocaleTimeString()}</p>
    </div>
  </div>
);

const ThreatBar = ({ label, percentage, color }: any) => {
  const colorClasses :any = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm text-slate-400 font-mono">{label}</span>
        <span className="text-sm text-slate-300 font-bold">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const SystemStatus = ({ service, status, uptime }: any) => (
  <div className="p-4 bg-slate-800/30 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <div
        className={`w-2 h-2 rounded-full ${
          status === "operational" ? "bg-green-400" : "bg-red-400"
        } animate-pulse`}
      ></div>
      <p className="text-white font-medium">{service}</p>
    </div>
    <p className="text-sm text-slate-400">
      Uptime: <span className="text-green-400 font-mono">{uptime}</span>
    </p>
  </div>
);

const LoadingState = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-16 bg-slate-800/30 rounded-lg animate-pulse"></div>
    ))}
  </div>
);

export default DashboardPage;
