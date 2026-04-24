import { Link } from 'react-router-dom';
import { Shield, Zap, Brain, Lock, Activity, TrendingUp } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

     
      <section className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-mono mb-8 animate-fade-in">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Real-time Threat Detection • AI-Powered Analysis</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            CYBERGUARD AI
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto font-light animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Advanced threat detection powered by AI workflows
          </p>
          
          <p className="text-slate-400 mb-12 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            Autonomous incident response with Temporal orchestration, real-time monitoring, and LLM-powered threat analysis
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link
              to="/login"
              className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Launch Dashboard
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
            
            <Link
              to="/about"
              className="px-8 py-4 bg-slate-800/50 backdrop-blur-sm text-slate-200 font-semibold rounded-lg border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-300"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

     
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-slate-400 text-lg">
              Built with modern infrastructure for real-time threat response
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain className="w-8 h-8 text-cyan-400" />}
              title="AI Analysis"
              description="LLM-powered incident summaries with MITRE ATT&CK mapping and context-aware threat intelligence"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-cyan-400" />}
              title="Temporal Workflows"
              description="Durable, fault-tolerant threat detection pipelines with automatic retries and state management"
            />
            <FeatureCard
              icon={<Activity className="w-8 h-8 text-cyan-400" />}
              title="Real-time Monitoring"
              description="Live threat feeds via GraphQL subscriptions with instant incident notifications"
            />
            <FeatureCard
              icon={<Lock className="w-8 h-8 text-cyan-400" />}
              title="Auto Response"
              description="Automated IP blocking, honeypot deployment, and escalation workflows"
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8 text-cyan-400" />}
              title="Analytics Dashboard"
              description="Comprehensive SOC dashboard with threat metrics, trends, and historical analysis"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-cyan-400" />}
              title="Honeypot Integration"
              description="Deploy deception infrastructure and capture attack patterns in real-time"
            />
          </div>
        </div>
      </section>

   
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Secure Your Infrastructure?
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Start detecting threats in minutes with our AI-powered platform
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300"
          >
            <Shield className="w-5 h-5" />
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="group p-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all duration-300 hover:scale-105">
    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg inline-block group-hover:bg-cyan-500/10 transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{description}</p>
  </div>
);


export default HomePage;