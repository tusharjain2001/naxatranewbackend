import { Router } from 'express'
import { config } from '../config.js'
import { deliver } from '../deliver.js'
import { read } from '../validate.js'

// POST /api/spec-enquiry — the "Share your specs" form on the industry, Drone and Products pages.
// `page` is the site path the form was sent from, so the team knows which page the lead came in on.
const fields = {
  name: { label: 'Full name', required: true, max: 100 },
  email: { label: 'Email', required: true, type: 'email' },
  company: { label: 'Company', required: true, max: 150 },
  application: { label: 'Application type', max: 100 },
  message: { label: 'Message', multiline: true },
  page: { label: 'Sent from page', max: 200 },
}

export const specEnquiryRouter = Router().post('/', async (req, res) => {
  const data = read(req.body, fields)
  const { page, ...shared } = fields

  await deliver({
    to: config.recipients.specEnquiry,
    subject: `New motor spec enquiry: ${data.name}, ${data.company}`,
    label: 'SPEC ENQUIRY',
    heading: 'New motor spec enquiry from the website',
    fields,
    data,
    confirmation: {
      subject: 'We’ve received your requirements | Naxatra Labs',
      heading: 'Thanks for sharing your requirements',
      message: 'Our engineers will review your application and get back to you with the right motor options shortly.',
      fields: shared,
    },
  })
  res.json({ ok: true, message: 'Thank you! Our engineers will get back to you shortly. We’ve sent a confirmation to your email.' })
})
