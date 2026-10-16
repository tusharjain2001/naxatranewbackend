import { Router } from 'express'
import { config } from '../config.js'
import { deliver } from '../deliver.js'
import { TABS } from '../sheets.js'
import { verifyRecaptcha } from '../recaptcha.js'
import { read } from '../validate.js'

// POST /api/newsletter — the footer sign-up: { email, captcha }. There's no database yet, so each
// sign-up is emailed to the team inbox (and the subscriber gets a welcome email).
const fields = {
  email: { label: 'Email', required: true, type: 'email' },
}

export const newsletterRouter = Router().post('/', async (req, res) => {
  const data = read(req.body, fields)
  await verifyRecaptcha(req.body?.captcha, req.ip)

  await deliver({
    to: config.recipients.newsletter,
    subject: `New newsletter subscriber: ${data.email}`,
    label: 'NEWSLETTER',
    heading: 'New newsletter subscriber',
    fields,
    data,
    record: { tab: TABS.newsletter },
    confirmation: {
      subject: 'You’re subscribed to the Naxatra Labs newsletter',
      heading: 'Welcome aboard',
      message: 'Thanks for joining the Naxatra Labs newsletter. We’ll share articles on the projects our engineers are working on, straight to your inbox.',
    },
  })
  res.json({ ok: true, message: 'Thank you for joining the newsletter.' })
})
