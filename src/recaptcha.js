import { config } from './config.js'
import { ValidationError } from './validate.js'

let warned = false

// Checks a reCAPTCHA v2 token with Google. Without RECAPTCHA_SECRET (development only) the check is skipped.
export async function verifyRecaptcha(token, ip) {
  if (!config.recaptchaSecret) {
    if (!warned) console.warn('[recaptcha] RECAPTCHA_SECRET is not set; skipping captcha checks.')
    warned = true
    return
  }
  if (!token) throw new ValidationError({ captcha: 'Please confirm you’re not a robot.' })

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: config.recaptchaSecret, response: token, remoteip: ip ?? '' }),
  })
  const result = await res.json().catch(() => ({}))
  if (!result.success) throw new ValidationError({ captcha: 'Captcha check failed. Please tick “I’m not a robot” again.' })
}
