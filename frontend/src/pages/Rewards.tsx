import { useEffect, useState } from 'react';
import api from '../services/api';
import { MdStar, MdShoppingBag, MdHistory, MdConfirmationNumber } from 'react-icons/md';

const Rewards = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Parallel fetch: products, user balance, order history
            const [prodRes, userRes, orderRes] = await Promise.all([
                api.get('/shop/products'),
                api.get('/auth/me'),
                api.get('/shop/orders')
            ]);

            setProducts(prodRes.data.data);
            setBalance(userRes.data.user.points_balance);
            setOrders(orderRes.data.data);
        } catch (error) {
            console.error('Failed to fetch shop data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (productId: string, price: number) => {
        if (balance < price) {
            alert('Poin Anda tidak mencukupi!');
            return;
        }

        if (!confirm('Apakah Anda yakin, ingin menukarkan poin untuk item ini?')) return;

        try {
            await api.post('/shop/redeem', { product_id: productId, quantity: 1 });
            alert('Penukaran berhasil!');
            fetchData(); // Refresh data
        } catch (error: any) {
            alert(error.response?.data?.error || 'Redemption failed');
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold">Rewards Shop</h1>
                    <p className="opacity-90 mt-1">Tukarkan poin kehadiranmu dengan hadiah menarik!</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-xl border border-white/30 text-center">
                    <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Saldo Poin</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <MdStar className="text-yellow-300 text-2xl" />
                        <span className="text-3xl font-extrabold">{balance.toLocaleString()}</span>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'catalog' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <MdShoppingBag /> Katalog
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <MdHistory /> Riwayat
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500 animate-pulse">Loading rewards...</div>
            ) : activeTab === 'catalog' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm">
                                    Stok: {product.stock}
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center text-yellow-600 font-bold text-xl">
                                        <MdStar className="mr-1" />
                                        {product.price_points}
                                    </div>
                                    <button
                                        onClick={() => handleRedeem(product.id, product.price_points)}
                                        disabled={product.stock === 0 || balance < product.price_points}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${product.stock === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                                balance < product.price_points ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                                    'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                            }`}
                                    >
                                        {product.stock === 0 ? 'Habis' : 'Tukar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {orders.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">Belum ada riwayat penukaran.</div>
                    ) : (
                        <div className="divide-y">
                            {orders.map((order) => (
                                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <img src={order.image_url} alt={order.product_name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{order.product_name}</h4>
                                            <p className="text-xs text-gray-500">
                                                {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end text-red-600 font-bold mb-1">
                                            -{order.total_points} Pts
                                        </div>
                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold capitalize">
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Rewards;
