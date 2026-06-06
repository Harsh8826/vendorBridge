import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import invoiceRoutes from './routes/invoices.js'
import analyticsRoutes from './routes/analytics.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vendorbridge-api' })
})

app.use('/api/invoices', invoiceRoutes)
app.use('/api/analytics', analyticsRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`VendorBridge API running on http://localhost:${PORT}`)
})
