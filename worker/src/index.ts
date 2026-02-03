import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import attendance from './routes/attendance'
import admin from './routes/admin'
import shop from './routes/shop'

export type Bindings = {
    DB: D1Database
    JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/', (c) => {
    return c.json({ message: 'Absen API is running' })
})

app.route('/auth', auth)
app.route('/attendance', attendance)
app.route('/admin', admin)
app.route('/shop', shop)

export default app
