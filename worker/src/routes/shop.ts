import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware } from '../middleware/auth';

type Variables = {
    user: {
        id: string;
        email: string;
        role: string;
        tenant_id: string;
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// List Products
app.get('/products', async (c) => {
    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM products WHERE is_active = 1 AND stock > 0 ORDER BY price_points ASC"
        ).all();

        return c.json({
            success: true,
            data: results
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch products' }, 500);
    }
});

// Redeem Product
app.post('/redeem', authMiddleware, async (c) => {
    const user = c.get('user');
    const { product_id, quantity = 1 } = await c.req.json();

    if (!product_id) return c.json({ error: 'Product ID required' }, 400);

    try {
        // 1. Get Product Details
        const product: any = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(product_id).first();

        if (!product) return c.json({ error: 'Product not found' }, 404);
        if (product.stock < quantity) return c.json({ error: 'Insufficient stock' }, 400);

        const totalCost = product.price_points * quantity;

        // 2. Check User Balance
        const userRec: any = await c.env.DB.prepare("SELECT points_balance FROM users WHERE id = ?").bind(user.id).first();
        if (!userRec || userRec.points_balance < totalCost) {
            return c.json({ error: 'Insufficient points' }, 400);
        }

        const orderId = crypto.randomUUID();

        // 3. Transaction: Deduct Points, Reduce Stock, Create Order
        const batch = [
            // Deduct Points
            c.env.DB.prepare("UPDATE users SET points_balance = points_balance - ? WHERE id = ?").bind(totalCost, user.id),

            // Reduce Stock
            c.env.DB.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").bind(quantity, product_id),

            // Create Order
            c.env.DB.prepare("INSERT INTO orders (id, user_id, total_points, status) VALUES (?, ?, ?, 'completed')").bind(orderId, user.id, totalCost),

            // Create Order Item
            c.env.DB.prepare("INSERT INTO order_items (id, order_id, product_id, quantity, price_points) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), orderId, product_id, quantity, product.price_points),

            // Log to Ledger
            c.env.DB.prepare("INSERT INTO points_ledger (id, user_id, transaction_type, amount, reference_type, reference_id, description, balance_after) VALUES (?, ?, 'redeem', ?, 'order', ?, ?, ?)")
                .bind(crypto.randomUUID(), user.id, -totalCost, orderId, `Redeem ${product.name}`, userRec.points_balance - totalCost)
        ];

        await c.env.DB.batch(batch);

        return c.json({
            success: true,
            message: 'Redemption successful',
            data: {
                order_id: orderId,
                points_deducted: totalCost,
                remaining_balance: userRec.points_balance - totalCost
            }
        });

    } catch (error) {
        console.error('Redeem error', error);
        return c.json({ success: false, error: 'Redemption failed' }, 500);
    }
});

// Get Order History
app.get('/orders', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT o.id, o.total_points, o.status, o.created_at, 
                   p.name as product_name, p.image_url 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `).bind(user.id).all();

        return c.json({
            success: true,
            data: results
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch orders' }, 500);
    }
});

export default app;
