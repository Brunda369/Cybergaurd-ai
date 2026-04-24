import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import type { Incident } from "../types";
import { AlertTriangle, X, Shield, ExternalLink } from "lucide-react";

import { GET_INCIDENTS, GET_BLOCKED_IPS } from "../graphql/queries/incidents";
import { BLOCK_IP } from "../graphql/mutations/blockIp";

const IncidentsPage = () => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const { data, loading } = useQuery(GET_INCIDENTS, {
    variables: { limit: 50, offset: 0 },
    pollInterval: 5000,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const incidents: Incident[] = (data as any)?.incidents || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <h1 className="text-4xl font-black text-white">Incident Management</h1>
          </div>
          <p className="text-slate-400">Monitor and respond to security incidents</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickStat label="Total" value={incidents.length} color="blue" />
          <QuickStat label="High Risk" value={incidents.filter((i) => i.risk === "HIGH").length} color="yellow" />
          <QuickStat label="Medium" value={incidents.filter((i) => i.risk === "MED").length} color="green" />
          <QuickStat label="Low" value={incidents.filter((i) => i.risk === "LOW").length} color="blue" />
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white">All Incidents</h2>
          </div>

          {loading ? (
            <div className="p-8">
              <LoadingState />
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No incidents detected</p>
              <p className="text-slate-500 text-sm mt-2">Your system is secure</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Risk
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Summary
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Technique
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Recommendation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {incidents.map((incident) => (
                    <IncidentRow
                      key={incident.id}
                      incident={incident}
                      onClick={() => setSelectedIncident(incident)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedIncident && (
        <IncidentDetailModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}
    </div>
  );
};

const QuickStat = ({ label, value, color }: any) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    red: "bg-red-500/10 border-red-500/30 text-red-400",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    green: "bg-green-500/10 border-green-500/30 text-green-400",
  };

  return (
    <div className={`${colorClasses[color] ?? ""} border rounded-lg p-4`}>
      <p className="text-sm opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
};

const IncidentRow = ({ incident, onClick }: { incident: Incident; onClick: () => void }) => {
  const riskColors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-orange-500",
    MED: "bg-yellow-500",
    LOW: "bg-green-500",
  };

  const ipLabel = incident.ip?.trim() ? incident.ip : "Not captured";

  return (
    <tr onClick={onClick} className="hover:bg-slate-800/30 cursor-pointer transition-colors">
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white ${
            riskColors[incident.risk] || "bg-slate-600"
          }`}
        >
          {incident.risk}
        </span>
      </td>

      <td className="px-6 py-4">
        <span className="text-white font-mono">{ipLabel}</span>
      </td>

      <td className="px-6 py-4">
        <p className="text-slate-300 line-clamp-2 whitespace-pre-wrap">{incident.summary ?? ""}</p>
      </td>

      <td className="px-6 py-4">
        <div>
          <span className="text-slate-300 font-semibold block">{incident.technique_name ?? "Unknown"}</span>
          <span className="text-slate-500 font-mono text-xs">
            {incident.technique_id ?? incident.mitre_technique ?? ""}
          </span>
        </div>
      </td>

      <td className="px-6 py-4">
        <p className="text-slate-300 line-clamp-2 whitespace-pre-wrap">{incident.recommendation ?? ""}</p>
      </td>

      <td className="px-6 py-4">
        <span className="text-slate-400 text-sm">{new Date(incident.created_at).toLocaleString()}</span>
      </td>

      <td className="px-6 py-4">
        <ExternalLink className="w-4 h-4 text-slate-500" />
      </td>
    </tr>
  );
};

const IncidentDetailModal = ({
  incident,
  onClose,
}: {
  incident: Incident;
  onClose: () => void;
}) => {
  const riskColors: Record<string, string> = {
    CRITICAL: "from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
    HIGH: "from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400",
    MED: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400",
    LOW: "from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
  };

  const ip = useMemo(() => (incident.ip ?? "").trim(), [incident.ip]);
  const canBlock = Boolean(ip);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [blockIp, { loading: blocking, error: blockErr }] = useMutation(BLOCK_IP, {
    refetchQueries: [
      { query: GET_BLOCKED_IPS },
      { query: GET_INCIDENTS, variables: { limit: 50, offset: 0 } },
    ],
    awaitRefetchQueries: true,
  });

  const handleBlock = async () => {
    if (!canBlock) return;

    try {
      await blockIp({
        variables: {
          ip,
          reason: `Blocked from incident ${incident.id} (${incident.risk})`,
        },
      });

      setSuccessMsg("IP blocked successfully!");
      setTimeout(() => onClose(), 800);
    } catch {

    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Incident Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

     
        <div className="p-6 space-y-6">
          
          <div
            className={`bg-gradient-to-r ${riskColors[incident.risk] || ""} border rounded-xl p-6 text-center`}
          >
            <p className="text-sm opacity-80 mb-2">RISK LEVEL</p>
            <p className="text-4xl font-black">{incident.risk}</p>
          </div>

       
          <div className="grid md:grid-cols-2 gap-4">
            <InfoCard label="IP Address" value={canBlock ? ip : "Not captured"} />
            <InfoCard label="Event ID" value={incident.event_id ?? ""} />
            <InfoCard
              label="Technique ID"
              value={incident.technique_id ?? incident.mitre_technique ?? "N/A"}
            />
            <InfoCard label="Technique Name" value={incident.technique_name ?? "N/A"} />
            <InfoCard label="Detected At" value={new Date(incident.created_at).toLocaleString()} />
          </div>

         
          <div className="bg-slate-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">AI Analysis</h3>
            </div>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {incident.summary ?? ""}
            </p>
          </div>

         
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-cyan-400 mb-2">Recommended Actions</h3>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {incident.recommendation ?? ""}
                </p>
              </div>
            </div>
          </div>

          
          <div className="flex flex-col gap-2">
            {!canBlock && (
              <div className="text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                Can't block: this incident has no valid source IP (Not captured).
              </div>
            )}

            {blockErr && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                Failed to block IP: {blockErr.message}
              </div>
            )}

            {successMsg && (
              <div className="text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                {successMsg}
              </div>
            )}
          </div>

          
          <div className="flex gap-3">
            <button
              disabled={blocking || !canBlock}
              onClick={handleBlock}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {blocking ? "Blocking..." : canBlock ? "Block IP" : "No IP to block"}
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-slate-800/30 rounded-lg p-4">
    <p className="text-sm text-slate-400 mb-1">{label}</p>
    <p className="text-white font-semibold break-words">{value}</p>
  </div>
);

const LoadingState = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-16 bg-slate-800/30 rounded-lg animate-pulse"></div>
    ))}
  </div>
);

export default IncidentsPage;
