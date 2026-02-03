import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    MdAdd,
    MdEdit,
    MdDelete,
    MdInventory,
    MdSearch,
    MdClose
} from 'react-icons/md';

interface Product {
    id: string;
    name: string;
    description: string | null;
    price_points: number;
    image_url: string | null;
    stock: number;
    is_active: number;
    created_at: number;
}

const ProductManagement: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_points: 0,
        image_url: '',
        stock: 0
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/shop/admin/products');
            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
            alert('Gagal memuat produk');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || formData.price_points <= 0) {
            alert('Nama produk dan harga poin harus diisi dengan benar');
            return;
        }

        try {
            if (editingProduct) {
                // Update
                await api.put(`/shop/admin/products/${editingProduct.id}`, formData);
                alert('Produk berhasil diupdate!');
            } else {
                // Create
                await api.post('/shop/admin/products', formData);
                alert('Produk berhasil ditambahkan!');
            }
            closeModal();
            fetchProducts();
        } catch (error: any) {
            console.error('Failed to save product:', error);
            alert(error.response?.data?.error || 'Gagal menyimpan produk');
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            price_points: product.price_points,
            image_url: product.image_url || '',
            stock: product.stock
        });
        setShowModal(true);
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Yakin ingin menghapus produk "${product.name}"?`)) return;

        try {
            await api.delete(`/shop/admin/products/${product.id}`);
            alert('Produk berhasil dihapus!');
            fetchProducts();
        } catch (error) {
            console.error('Failed to delete product:', error);
            alert('Gagal menghapus produk');
        }
    };

    const handleToggleActive = async (product: Product) => {
        try {
            await api.put(`/shop/admin/products/${product.id}`, {
                is_active: product.is_active === 1 ? 0 : 1
            });
            fetchProducts();
        } catch (error) {
            console.error('Failed to toggle active status:', error);
            alert('Gagal mengubah status produk');
        }
    };

    const openAddModal = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            description: '',
            price_points: 0,
            image_url: '',
            stock: 0
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingProduct(null);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeProducts = products.filter(p => p.is_active === 1).length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

    if (loading) {
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
                <h1 className="text-3xl font-bold text-gray-800">Manajemen Produk</h1>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <MdAdd size={20} />
                    Tambah Produk
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Produk</p>
                            <p className="text-3xl font-bold text-gray-800">{products.length}</p>
                        </div>
                        <MdInventory size={40} className="text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Produk Aktif</p>
                            <p className="text-3xl font-bold text-green-600">{activeProducts}</p>
                        </div>
                        <MdInventory size={40} className="text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Stok</p>
                            <p className="text-3xl font-bold text-purple-600">{totalStock}</p>
                        </div>
                        <MdInventory size={40} className="text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari produk..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Gambar</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nama</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Deskripsi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Harga (Poin)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Stok</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Tidak ada produk ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-16 h-16 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                                    <MdInventory className="text-gray-400" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{product.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 max-w-xs truncate">
                                                {product.description || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-blue-600">{product.price_points}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(product)}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${product.is_active === 1
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {product.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <MdEdit size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Hapus"
                                                >
                                                    <MdDelete size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <MdClose size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Produk *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Contoh: Voucher Belanja 50rb"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Deskripsi
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Deskripsi produk..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Harga (Poin) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.price_points}
                                            onChange={(e) => setFormData({ ...formData, price_points: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Stok
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        URL Gambar
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    {formData.image_url && (
                                        <img
                                            src={formData.image_url}
                                            alt="Preview"
                                            className="mt-2 w-32 h-32 object-cover rounded"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=Invalid+URL';
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="flex justify-end gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                    >
                                        {editingProduct ? 'Update' : 'Tambah'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;
