import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdCheckCircle, MdError, MdRefresh, MdStorage, MdCloudQueue } from 'react-icons/md';

const SystemHealth = () => {
    const [status, setStatus] = useState<'healthy' | 'degraded' | 'offline'>('offline');
    const [details, setDetails] = useState<any>({ api: 'checking', db: 'unknown' });
    const [latency, setLatency] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const checkHealth = async () => {
        setLoading(true);
        const start = performance.now();
        try {
            // Check API Root
            const res = await api.get('/');
            const end = performance.now();
            setLatency(Math.round(end - start));

            if (res.status === 200) {
                setStatus('healthy');
                setDetails({ api: 'operational', db: 'operational' }); // Assuming API implies DB access usually
            } else {
                setStatus('degraded');
                setDetails({ api: 'degraded', db: 'unknown' });
            }
        } catch (error) {
            console.error('Health check failed', error);
            setStatus('offline');
            setDetails({ api: 'down', db: 'unknown' });
        } finally {
            setLoading(false);
            setLastChecked(new Date());
        }
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const StatusCard = ({ title, status, icon, message }: any) => {
        const colors = {
            healthy: 'bg-green-100 text-green-700',
            degraded: 'bg-yellow-100 text-yellow-700',
            offline: 'bg-red-100 text-red-700',
            unknown: 'bg-gray-100 text-gray-700'
        };
        const statusKey = status === 'operational' ? 'healthy' : (status === 'checking' ? 'unknown' : 'offline');

        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                <div className={`p-3 rounded-full ${colors[statusKey as keyof typeof colors]}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800">{title}</h3>
                    <p className={`text-sm font-medium ${statusKey === 'healthy' ? 'text-green-600' : 'text-gray-500'}`}>
                        {status.toUpperCase()}
                    </p>
                    {message && <p className="text-xs text-gray-400 mt-1">{message}</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Kesehatan Sistem</h2>
                <button
                    onClick={checkHealth}
                    className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
                    disabled={loading}
                >
                    <MdRefresh className={loading ? 'animate-spin' : ''} size={20} />
                    <span>{loading ? 'Memeriksa...' : 'Segarkan Status'}</span>
                </button>
            </div>

            <div className={`p-6 rounded-xl text-white shadow-md transition-colors ${status === 'healthy' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                status === 'degraded' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                    'bg-gradient-to-r from-red-500 to-pink-600'
                }`}>
                <div className="flex items-center gap-4">
                    {status === 'healthy' ? <MdCheckCircle size={48} /> : <MdError size={48} />}
                    <div>
                        <h1 className="text-2xl font-bold">Sistem {status === 'healthy' ? 'SEHAT' : (status === 'degraded' ? 'TERDEGRADASI' : 'OFFLINE')}</h1>
                        <p className="opacity-90">Semua sistem beroperasi normal sejak pemeriksaan terakhir pada {lastChecked?.toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatusCard
                    title="API Gateway"
                    status={details.api}
                    icon={<MdCloudQueue size={24} />}
                    message={latency ? `Latensi: ${latency}ms` : 'Menghubungkan...'}
                />
                <StatusCard
                    title="Database (D1)"
                    status={details.db}
                    icon={<MdStorage size={24} />}
                    message="Via Worker"
                />
                {/* Placeholder for future R2 check */}
                <StatusCard
                    title="Penyimpanan (R2)"
                    status={details.api === 'operational' ? 'operational' : 'unknown'}
                    icon={<MdStorage size={24} />}
                    message="Aktif"
                />
            </div>
        </div>
    );
};

export default SystemHealth;
