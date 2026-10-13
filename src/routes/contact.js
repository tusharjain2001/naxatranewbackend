import { Router } from 'express'
import { config } from '../config.js'
import { deliver } from '../deliver.js'
import { read } from '../validate.js'

// POST /api/contact — the Contact page enquiry form (one form, four topic tabs).
export const TOPICS = ['Motors Enquiry', 'Investment', 'Partnership', 'Others']

// What each tab asks, as the website's form does: `kind` is how the topic reads in the team email's subject and
// heading; the company field (required only for motors), the dropdown (sent as `application`) and the message box
// carry their own labels per tab.
const FORMS = {
  'Motors Enquiry': {
    kind: 'motor',
    company: { label: 'Company', required: true },
    application: { label: 'Application type' },
    message: { label: 'Requirements' },
  },
  Investment: {
    kind: 'investment',
    company: { label: 'Organization / fund name' },
    application: { label: 'Investment type', oneOf: ['VC', 'Angel Investor', 'Family Office', 'Corporate / Strategic Investor', 'Other'] },
    message: { label: 'Investment interest' },
  },
  Partnership: {
    kind: 'partnership',
    company: { label: 'Company / organization' },
    application: {
      label: 'Partnership type',
      oneOf: ['OEM Collaboration', 'Technology / R&D', 'Manufacturing', 'Distribution / Channel', 'Supply Chain', 'Strategic Alliance', 'Other'],
    },
    message: { label: 'Proposal' },
  },
  Others: {
    kind: 'general',
    company: { label: 'Company' },
    application: { label: 'Enquiry type', oneOf: ['General Question', 'Media / Press', 'Careers', 'Supplier Enquiry', 'Technical Support', 'Other'] },
    message: { label: 'Message' },
  },
}

const fieldsFor = (form) => ({
  topic: { label: 'Topic', required: true, oneOf: TOPICS },
  name: { label: 'Full name', required: true, max: 100 },
  email: { label: 'Email', required: true, type: 'email' },
  company: { max: 150, ...form.company },
  application: { max: 100, ...form.application },
  message: { multiline: true, ...form.message },
})

export const contactRouter = Router().post('/', async (req, res) => {
  // The topic picks the rest of the fields, so it's checked first.
  const { topic } = read(req.body, { topic: { label: 'Topic', required: true, oneOf: TOPICS } })
  const form = FORMS[topic]
  const fields = fieldsFor(form)
  const data = read(req.body, fields)
  const to = config.recipients.contactByTopic[topic]?.length ? config.recipients.contactByTopic[topic] : config.recipients.contact
  const from = data.company ? `${data.name}, ${data.company}` : data.name

  await deliver({
    to,
    subject: `New ${form.kind} enquiry: ${from}`,
    // The header tag names the chosen tab (Motors Enquiry / Investment / Partnership / Others).
    label: topic.toUpperCase(),
    heading: `New ${form.kind} enquiry from the website`,
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
