import { useState} from 'react';
import type{FormEvent} from 'react';
import { useMutation } from '@apollo/client/react';
import { INSERT_LOGIN_EVENT } from '../graphql/mutations/insertEvent';
import { Play, CheckCircle, XCircle, Zap } from 'lucide-react';

const SimulatorPage = () => {
  const [username, setUsername] = useState('');
  const [ip, setIp] = useState('');
  const [success, setSuccess] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const [insertEvent, { loading }] = useMutation(INSERT_LOGIN_EVENT, {
    onCompleted: () => {
      setShowResult(true);
      setTimeout(() => setShowResult(false), 3000);
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    await insertEvent({
      variables: {
        username,
        ip,
        success,
      },
    });

    setUsername('');
    setIp('');
  };

  const quickPresets = [
    { username: 'admin', ip: '192.168.1.100', success: false, label: 'Failed Admin Login' },
    { username: 'john.doe', ip: '10.0.0.45', success: true, label: 'Successful Login' },
    { username: 'root', ip: '203.0.113.42', success: false, label: 'Suspicious Root Access' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-black text-white">Event Simulator</h1>
          </div>
          <p className="text-slate-400">Generate test login events to trigger the AI threat detection pipeline</p>
        </div>


        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Create Login Event</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="e.g., john.doe, admin, root"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    required
                    pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="e.g., 192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Authentication Status
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSuccess(true)}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        success
                          ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                          : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5 inline-block mr-2" />
                      Success
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuccess(false)}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        !success
                          ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                          : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <XCircle className="w-5 h-5 inline-block mr-2" />
                      Failed
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {loading ? 'Sending Event...' : 'Simulate Event'}
                </button>
              </form>

              
              {showResult && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-green-400 font-semibold">Event sent successfully!</p>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Temporal workflow triggered. Check dashboard for results.
                  </p>
                </div>
              )}
            </div>
          </div>

          
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Quick Presets</h3>
              <div className="space-y-3">
                {quickPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setUsername(preset.username);
                      setIp(preset.ip);
                      setSuccess(preset.success);
                    }}
                    className="w-full p-4 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-left transition-all group"
                  >
                    <p className="text-white font-semibold mb-1 group-hover:text-cyan-400 transition-colors">
                      {preset.label}
                    </p>
                    <p className="text-sm text-slate-500 font-mono">{preset.username} @ {preset.ip}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

   
        <div className="mt-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Pipeline Status</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <StatusCard
              label="Events Processed"
              value="10"
              status="operational"
            />
            <StatusCard
              label="Workflows Running"
              value="1"
              status="operational"
            />
            <StatusCard
              label="Avg Response Time"
              value="2.4s"
              status="operational"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusCard = ({ label, value, status }: any) => (
  <div className="p-4 bg-slate-800/30 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-slate-400">{label}</p>
      <div className={`w-2 h-2 rounded-full ${status === 'operational' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
    </div>
    <p className="text-2xl font-black text-white">{value}</p>
  </div>
);

export default SimulatorPage;