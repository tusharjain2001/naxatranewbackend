import { Router } from 'express'
import { config } from '../config.js'
import { datasheetFor, MOTORS } from '../datasheets.js'
import { confirmationEmail, teamEmail } from '../emails.js'
import { sendMail } from '../mailer.js'
import { read } from '../validate.js'

// POST /api/datasheet — the "Request data-sheet" form on each motor page. `motor` names the motor the visitor
// was looking at; its PDF (see datasheets.js) is emailed to them, and the team gets the lead.
const fields = {
  firstName: { label: 'First name', required: true, max: 60 },
  lastName: { label: 'Last name', required: true, max: 60 },
  company: { label: 'Company', required: true, max: 150 },
  email: { label: 'Email', required: true, type: 'email' },
  motor: { label: 'Motor', required: true, oneOf: MOTORS },
  page: { label: 'Sent from page', max: 200 },
}

// How the lead reads in the team email.
const teamFields = {
  name: { label: 'Full name' },
  email: { label: 'Email', type: 'email' },
  company: { label: 'Company' },
  motor: { label: 'Data-sheet for' },
  page: { label: 'Sent from page' },
}

export const datasheetRouter = Router().post('/', async (req, res) => {
  const data = read(req.body, fields)
  const name = `${data.firstName} ${data.lastName}`
  const visitor = { name, address: data.email }
  const sheet = await datasheetFor(data.motor)
  const label = 'DATA-SHEET'

  const visitorMail = () =>
    sendMail({
      to: visitor,
      // Replies go to the team inbox, not the sending mailbox.
      replyTo: config.recipients.datasheet,
      subject: sheet ? `Your ${data.motor} data-sheet | Naxatra Labs` : 'We’ve received your data-sheet request | Naxatra Labs',
      ...confirmationEmail({
        label,
        name,
        message: sheet
          ? `Thank you for your interest in Naxatra Labs.\nPlease find the ${data.motor} data-sheet attached to this email. If you have any questions or would like to discuss your application, just reply to this email and our team will get back to you.`
          : `Thank you for your interest in Naxatra Labs.\nWe’ve received your request for the ${data.motor} data-sheet and our team will send it to you shortly.`,
      }),
      attachments: sheet ? [sheet] : undefined,
    })

  const teamMail = () =>
    sendMail({
      to: config.recipients.datasheet,
      replyTo: visitor,
      subject: `Data-sheet request: ${data.motor}, ${name}, ${data.company}`,
      ...teamEmail({
        label: 'DATA-SHEET REQUEST',
        heading: `New data-sheet request for ${data.motor}`,
        fields: teamFields,
        data: { ...data, name },
        note: sheet
          ? `The ${data.motor} data-sheet (${sheet.filename}) was emailed to them automatically.`
          : `There is no data-sheet on file for ${data.motor} yet, so nothing was sent. Please reply with it.`,
      }),
    })

  // When there's a sheet, it's what the visitor asked for, so their email must go through and the team copy is
  // only logged on failure. Without one, the team email is the request itself, so that one must go through.
  const [first, second] = sheet ? [visitorMail, teamMail] : [teamMail, visitorMail]
  await first()
  try {
    await second()
  } catch (err) {
    console.error(`[mail] Data-sheet ${sheet ? 'team copy' : 'confirmation'} for ${data.email} failed: ${err.message}`)
  }

  res.json({
    ok: true,
    message: sheet
      ? `Thank you! We’ve emailed the ${data.motor} data-sheet to ${data.email}.`
      : `Thank you! Our team will email you the ${data.motor} data-sheet shortly.`,
  })
})
