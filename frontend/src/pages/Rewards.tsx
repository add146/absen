import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
    MdAccountBalanceWallet,
    MdRedeem,
    MdCardGiftcard,
    MdStar
} from 'react-icons/md';
import DashboardLayout from '../components/DashboardLayout';

const Rewards: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, userRes, orderRes] = await Promise.all([
                api.get('/shop/products'),
                api.get('/auth/me'),
                api.get('/shop/orders')
            ]);

            setProducts(prodRes.data.data);
            setBalance(userRes.data.user.points_balance);
            setOrders(orderRes.data.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (product: any) => {
        if (balance < product.price_points) {
            alert('Poin Anda tidak mencukupi!');
            return;
        }

        if (!confirm(`Tukar ${product.price_points} poin untuk "${product.name}"?`)) return;

        try {
            await api.post('/shop/redeem', { product_id: product.id, quantity: 1 });
            alert('Penukaran berhasil!');
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Redemption failed');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Points & Rewards</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your earned points and redeem rewards.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white opacity-10 blur-xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-indigo-100 font-medium">Current Balance</span>
                                    <MdAccountBalanceWallet className="text-indigo-100 opacity-80 text-xl" />
                                </div>
                                <h2 className="text-4xl font-bold mb-1">
                                    {loading ? '...' : balance.toLocaleString()}
                                    <span className="text-xl font-normal opacity-80 ml-1">pts</span>
                                </h2>
                                <p className="text-indigo-100 text-sm mb-6">Keep earning points from attendance!</p>
                                <div className="flex gap-3">
                                    <button className="flex-1 bg-white text-primary font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                                        <MdRedeem className="text-sm" />
                                        Redeem
                                    </button>
                                    <button className="flex-1 bg-indigo-600 bg-opacity-40 text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-50 transition-colors border border-indigo-400 border-opacity-30">
                                        History
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Browse Rewards (Products) */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Available Rewards</h3>
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="text-center text-gray-500 py-4">Loading products...</div>
                                ) : products.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">No rewards available.</div>
                                ) : (
                                    products.map(product => (
                                        <div key={product.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer group transition-colors border border-transparent hover:border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">{product.name}</p>
                                                    <div className="flex items-center text-yellow-600 text-xs font-bold mt-0.5">
                                                        <MdStar className="mr-0.5" />
                                                        {product.price_points} pts
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRedeem(product)}
                                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md font-medium hover:bg-blue-100 transition-colors"
                                                disabled={product.stock === 0}
                                            >
                                                {product.stock === 0 ? 'Habis' : 'Tukar'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Activity History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Redemption History</h3>
                            </div>

                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Points</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {loading ? (
                                            <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading history...</td></tr>
                                        ) : orders.length === 0 ? (
                                            <tr><td colSpan={5} className="p-6 text-center text-gray-500">No redemption history yet.</td></tr>
                                        ) : (
                                            orders.map(order => (
                                                <HistoryRow
                                                    key={order.id}
                                                    icon={<MdCardGiftcard />}
                                                    title={order.product_name}
                                                    subtitle="Redemption"
                                                    date={new Date(order.created_at).toLocaleString()}
                                                    points={`-${order.total_points}`}
                                                    pointsColor="red"
                                                    status={order.status}
                                                    iconBg="purple"
                                                />
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

const HistoryRow = ({ icon, title, subtitle, date, points, pointsColor, status, iconBg }: any) => {
    const iconBgs: any = {
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBgs[iconBg] || iconBgs.gray}`}>
                        <span className="text-sm">{icon}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {date}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className={`${pointsColor === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'} font-bold`}>{points}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {status}
                </span>
            </td>
        </tr>
    );
};

export default Rewards;
