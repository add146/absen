import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdReceipt, MdDownload, MdCheckCircle, MdError, MdPending } from 'react-icons/md';
import DashboardLayout from '../../components/DashboardLayout';

const InvoiceHistory = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/subscriptions/invoices');
            setInvoices(res.data.invoices || []);
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setLoading(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            paid: 'bg-green-100 text-green-700',
            pending: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-700',
            open: 'bg-blue-100 text-blue-700',
            void: 'bg-gray-100 text-gray-700'
        };

        const icons: Record<string, any> = {
            paid: <MdCheckCircle />,
            pending: <MdPending />,
            failed: <MdError />
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${styles[status] || styles.void}`}>
                {icons[status]} <span className="capitalize">{status}</span>
            </span>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Riwayat Faktur</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Kelola riwayat tagihan langganan Anda</p>
                    </div>
                    <button
                        onClick={() => window.open(`${import.meta.env.VITE_API_URL}/admin/subscriptions/invoices?format=csv`, '_blank')}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        <MdDownload size={20} />
                        <span>Export CSV</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">ID Faktur</th>
                                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Tanggal</th>
                                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Jumlah</th>
                                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Memuat faktur...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Faktur tidak ditemukan.</td></tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 font-medium text-gray-800 dark:text-white flex items-center gap-2">
                                            <MdReceipt className="text-gray-400" />
                                            {inv.invoice_number || inv.id.substring(0, 8).toUpperCase()}
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">
                                            {new Date(inv.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">
                                            Rp {inv.amount_due ? inv.amount_due.toLocaleString() : '0'}
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={inv.status} />
                                        </td>
                                        <td className="p-4 text-right">
                                            {inv.invoice_url ? (
                                                <a
                                                    href={inv.invoice_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <MdDownload /> PDF
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default InvoiceHistory;
