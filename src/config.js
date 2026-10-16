// All settings come from environment variables (see .env.example).
const env = process.env
const list = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const isProd = env.NODE_ENV === 'production'
// Vercel sets VERCEL=1 in its functions.
const serverless = Boolean(env.VERCEL)

// Each form goes to its own inbox. Contact enquiries can also be routed per topic; a topic without its
// own address falls back to CONTACT_TO.
const recipients = {
  contact: list(env.CONTACT_TO),
  contactByTopic: {
    'Motors Enquiry': list(env.CONTACT_MOTORS_TO),
    Investment: list(env.CONTACT_INVESTMENT_TO),
    Partnership: list(env.CONTACT_PARTNERSHIP_TO),
    Others: list(env.CONTACT_OTHERS_TO),
  },
  careers: list(env.CAREERS_TO),
  specEnquiry: list(env.SPEC_ENQUIRY_TO),
  // Data-sheet requests from the motor pages; left blank, they go to the spec-enquiry inbox.
  datasheet: list(env.DATASHEET_TO),
  newsletter: list(env.NEWSLETTER_TO),
}

export const config = {
  isProd,
  serverless,
  port: Number(env.PORT) || 5000,
  // Origins allowed to call the API from a browser (the website's domains).
  corsOrigins: list(env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173'),
  // How many proxies sit in front of the app (for the real client IP in rate limiting).
  // Vercel puts one proxy in front of every function.
  trustProxy: env.TRUST_PROXY ? (Number.isNaN(Number(env.TRUST_PROXY)) ? env.TRUST_PROXY : Number(env.TRUST_PROXY)) : serverless ? 1 : 'loopback',
  // Without SMTP_HOST the server runs in preview mode: emails are logged, not sent.
  smtp: env.SMTP_HOST
    ? {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT) || 587,
        secure: env.SMTP_SECURE === 'true',
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      }
    : null,
  from: env.MAIL_FROM || 'Naxatra Labs <no-reply@naxatralabs.com>',
  recipients,
  recaptchaSecret: env.RECAPTCHA_SECRET || '',
  // Optional: also record every submission in a Google Sheet, with attachments in a Drive folder (see sheets.js).
  google: {
    serviceAccount: env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    sheetId: env.NAXATRA_SHEET_ID || '',
    driveFolderId: env.NAXATRA_DRIVE_FOLDER_ID || '',
  },
  // Submissions allowed per IP per form in each 15-minute window.
  rateLimit: Number(env.RATE_LIMIT) || 10,
}

// Production must have mail and every inbox configured; development fills the gaps so it runs out of the box.
const missing = [
  !config.smtp && 'SMTP_HOST',
  !recipients.contact.length && 'CONTACT_TO',
  !recipients.careers.length && 'CAREERS_TO',
  !recipients.specEnquiry.length && 'SPEC_ENQUIRY_TO',
  !recipients.newsletter.length && 'NEWSLETTER_TO',
].filter(Boolean)

// reCAPTCHA only guards the newsletter, so a missing secret doesn't stop the other forms: in production the
// newsletter is switched off until RECAPTCHA_SECRET is set (see recaptcha.js); in development it's skipped.
if (!config.recaptchaSecret) {
  console.warn(`[config] RECAPTCHA_SECRET is not set: ${isProd ? 'the newsletter sign-up is off until it is' : 'captcha checks are skipped'}.`)
}

if (missing.length) {
  if (isProd) throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  console.warn(`[config] Not set, using development defaults: ${missing.join(', ')}`)
  const fallback = ['team@naxatralabs.test']
  for (const key of ['contact', 'careers', 'specEnquiry', 'newsletter']) if (!recipients[key].length) recipients[key] = fallback
}
if (!recipients.datasheet.length) recipients.datasheet = recipients.specEnquiry
