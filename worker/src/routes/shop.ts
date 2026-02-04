import { Hono } from 'hono';
import { Bindings } from '../index';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';
import { WAHAService } from '../services/waha-service';

type Variables = {
    user: {
        sub: string;
        role: string;
        tenant_id?: string;
    }
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

// ============================================
// VALIDATION HELPERS
// ============================================

function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

function validateProductData(data: any): { valid: boolean; error?: string } {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        return { valid: false, error: 'Product name is required' };
    }
    if (!data.price_points || typeof data.price_points !== 'number' || data.price_points <= 0) {
        return { valid: false, error: 'Price points must be a positive number' };
    }
    if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) {
        return { valid: false, error: 'Stock must be a non-negative number' };
    }
    return { valid: true };
}

// ============================================
// USER ENDPOINTS
// ============================================

// List Products (Public - all active products with stock)
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
        console.error('Fetch products error:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch products',
            code: 'FETCH_PRODUCTS_ERROR'
        }, 500);
    }
});

// Redeem Product (Authenticated users only)
app.post('/redeem', authMiddleware, async (c) => {
    const user = c.get('user');

    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({
            success: false,
            error: 'Invalid JSON body',
            code: 'INVALID_JSON'
        }, 400);
    }

    const { product_id, quantity = 1 } = body;

    // Validation
    if (!product_id) {
        return c.json({
            success: false,
            error: 'Product ID required',
            code: 'MISSING_PRODUCT_ID'
        }, 400);
    }



    if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
        return c.json({
            success: false,
            error: 'Quantity must be a positive integer',
            code: 'INVALID_QUANTITY'
        }, 400);
    }

    try {
        // 1. Get Product Details
        const product: any = await c.env.DB.prepare(
            "SELECT * FROM products WHERE id = ? AND is_active = 1"
        ).bind(product_id).first();

        if (!product) {
            return c.json({
                success: false,
                error: 'Product not found or inactive',
                code: 'PRODUCT_NOT_FOUND'
            }, 404);
        }

        if (product.stock < quantity) {
            return c.json({
                success: false,
                error: `Insufficient stock. Available: ${product.stock}`,
                code: 'INSUFFICIENT_STOCK'
            }, 400);
        }

        const totalCost = product.price_points * quantity;

        // 2. Check User Balance
        const userRec: any = await c.env.DB.prepare(
            "SELECT points_balance FROM users WHERE id = ?"
        ).bind(user.sub).first();

        if (!userRec) {
            return c.json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            }, 404);
        }

        if (userRec.points_balance < totalCost) {
            return c.json({
                success: false,
                error: `Insufficient points. Required: ${totalCost}, Available: ${userRec.points_balance}`,
                code: 'INSUFFICIENT_POINTS'
            }, 400);
        }

        const orderId = crypto.randomUUID();
        const newBalance = userRec.points_balance - totalCost;

        // 3. Transaction: Deduct Points, Reduce Stock, Create Order
        const batch = [
            // Deduct Points
            c.env.DB.prepare(
                "UPDATE users SET points_balance = points_balance - ? WHERE id = ?"
            ).bind(totalCost, user.sub),

            // Reduce Stock
            c.env.DB.prepare(
                "UPDATE products SET stock = stock - ? WHERE id = ?"
            ).bind(quantity, product_id),

            // Create Order
            c.env.DB.prepare(
                "INSERT INTO orders (id, user_id, total_points, status) VALUES (?, ?, ?, 'completed')"
            ).bind(orderId, user.sub, totalCost),

            // Create Order Item
            c.env.DB.prepare(
                "INSERT INTO order_items (id, order_id, product_id, quantity, price_points) VALUES (?, ?, ?, ?, ?)"
            ).bind(crypto.randomUUID(), orderId, product_id, quantity, product.price_points),

            // Log to Ledger
            c.env.DB.prepare(
                "INSERT INTO points_ledger (id, user_id, transaction_type, amount, reference_type, reference_id, description, balance_after) VALUES (?, ?, 'redeem', ?, 'order', ?, ?, ?)"
            ).bind(
                crypto.randomUUID(),
                user.sub,
                -totalCost,
                orderId,
                `Redeem ${product.name} (${quantity}x)`,
                newBalance
            )
        ];

        await c.env.DB.batch(batch);

        console.log(`[REDEMPTION] User ${user.sub} redeemed ${quantity}x ${product.name} for ${totalCost} points`);

        // 4. Send WhatsApp Notification
        try {
            if (c.env.WAHA_BASE_URL && c.env.WAHA_SESSION) {
                // Get user phone
                const userDetails: any = await c.env.DB.prepare(
                    "SELECT phone, name FROM users WHERE id = ?"
                ).bind(user.sub).first();

                if (userDetails && userDetails.phone) {
                    const waha = new WAHAService({
                        baseUrl: c.env.WAHA_BASE_URL,
                        apiKey: c.env.WAHA_API_KEY,
                        sessionName: c.env.WAHA_SESSION
                    });

                    const message = `🎉 *Penukaran Poin Berhasil!* 🎉\n\nHalo ${userDetails.name},\nKamu telah berhasil menukar *${quantity}x ${product.name}* senilai *${totalCost} poin*.\n\nSisa Poin: ${newBalance}\nRef: ${orderId}\n\nTerima kasih atas kerja kerasmu! 💪`;

                    await waha.sendTextMessage(userDetails.phone, message);
                    console.log(`[WAHA] Notification sent to ${userDetails.phone}`);
                }
            }
        } catch (wahaError) {
            console.error('[WAHA] Failed to send notification:', wahaError);
            // Don't fail the request if notification fails
        }

        return c.json({
            success: true,
            message: 'Redemption successful',
            data: {
                order_id: orderId,
                product_name: product.name,
                quantity: quantity,
                points_deducted: totalCost,
                remaining_balance: newBalance
            }
        });

    } catch (error) {
        console.error('Redeem error:', error);
        return c.json({
            success: false,
            error: 'Redemption failed. Please try again.',
            code: 'REDEMPTION_ERROR'
        }, 500);
    }
});

// Get Order History (Authenticated users only)
app.get('/orders', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT o.id, o.total_points, o.status, o.created_at, 
                   oi.quantity,
                   p.name as product_name, p.image_url 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `).bind(user.sub).all();

        return c.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Fetch orders error:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch orders',
            code: 'FETCH_ORDERS_ERROR'
        }, 500);
    }
});

// ============================================
// ADMIN ENDPOINTS - Product Management
// ============================================

// List All Products (Admin only - includes inactive products)
app.get('/admin/products', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM products ORDER BY created_at DESC"
        ).all();

        return c.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Admin fetch products error:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch products',
            code: 'ADMIN_FETCH_PRODUCTS_ERROR'
        }, 500);
    }
});

// Create Product (Admin only)
app.post('/admin/products', authMiddleware, adminAuthMiddleware, async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({
            success: false,
            error: 'Invalid JSON body',
            code: 'INVALID_JSON'
        }, 400);
    }

    const validation = validateProductData(body);
    if (!validation.valid) {
        return c.json({
            success: false,
            error: validation.error,
            code: 'VALIDATION_ERROR'
        }, 400);
    }

    try {
        const productId = crypto.randomUUID();
        const { name, description, price_points, image_url, stock = 0 } = body;

        await c.env.DB.prepare(
            "INSERT INTO products (id, name, description, price_points, image_url, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
        ).bind(productId, name, description || null, price_points, image_url || null, stock).run();

        const product = await c.env.DB.prepare(
            "SELECT * FROM products WHERE id = ?"
        ).bind(productId).first();

        console.log(`[ADMIN] Product created: ${name} (${productId})`);

        return c.json({
            success: true,
            message: 'Product created successfully',
            data: product
        }, 201);
    } catch (error) {
        console.error('Create product error:', error);
        return c.json({
            success: false,
            error: 'Failed to create product',
            code: 'CREATE_PRODUCT_ERROR'
        }, 500);
    }
});

// Update Product (Admin only)
app.put('/admin/products/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const productId = c.req.param('id');

    if (!isValidUUID(productId)) {
        return c.json({
            success: false,
            error: 'Invalid product ID format',
            code: 'INVALID_PRODUCT_ID'
        }, 400);
    }

    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({
            success: false,
            error: 'Invalid JSON body',
            code: 'INVALID_JSON'
        }, 400);
    }

    try {
        // Check if product exists
        const existingProduct = await c.env.DB.prepare(
            "SELECT * FROM products WHERE id = ?"
        ).bind(productId).first();

        if (!existingProduct) {
            return c.json({
                success: false,
                error: 'Product not found',
                code: 'PRODUCT_NOT_FOUND'
            }, 404);
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];

        if (body.name !== undefined) {
            updates.push('name = ?');
            values.push(body.name);
        }
        if (body.description !== undefined) {
            updates.push('description = ?');
            values.push(body.description);
        }
        if (body.price_points !== undefined) {
            if (typeof body.price_points !== 'number' || body.price_points <= 0) {
                return c.json({
                    success: false,
                    error: 'Price points must be a positive number',
                    code: 'VALIDATION_ERROR'
                }, 400);
            }
            updates.push('price_points = ?');
            values.push(body.price_points);
        }
        if (body.image_url !== undefined) {
            updates.push('image_url = ?');
            values.push(body.image_url);
        }
        if (body.stock !== undefined) {
            if (typeof body.stock !== 'number' || body.stock < 0) {
                return c.json({
                    success: false,
                    error: 'Stock must be a non-negative number',
                    code: 'VALIDATION_ERROR'
                }, 400);
            }
            updates.push('stock = ?');
            values.push(body.stock);
        }
        if (body.is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(body.is_active ? 1 : 0);
        }

        if (updates.length === 0) {
            return c.json({
                success: false,
                error: 'No fields to update',
                code: 'NO_UPDATES'
            }, 400);
        }

        values.push(productId);

        await c.env.DB.prepare(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        const updatedProduct = await c.env.DB.prepare(
            "SELECT * FROM products WHERE id = ?"
        ).bind(productId).first();

        console.log(`[ADMIN] Product updated: ${productId}`);

        return c.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });
    } catch (error) {
        console.error('Update product error:', error);
        return c.json({
            success: false,
            error: 'Failed to update product',
            code: 'UPDATE_PRODUCT_ERROR'
        }, 500);
    }
});

// Delete Product (Admin only - soft delete)
app.delete('/admin/products/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const productId = c.req.param('id');

    if (!isValidUUID(productId)) {
        return c.json({
            success: false,
            error: 'Invalid product ID format',
            code: 'INVALID_PRODUCT_ID'
        }, 400);
    }

    try {
        const product = await c.env.DB.prepare(
            "SELECT * FROM products WHERE id = ?"
        ).bind(productId).first();

        if (!product) {
            return c.json({
                success: false,
                error: 'Product not found',
                code: 'PRODUCT_NOT_FOUND'
            }, 404);
        }

        // Soft delete
        await c.env.DB.prepare(
            "UPDATE products SET is_active = 0 WHERE id = ?"
        ).bind(productId).run();

        console.log(`[ADMIN] Product deleted (soft): ${productId}`);

        return c.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        return c.json({
            success: false,
            error: 'Failed to delete product',
            code: 'DELETE_PRODUCT_ERROR'
        }, 500);
    }
});

// ============================================
// ADMIN ENDPOINTS - Order Management
// ============================================

// List All Orders (Admin only)
app.get('/admin/orders', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const status = c.req.query('status');
        const userId = c.req.query('user_id');

        let query = `
            SELECT o.id, o.user_id, o.total_points, o.status, o.created_at,
                   u.name as user_name, u.email as user_email,
                   oi.quantity,
                   p.name as product_name, p.image_url
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
        `;

        const conditions: string[] = [];
        const params: any[] = [];

        if (status) {
            conditions.push('o.status = ?');
            params.push(status);
        }

        if (userId) {
            if (!isValidUUID(userId)) {
                return c.json({
                    success: false,
                    error: 'Invalid user ID format',
                    code: 'INVALID_USER_ID'
                }, 400);
            }
            conditions.push('o.user_id = ?');
            params.push(userId);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY o.created_at DESC';

        const { results } = await c.env.DB.prepare(query).bind(...params).all();

        return c.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Admin fetch orders error:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch orders',
            code: 'ADMIN_FETCH_ORDERS_ERROR'
        }, 500);
    }
});

// Update Order Status (Admin only)
app.patch('/admin/orders/:id', authMiddleware, adminAuthMiddleware, async (c) => {
    const orderId = c.req.param('id');

    if (!isValidUUID(orderId)) {
        return c.json({
            success: false,
            error: 'Invalid order ID format',
            code: 'INVALID_ORDER_ID'
        }, 400);
    }

    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({
            success: false,
            error: 'Invalid JSON body',
            code: 'INVALID_JSON'
        }, 400);
    }

    const { status } = body;

    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
        return c.json({
            success: false,
            error: 'Invalid status. Must be: pending, completed, or cancelled',
            code: 'INVALID_STATUS'
        }, 400);
    }

    try {
        const order = await c.env.DB.prepare(
            "SELECT * FROM orders WHERE id = ?"
        ).bind(orderId).first();

        if (!order) {
            return c.json({
                success: false,
                error: 'Order not found',
                code: 'ORDER_NOT_FOUND'
            }, 404);
        }

        await c.env.DB.prepare(
            "UPDATE orders SET status = ? WHERE id = ?"
        ).bind(status, orderId).run();

        console.log(`[ADMIN] Order ${orderId} status updated to: ${status}`);

        return c.json({
            success: true,
            message: 'Order status updated successfully',
            data: {
                order_id: orderId,
                status: status
            }
        });
    } catch (error) {
        console.error('Update order status error:', error);
        return c.json({
            success: false,
            error: 'Failed to update order status',
            code: 'UPDATE_ORDER_ERROR'
        }, 500);
    }
});

// Get Order Statistics (Admin only)
app.get('/admin/orders/stats', authMiddleware, adminAuthMiddleware, async (c) => {
    try {
        const totalOrders = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM orders"
        ).first() as any;

        const totalPointsRedeemed = await c.env.DB.prepare(
            "SELECT SUM(total_points) as total FROM orders WHERE status = 'completed'"
        ).first() as any;

        const pendingOrders = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
        ).first() as any;

        const completedOrders = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'completed'"
        ).first() as any;

        return c.json({
            success: true,
            data: {
                total_orders: totalOrders?.count || 0,
                total_points_redeemed: totalPointsRedeemed?.total || 0,
                pending_orders: pendingOrders?.count || 0,
                completed_orders: completedOrders?.count || 0
            }
        });
    } catch (error) {
        console.error('Fetch order stats error:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch order statistics',
            code: 'FETCH_STATS_ERROR'
        }, 500);
    }
});

// Get Points History (Authenticated users only)
app.get('/history', authMiddleware, async (c) => {
    const user = c.get('user');
    try {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
        ).bind(user.sub).all();

        return c.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Fetch points history error:', error);
        return c.json({
            success: false,
            error: 'Failed to fetch points history',
            code: 'FETCH_HISTORY_ERROR'
        }, 500);
    }
});

export default app;

