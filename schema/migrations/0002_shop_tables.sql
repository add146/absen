CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_points INTEGER NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    total_points INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_points INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Insert Dummy Products
INSERT INTO products (id, name, description, price_points, image_url, stock) VALUES
('prod_01', 'Voucher Belanja 50rb', 'Voucher belanja Alfamart/Indomaret senilai Rp 50.000', 500, 'https://placehold.co/400x300?text=Voucher+50rb', 50),
('prod_02', 'Cuti Tambahan 1 Hari', 'Dapatkan jatah cuti tambahan selama 1 hari kerja', 1000, 'https://placehold.co/400x300?text=Extra+Leave', 20),
('prod_03', 'Mug Eksklusif', 'Mug keramik premium dengan logo perusahaan', 300, 'https://placehold.co/400x300?text=Mug', 100),
('prod_04', 'E-Wallet 100rb', 'Saldo Gopay/Ovo senilai Rp 100.000', 950, 'https://placehold.co/400x300?text=E-Wallet+100rb', 30);
