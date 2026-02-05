import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { MdAdd, MdCheckCircle, MdError, MdDelete, MdDomain, MdRefresh, MdContentCopy } from 'react-icons/md';

interface CustomDomain {
    id: string;
    domain: string;
    status: 'pending' | 'verifying' | 'active' | 'failed';
    created_at: string;
    dns_records: any;
}

const CustomDomains: React.FC = () => {
    const [domains, setDomains] = useState<CustomDomain[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDomains();
    }, []);

    const fetchDomains = async () => {
        try {
            const res = await api.get('/custom-domains');
            setDomains(res.data.domains);
        } catch (err) {
            console.error('Failed to fetch domains', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await api.post('/custom-domains', { domain: newDomain });
            setNewDomain('');
            fetchDomains();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal menambahkan domain');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, domainName: string) => {
        if (!window.confirm(`Yakin ingin menghapus domain ${domainName}?`)) return;

        try {
            await api.delete(`/custom-domains/${id}`);
            setDomains(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            alert('Gagal menghapus domain');
        }
    };

    const handleVerify = async (id: string) => {
        try {
            // Optimistic update
            setDomains(prev => prev.map(d => d.id === id ? { ...d, status: 'verifying' } : d));

            const res = await api.post(`/custom-domains/${id}/verify`);

            // Update with result
            if (res.data.domain) {
                setDomains(prev => prev.map(d => d.id === id ? res.data.domain : d));
            }

            if (res.data.domain.status === 'active') {
                alert('Domain berhasil diverifikasi!');
            } else {
                alert('Verifikasi belum berhasil. Pastikan DNS record sudah benar.');
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Gagal verifikasi');
            fetchDomains(); // Revert/Refresh
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Disalin ke clipboard!');
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Domains</h1>
                <p className="text-gray-500 dark:text-gray-400">Gunakan domain Anda sendiri untuk mengakses aplikasi (Branding Anda).</p>
            </div>

            {/* Add Domain Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Tambah Domain Baru</h2>
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
                        <MdError className="mr-2" /> {error}
                    </div>
                )}
                <form onSubmit={handleAddDomain} className="flex gap-4">
                    <div className="flex-1 relative">
                        <MdDomain className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="contoh: absen.kantorku.com"
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={isSubmitting}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center disabled:opacity-70"
                    >
                        {isSubmitting ? 'Menambahkan...' : <><MdAdd className="mr-2" /> Tambah Domain</>}
                    </button>
                </form>
            </div>

            {/* Domain List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Memuat domain...</div>
                ) : domains.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MdDomain className="text-3xl" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Belum ada domain</h3>
                        <p className="text-gray-500 text-sm">Tambahkan domain pertama Anda di atas</p>
                    </div>
                ) : (
                    domains.map((domain) => (
                        <div key={domain.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{domain.domain}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                                            ${domain.status === 'active' ? 'bg-green-100 text-green-700' :
                                                domain.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {domain.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">Ditambahkan pada: {new Date(domain.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleVerify(domain.id)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg tooltip"
                                        title="Verifikasi Ulang"
                                    >
                                        <MdRefresh size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(domain.id, domain.domain)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Hapus Domain"
                                    >
                                        <MdDelete size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Verification Instructions */}
                            {domain.status !== 'active' && (
                                <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Instruksi DNS Configuration</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        Tambahkan CNAME record berikut pada penyedia DNS domain Anda:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                            <span className="block text-xs text-gray-400 mb-1 uppercase">Type</span>
                                            <span className="font-mono font-bold">CNAME</span>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                            <span className="block text-xs text-gray-400 mb-1 uppercase">Name / Host</span>
                                            <div className="flex justify-between items-center">
                                                <span className="font-mono font-bold">{domain.domain}</span>
                                                <button onClick={() => copyToClipboard(domain.domain)} className="text-gray-400 hover:text-blue-500"><MdContentCopy /></button>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                                            <span className="block text-xs text-gray-400 mb-1 uppercase">Value / Target</span>
                                            <div className="flex justify-between items-center">
                                                <span className="font-mono font-bold text-blue-600">absen-api.khibroh.workers.dev</span>
                                                <button onClick={() => copyToClipboard("absen-api.khibroh.workers.dev")} className="text-gray-400 hover:text-blue-500"><MdContentCopy /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => handleVerify(domain.id)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Saya sudah update DNS
                                        </button>
                                    </div>
                                </div>
                            )}

                            {domain.status === 'active' && (
                                <div className="mt-4 flex items-center text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                                    <MdCheckCircle className="mr-2" />
                                    <span className="text-sm font-medium">Domain aktif dan siap digunakan.</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CustomDomains;
