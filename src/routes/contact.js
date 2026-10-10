import { Router } from 'express'
import { config } from '../config.js'
import { deliver } from '../deliver.js'
import { read } from '../validate.js'

// POST /api/contact — the Contact page enquiry form (one form, four topic tabs).
export const TOPICS = ['Motors Enquiry', 'Investment', 'Partnership', 'Others']
// How each topic reads in the team email's subject and heading.
const KIND = { 'Motors Enquiry': 'motor', Investment: 'investment', Partnership: 'partnership', Others: 'general' }

const fields = {
  topic: { label: 'Enquiry type', required: true, oneOf: TOPICS },
  name: { label: 'Full name', required: true, max: 100 },
  email: { label: 'Email', required: true, type: 'email' },
  company: { label: 'Company', required: true, max: 150 },
  application: { label: 'Application type', max: 100 },
  message: { label: 'Message', multiline: true },
}

export const contactRouter = Router().post('/', async (req, res) => {
  const data = read(req.body, fields)
  const to = config.recipients.contactByTopic[data.topic]?.length ? config.recipients.contactByTopic[data.topic] : config.recipients.contact

  await deliver({
    to,
    subject: `New ${KIND[data.topic]} enquiry: ${data.name}, ${data.company}`,
    label: 'CONTACT FORM',
    heading: `New ${KIND[data.topic]} enquiry from the website`,
    fields,
    data,
    confirmation: {
      subject: 'We’ve received your enquiry | Naxatra Labs',
      message:
        'Thank you for reaching out to Naxatra Labs.\nWe’ve received your inquiry and our team will get back to you shortly. We appreciate your interest in our work and look forward to connecting with you.',
    },
  })
  res.json({ ok: true, message: 'Thank you! We’ve received your enquiry and sent a confirmation to your email.' })
})
