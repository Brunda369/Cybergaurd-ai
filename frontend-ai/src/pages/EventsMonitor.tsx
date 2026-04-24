import { useQuery } from '@apollo/client/react';
import { AlertCircle, CheckCircle, XCircle, Activity, TrendingUp, Clock, Shield } from 'lucide-react';
import { GET_RECENT_EVENTS } from '../graphql/queries/incidents';
import type { LoginEvent } from '../types';

const EventsMonitorPage = () => {
  const { data, loading } = useQuery(GET_RECENT_EVENTS, {
    variables: { limit: 50 },
    pollInterval: 10000, 
  });

  const events: LoginEvent[] = (data as any)?.login_events || [];
  
  const stats = {
    total: events.length,
    successful: events.filter(e => e.success).length,
    failed: events.filter(e => !e.success).length,
    uniqueIps: new Set(events.map(e => e.ip)).size,
  };

  const ipFailureCounts = events.reduce((acc, event) => {
    if (!event.success) {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const suspiciousIps = Object.entries(ipFailureCounts)
    .filter(([_, count]) => count >= 3)
    .map(([ip, count]) => ({ ip, failures: count }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-4xl font-black text-white">Security Event Stream</h1>
          </div>
          <p className="text-slate-400">Real-time login event monitoring and threat detection</p>
        </div>


        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Events"
            value={stats.total}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Successful"
            value={stats.successful}
            color="green"
          />
          <StatCard
            icon={<XCircle className="w-5 h-5" />}
            label="Failed"
            value={stats.failed}
            color="red"
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            label="Unique IPs"
            value={stats.uniqueIps}
            color="cyan"
          />
        </div>

        {suspiciousIps.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-bold text-red-400">Potential Brute Force Detected</h3>
            </div>
            <div className="space-y-2">
              {suspiciousIps.map(({ ip, failures }) => (
                <div key={ip} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                  <span className="text-white font-mono">{ip}</span>
                  <span className="text-red-400 font-bold">{failures} failed attempts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Live Event Stream</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-400 font-mono">LIVE • Updates every 2s</span>
            </div>
          </div>

          {loading && events.length === 0 ? (
            <div className="p-8">
              <LoadingState />
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No events yet</p>
              <p className="text-slate-500 text-sm mt-2">Use the Simulator to create test events</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Username
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      IP Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Timestamp
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Event ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }:any) => {
  const colorClasses:any = {
    blue: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    cyan: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm opacity-80">{label}</span>
      </div>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
};

const EventRow = ({ event }: { event: LoginEvent }) => {
  const isRecent = (Date.now() - new Date(event.created_at).getTime()) < 10000; 

  return (
    <tr className={`hover:bg-slate-800/30 transition-colors ${isRecent ? 'bg-cyan-500/5' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {event.success ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-semibold">Success</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-semibold">Failed</span>
            </>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-white font-medium">{event.username}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-slate-300 font-mono text-sm">{event.ip}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-slate-400 text-sm">
          {new Date(event.created_at).toLocaleString()}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-slate-500 font-mono text-xs">{event.id.slice(0, 8)}...</span>
      </td>
    </tr>
  );
};

const PipelineStep = ({ number, title, description, icon }: any) => (
  <div className="flex-shrink-0 text-center min-w-[140px]">
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-2">
      <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-cyan-400">
        {icon}
      </div>
      <div className="text-xs text-slate-500 mb-1">Step {number}</div>
      <div className="text-sm font-bold text-white mb-1">{title}</div>
      <div className="text-xs text-slate-400">{description}</div>
    </div>
  </div>
);

const Arrow = () => (
  <div className="text-slate-600 flex-shrink-0">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-cyan-500/30">
      <path d="M5 12h14m-6-6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const LoadingState = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-16 bg-slate-800/30 rounded-lg animate-pulse"></div>
    ))}
  </div>
);

export default EventsMonitorPage;