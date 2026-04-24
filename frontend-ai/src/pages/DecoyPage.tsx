import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { INSERT_LOGIN_EVENT } from '../graphql/mutations/insertEvent';
import { ShieldAlert, Lock, Server, Terminal } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const DecoyPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const location = useLocation();

    // Get IP from query param or mock (in a real app, the backend sees the request IP)
    const query = new URLSearchParams(location.search);
    const mockIp = query.get('ip') || '192.168.1.50'; // Default mock IP for demo

    const [insertEvent] = useMutation(INSERT_LOGIN_EVENT);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

        try {
            // 1. Log the "attack" to the database
            await insertEvent({
                variables: {
                    username,
                    ip: mockIp,
                    success: false,
                    payload: {
                        is_honeypot: true,
                        user_agent: navigator.userAgent,
                        password_attempt: password, // Capture password for analysis
                        screen_res: `${window.screen.width}x${window.screen.height}`,
                        source: 'admin_portal_v2',
                        login_attempts: 1, // Simple counter
                        service: 'internal-admin',
                    },
                },
            });

            // 2. Always show failure
            setErrorMsg('Invalid credentials. This attempt has been logged.');
            setPassword('');

        } catch (err) {
            console.error('Honeypot logging error:', err);
            setErrorMsg('System error. Administrative alert sent.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 font-mono">
            {/* Old-school terminal style background effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-scanline"></div>
            </div>

            <div className="w-full max-w-md bg-[#111] border border-green-900/50 rounded-sm shadow-2xl p-8 relative overflow-hidden">
                {/* Decorative corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-700"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-700"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-700"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-700"></div>

                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-red-900/20 rounded-full mb-4 border border-red-900/50 animate-pulse">
                        <ShieldAlert className="w-12 h-12 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-200 tracking-wider">RESTRICTED ACCESS</h1>
                    <p className="text-red-500 text-xs mt-2 uppercase tracking-widest">Authorized Personnel Only</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-gray-500 text-xs uppercase flex items-center gap-2">
                            <Terminal className="w-3 h-3" /> System ID
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black border border-green-900/50 text-green-500 px-4 py-3 focus:outline-none focus:border-red-700 focus:shadow-[0_0_10px_rgba(185,28,28,0.2)] transition-all font-mono placeholder-green-900/30"
                            placeholder="admin@corp.internal"
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-500 text-xs uppercase flex items-center gap-2">
                            <Lock className="w-3 h-3" /> Access Key
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-green-900/50 text-green-500 px-4 py-3 focus:outline-none focus:border-red-700 focus:shadow-[0_0_10px_rgba(185,28,28,0.2)] transition-all font-mono placeholder-green-900/30"
                            placeholder="••••••••••••"
                        />
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-950/30 border-l-2 border-red-600 text-red-400 text-xs flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            {errorMsg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 py-3 uppercase tracking-widest text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(185,28,28,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying Credentials...' : 'Authenticate'}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-gray-900 pt-4">
                    <p className="text-[10px] text-gray-700">
                        WARNING: All activities on this system are monitored and recorded.
                        Unauthorized access attempts will be prosecuted to the full extent of the law.
                        <br />
                        System IP: {mockIp}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DecoyPage;
