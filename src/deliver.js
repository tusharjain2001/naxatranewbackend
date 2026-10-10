import { sendMail } from './mailer.js'
import { confirmationEmail, teamEmail } from './emails.js'

// Sends a submission to the team inbox, then a confirmation to the person who sent it.
// The team email must go through; a failed confirmation is only logged, since the submission itself arrived.
export async function deliver({ to, subject, heading, fields, data, attachments, note, confirmation }) {
  const team = teamEmail({ heading, fields, data, note })
  await sendMail({
    to,
    replyTo: data.name ? { name: data.name, address: data.email } : data.email,
    subject,
    ...team,
    attachments,
  })

  try {
    const mail = confirmationEmail({ name: data.name, ...confirmation, data })
    await sendMail({
      to: data.name ? { name: data.name, address: data.email } : data.email,
      subject: confirmation.subject,
      ...mail,
    })
  } catch (err) {
    console.error(`[mail] Confirmation to ${data.email} failed: ${err.message}`)
  }
}
