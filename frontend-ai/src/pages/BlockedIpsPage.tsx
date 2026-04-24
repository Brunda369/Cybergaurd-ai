import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ban, Trash2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { GET_BLOCKED_IPS } from "../graphql/queries/incidents";
import { gql } from "@apollo/client";

const UNBLOCK_IP = gql`
  mutation UnblockIp($id: uuid!) {
    delete_ip_blocks_by_pk(id: $id) {
      id
    }
  }
`;

function isValidIPv4(ip: string) {
  const s = ip.trim();
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  return ipv4.test(s);
}

const BlockedIpsPage = () => {
  const [toast, setToast] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_BLOCKED_IPS, {
    variables: { limit: 50 },
    pollInterval: 5000,
    fetchPolicy: "cache-and-network",
  });

  // Optional: hide junk rows like "a"
  const blocked = useMemo(() => {
    const rows = (data as any)?.ip_blocks ?? [];
    return rows.filter((r: any) => (r?.ip ? isValidIPv4(r.ip) : false));
  }, [data]);

  const [unblockIp, { loading: unblocking }] = useMutation(UNBLOCK_IP, {
    awaitRefetchQueries: true,
    refetchQueries: [{ query: GET_BLOCKED_IPS, variables: { limit: 50 } }],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Ban className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-black text-white">Blocked IPs</h1>
              <p className="text-slate-400">IPs blocked via incident response actions</p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        
        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            Failed to load blocked IPs: {error.message}
          </div>
        )}

        
        {toast && (
          <div className="mb-4 text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            {toast}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">All Block Entries</h2>

            <button
              onClick={() => refetch()}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-slate-800/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : blocked.length === 0 ? (
            <div className="p-10 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">No blocked IPs</p>
              <p className="text-slate-500 text-sm mt-1">
                Block an IP from the Incident Details .
              </p>
              <p className="text-slate-500 text-xs mt-3">
                (Note: invalid IP rows are filtered out here.)
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {blocked.map((b: any) => (
                <div key={b.id} className="p-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-mono text-base">{b.ip}</p>
                    <p className="text-slate-400 text-sm mt-1 whitespace-pre-wrap">
                      {b.reason ?? ""}
                    </p>
                    <p className="text-slate-500 text-xs mt-2">
                      {b.created_at ? new Date(b.created_at).toLocaleString() : ""}
                    </p>
                  </div>

                  <button
                    disabled={unblocking}
                    onClick={async () => {
                      await unblockIp({ variables: { id: b.id } });
                      setToast(`Unblocked ${b.ip}`);
                      setTimeout(() => setToast(null), 1500);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BlockedIpsPage;
