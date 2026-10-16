import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { config } from '../config.js'
import { deliver } from '../deliver.js'
import { TABS } from '../sheets.js'
import { read, ValidationError } from '../validate.js'

// POST /api/careers — the job application form (multipart, with the resume as `resume`).
// The phone layout asks for a company name and desktop for a contact number, so both are optional here.
// Vercel rejects request bodies over 4.5 MB, so the resume (plus the other fields) has to stay under that.
export const MAX_RESUME_MB = 4
const RESUME_TYPES = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_MB * 1024 * 1024, files: 1, fields: 20 },
  fileFilter: (req, file, done) => {
    const allowed = RESUME_TYPES[path.extname(file.originalname).toLowerCase()]
    // Some browsers send Word files as application/octet-stream, so trust the extension for those.
    if (allowed && (allowed.includes(file.mimetype) || file.mimetype === 'application/octet-stream')) done(null, true)
    else done(new ValidationError({ resume: 'Please attach your resume as a PDF or Word file.' }))
  },
})

const fields = {
  name: { label: 'Full name', required: true, max: 100 },
  email: { label: 'Email', required: true, type: 'email' },
  phone: { label: 'Contact number', max: 30 },
  company: { label: 'Company', max: 150 },
  role: { label: 'Applying for', required: true, max: 150 },
  linkedin: { label: 'LinkedIn', noun: 'LinkedIn profile link', required: true, type: 'url', max: 300 },
}

// Keeps the attachment name readable but safe in a mail header.
const safeName = (name) => name.replace(/[^\w.\- ()]+/g, '_').slice(-120)

export const careersRouter = Router().post('/', upload.single('resume'), async (req, res) => {
  const data = read(req.body, fields)
  if (!req.file) throw new ValidationError({ resume: 'Please attach your resume.' })
  const resume = { filename: safeName(req.file.originalname), content: req.file.buffer, contentType: req.file.mimetype }

  await deliver({
    to: config.recipients.careers,
    subject: `Job application: ${data.role}, ${data.name}`,
    label: 'CAREERS',
    heading: `New application for ${data.role}`,
    fields,
    data,
    note: `Resume attached: ${resume.filename}`,
    attachments: [resume],
    // The resume goes to the Drive folder, with its link in the row.
    record: { tab: TABS.careers, files: [resume] },
    // Approved Figma design "[Approved] Emailer - career" (node 15908:146).
    confirmation: {
      subject: 'We’ve received your application | Naxatra Labs',
      message:
        'Thank you for reaching out to Naxatra Labs.\nWe’ve received your application details and our team will get back to you shortly. We truly appreciate your interest in working with us and look forward to connecting with you.',
    },
  })
  res.json({ ok: true, message: 'Thank you! Your application has been sent. We’ve emailed you a confirmation.' })
})
