import { HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const HelpPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-mono mb-6">
            <HelpCircle className="w-4 h-4" />
            <span>Help Center</span>
          </div>
          <h1 className="text-5xl font-black text-white mb-4">How Can We Help?</h1>
          <p className="text-xl text-slate-400">
            Find answers, guides, and support resources
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <QuickActionCard
            icon={<BookOpen className="w-6 h-6" />}
            title="Documentation"
            description="Technical guides and API references"
            link="/docs"
          />
          <QuickActionCard
            icon={<MessageCircle className="w-6 h-6" />}
            title="Community"
            description="Join our Discord server"
            link="#"
          />
          <QuickActionCard
            icon={<Mail className="w-6 h-6" />}
            title="Contact Support"
            description="Get help from our team"
            link="#"
          />
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <FAQItem
              question="How does CyberGuard AI detect threats?"
              answer="CyberGuard AI uses a combination of rule-based detection, machine learning models, and LLM-powered analysis to identify suspicious activity. When a login event occurs, Temporal workflows orchestrate the analysis pipeline, checking IP reputation, user behavior patterns, and historical data to assess threat level."
            />
            
            <FAQItem
              question="What is a Temporal workflow?"
              answer="Temporal is a durable execution platform that ensures your security workflows run to completion, even in the face of failures. It provides automatic retries, state management, and an audit trail of all detection and response actions taken by the system."
            />
            
            <FAQItem
              question="How do I simulate a threat event?"
              answer="Navigate to the Simulator page from the dashboard. Enter a username, IP address, and choose whether the login was successful or failed. Click 'Simulate Event' and the system will process it through the full threat detection pipeline, creating incidents if suspicious activity is detected."
            />
            
            <FAQItem
              question="What are MITRE ATT&CK techniques?"
              answer="MITRE ATT&CK is a knowledge base of adversary tactics and techniques based on real-world observations. CyberGuard AI maps detected threats to specific ATT&CK techniques (e.g., T1110 for Brute Force) to help you understand the nature of the attack and appropriate defenses."
            />
            
            <FAQItem
              question="How does the LLM analysis work?"
              answer="When an incident is detected, our AI generates a human-readable summary explaining what happened, why it's suspicious, the potential impact, and recommended response actions. This turns raw security events into actionable intelligence for your SOC team."
            />
            
            <FAQItem
              question="Can I integrate my own honeypots?"
              answer="Yes! CyberGuard AI supports integration with honeypot systems like Cowrie. Honeypot events are ingested via our API, processed through Temporal workflows, and analyzed for threat intelligence. Attack patterns, credentials, and command data are extracted and stored for analysis."
            />
          </div>
        </div>

       
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Still Need Help?</h3>
          <p className="text-slate-300 mb-6">
            Our support team is here to assist you
          </p>
          <a
            href="mailto:support@cyberguard.ai"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:scale-105 transition-transform"
          >
            <Mail className="w-5 h-5" />
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
};

const QuickActionCard = ({ icon, title, description, link }: any) => (
  <a
    href={link}
    className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all"
  >
    <div className="p-3 bg-slate-800/50 rounded-lg inline-block mb-4 group-hover:bg-cyan-500/10 transition-colors text-cyan-400">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
      {title}
    </h3>
    <p className="text-slate-400 text-sm">{description}</p>
    <ExternalLink className="w-4 h-4 text-slate-500 mt-3 group-hover:text-cyan-400 transition-colors" />
  </a>
);

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left bg-slate-800/30 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
      >
        <span className="text-white font-semibold">{question}</span>
        <span className={`text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-slate-800/20">
          <p className="text-slate-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default HelpPage;