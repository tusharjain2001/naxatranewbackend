import { sendMail } from './mailer.js'
import { confirmationEmail, teamEmail } from './emails.js'
import { recordSubmission } from './sheets.js'

// Sends a submission to the team inbox, then a confirmation to the person who sent it.
// The team email must go through; a failed confirmation is only logged, since the submission itself arrived.
// `record` ({ tab, files? }) also writes it to the Google Sheet, alongside the emails; that never fails the send.
export async function deliver({ to, subject, label, heading, fields, data, attachments, note, confirmation, record }) {
  const recording = record && recordSubmission({ ...record, fields, data })
  try {
    await send({ to, subject, label, heading, fields, data, attachments, note, confirmation })
  } finally {
    await recording
  }
}

async function send({ to, subject, label, heading, fields, data, attachments, note, confirmation }) {
  const team = teamEmail({ label, heading, fields, data, note })
  await sendMail({
    to,
    replyTo: data.name ? { name: data.name, address: data.email } : data.email,
    subject,
    ...team,
    attachments,
  })

  try {
    const mail = confirmationEmail({ label, name: data.name, ...confirmation })
    await sendMail({
      to: data.name ? { name: data.name, address: data.email } : data.email,
      subject: confirmation.subject,
      ...mail,
    })
  } catch (err) {
    console.error(`[mail] Confirmation to ${data.email} failed: ${err.message}`)
  }
}
