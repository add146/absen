import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    MdShoppingCart,
    MdFilterList,
    MdDownload,
    MdSearch,
    MdCheckCircle,
    MdPending,
    MdCancel
} from 'react-icons/md';

interface Order {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    product_name: string;
    quantity: number;
    total_points: number;
    status: string;
    created_at: number;
    image_url?: string;
}

interface OrderStats {
    total_orders: number;
    total_points_redeemed: number;
    pending_orders: number;
    completed_orders: number;
}

const OrderManagement: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<OrderStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchOrders();
        fetchStats();
    }, [statusFilter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const url = statusFilter !== 'all'
                ? `/shop/admin/orders?status=${statusFilter}`
                : '/shop/admin/orders';
            const response = await api.get(url);
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            alert('Gagal memuat orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/shop/admin/orders/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        if (!confirm(`Ubah status order ke "${newStatus}"?`)) return;

        try {
            await api.patch(`/shop/admin/orders/${orderId}`, { status: newStatus });
            alert('Status order berhasil diupdate!');
            fetchOrders();
            fetchStats();
        } catch (error: any) {
            console.error('Failed to update order status:', error);
            alert(error.response?.data?.error || 'Gagal mengupdate status order');
        }
    };

    const handleExportCSV = () => {
        // Simple CSV export
        const csvHeaders = ['Order ID', 'Pengguna', 'Email', 'Produk', 'Jumlah', 'Poin', 'Status', 'Tanggal'];
        const csvRows = filteredOrders.map(order => [
            order.id,
            order.user_name,
            order.user_email,
            order.product_name,
            order.quantity,
            order.total_points,
            order.status,
            new Date(order.created_at * 1000).toLocaleString('id-ID')
        ]);

        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const filteredOrders = orders.filter(order =>
        order.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <MdPending /> },
            completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <MdCheckCircle /> },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <MdCancel /> }
        };
        const badge = badges[status as keyof typeof badges] || badges.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                {badge.icon}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (loading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Manajemen Order</h1>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                    <MdDownload size={20} />
                    Export CSV
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Order</p>
                                <p className="text-3xl font-bold text-gray-800">{stats.total_orders}</p>
                            </div>
                            <MdShoppingCart size={40} className="text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Poin Ditukar</p>
                                <p className="text-3xl font-bold text-purple-600">{stats.total_points_redeemed.toLocaleString()}</p>
                            </div>
                            <MdShoppingCart size={40} className="text-purple-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Pending</p>
                                <p className="text-3xl font-bold text-yellow-600">{stats.pending_orders}</p>
                            </div>
                            <MdPending size={40} className="text-yellow-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Selesai</p>
                                <p className="text-3xl font-bold text-green-600">{stats.completed_orders}</p>
                            </div>
                            <MdCheckCircle size={40} className="text-green-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cari user, email, atau produk..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="relative">
                        <MdFilterList className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="all">Semua Status</option>
                            <option value="pending">Tertunda (Pending)</option>
                            <option value="completed">Selesai (Completed)</option>
                            <option value="cancelled">Dibatalkan (Cancelled)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Produk</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Poin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tanggal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        Tidak ada order ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-mono text-gray-600">
                                                {order.id.substring(0, 8)}...
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{order.user_name}</div>
                                                <div className="text-sm text-gray-500">{order.user_email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {order.image_url && (
                                                    <img
                                                        src={order.image_url}
                                                        alt={order.product_name}
                                                        className="w-10 h-10 object-cover rounded"
                                                    />
                                                )}
                                                <span className="text-sm text-gray-900">{order.product_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900">{order.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-blue-600">{order.total_points.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {new Date(order.created_at * 1000).toLocaleDateString('id-ID', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.id, 'completed')}
                                                        className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                    >
                                                        Selesaikan
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                                        className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                    >
                                                        Batalkan
                                                    </button>
                                                </div>
                                            )}
                                            {order.status !== 'pending' && (
                                                <span className="text-xs text-gray-500">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600 text-center">
                Menampilkan {filteredOrders.length} dari {orders.length} order
            </div>
        </div>
    );
};

export default OrderManagement;
