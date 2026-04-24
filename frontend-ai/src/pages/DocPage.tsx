import { ArrowLeft, BookOpen, Server, Database, Workflow, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const DocsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-black text-white">Documentation</h1>
              <p className="text-slate-400">Architecture, API, and workflow overview</p>
            </div>
          </div>

          <Link
            to="/help"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Section
            icon={<Database className="w-5 h-5" />}
            title="Hasura (Postgres)"
            items={[
              "Tables: login_events, incidents, ip_blocks",
              "Permissions: role-based access",
              "Queries used by UI: recent events, incidents list, blocked IPs",
            ]}
          />

          <Section
            icon={<Workflow className="w-5 h-5" />}
            title="Temporal Workflows"
            items={[
              "Durable orchestration of detection & response",
              "Retries + state across failures",
              "Writes enrichment + actions back to Hasura",
            ]}
          />

          <Section
            icon={<Server className="w-5 h-5" />}
            title="Serverless (AWS SAM)"
            items={[
              "Webhook/API Gateway endpoint",
              "Starts Temporal workflow",
              "Validates payload and returns ack",
            ]}
          />

          <Section
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Response Actions"
            items={[
              "Block IP (insert into ip_blocks)",
              "Unblock IP (delete by PK)",
              "Incident creation + status tracking",
            ]}
          />
        </div>
      </div>
    </div>
  );
};

const Section = ({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
    <div className="flex items-center gap-2 text-cyan-400 mb-3">
      {icon}
      <h3 className="text-lg font-bold text-white">{title}</h3>
    </div>
    <ul className="text-slate-300 space-y-2">
      {items.map((t) => (
        <li key={t} className="text-sm">
          • {t}
        </li>
      ))}
    </ul>
  </div>
);

export default DocsPage;
