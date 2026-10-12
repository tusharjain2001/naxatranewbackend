// The Express app with all form routes. Exported without listening: src/server.js runs it locally (or on any
// Node host) and api/index.js hands it to Vercel as a serverless function.
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { ValidationError } from './validate.js'
import { careersRouter, MAX_RESUME_MB } from './routes/careers.js'
import { contactRouter } from './routes/contact.js'
import { newsletterRouter } from './routes/newsletter.js'
import { specEnquiryRouter } from './routes/spec-enquiry.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', config.trustProxy)

app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST'] }))
app.use(express.json({ limit: '50kb' }))
app.use(express.urlencoded({ extended: false, limit: '50kb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Each form has its own limit per IP, so a burst on one doesn't block the others.
const limited = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.rateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { ok: false, message: 'Too many submissions. Please try again in a few minutes.' },
  })

app.use('/api/contact', limited(), contactRouter)
app.use('/api/spec-enquiry', limited(), specEnquiryRouter)
app.use('/api/careers', limited(), careersRouter)
app.use('/api/newsletter', limited(), newsletterRouter)

app.use((req, res) => res.status(404).json({ ok: false, message: 'Not found.' }))

// Validation problems go back to the form as a message; anything else is logged and kept generic.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err instanceof ValidationError) return res.status(400).json({ ok: false, message: err.message, errors: err.errors })
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? `Your resume must be ${MAX_RESUME_MB} MB or smaller.` : 'Please attach a single resume file.'
    return res.status(400).json({ ok: false, message })
  }
  if (err.type === 'entity.too.large' || err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, message: 'Invalid request.' })
  if (err.expose) return res.status(err.status ?? 400).json({ ok: false, message: err.message })
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err)
  res.status(500).json({ ok: false, message: 'Something went wrong on our side. Please try again, or email us directly.' })
})

export default app
