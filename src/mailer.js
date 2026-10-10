import nodemailer from 'nodemailer'
import { config } from './config.js'

// Real SMTP when configured; otherwise a JSON transport that only logs what would have been sent.
export const previewMode = !config.smtp
// A pooled connection only helps a long-running server; serverless functions (Vercel) open one per send.
const transport = previewMode
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({ ...config.smtp, pool: !config.serverless })

export async function verifyMailer() {
  if (previewMode) {
    console.warn('[mail] Preview mode: SMTP_HOST is not set, so emails are logged instead of sent.')
    return
  }
  try {
    await transport.verify()
    console.log(`[mail] SMTP ready (${config.smtp.host}:${config.smtp.port})`)
  } catch (err) {
    console.error(`[mail] SMTP check failed: ${err.message}`)
  }
}

export async function sendMail(message) {
  const info = await transport.sendMail({ from: config.from, ...message })
  if (previewMode) {
    const sent = JSON.parse(info.message)
    const to = sent.to.map((r) => r.address).join(', ')
    const files = sent.attachments?.length ? ` [${sent.attachments.length} attachment(s)]` : ''
    console.log(`[mail preview] to: ${to} | subject: ${sent.subject}${files}\n${sent.text}\n`)
  }
  return info
}
