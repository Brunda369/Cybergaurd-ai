import { Shield, Users, Target, Zap } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-mono mb-6">
            <Shield className="w-4 h-4" />
            <span>About CyberGuard AI</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6">
            Next-Gen Threat Detection
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            We're building the future of autonomous security operations with AI-powered workflows and real-time threat intelligence
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-4">
            CyberGuard AI empowers security teams to detect, analyze, and respond to threats at machine speed. By combining Temporal's durable workflows with AI-powered analysis, we provide autonomous incident response that scales with your infrastructure.
          </p>
          <p className="text-slate-300 text-lg leading-relaxed">
            Our platform orchestrates complex security workflows, integrates honeypot deception infrastructure, and leverages LLMs to provide human-readable threat summaries mapped to MITRE ATT&CK techniques.
          </p>
        </div>

    
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <ValueCard
            icon={<Zap className="w-8 h-8 text-cyan-400" />}
            title="Speed"
            description="Real-time threat detection with sub-second response times through GraphQL subscriptions and event-driven architecture"
          />
          <ValueCard
            icon={<Shield className="w-8 h-8 text-cyan-400" />}
            title="Reliability"
            description="Fault-tolerant workflows powered by Temporal ensure every threat is tracked and no incident is lost"
          />
          <ValueCard
            icon={<Target className="w-8 h-8 text-cyan-400" />}
            title="Accuracy"
            description="AI-powered analysis reduces false positives while mapping attacks to MITRE ATT&CK framework"
          />
          <ValueCard
            icon={<Users className="w-8 h-8 text-cyan-400" />}
            title="Automation"
            description="Autonomous response workflows free your SOC team to focus on strategic security initiatives"
          />
        </div>
      </div>
    </div>
  );
};

const ValueCard = ({ icon, title, description }: any) => (
  <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all">
    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg inline-block">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{description}</p>
  </div>
);

export default AboutPage;