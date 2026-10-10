# Naxatra Labs website: form backend

A small Node.js (Express + Nodemailer) API behind the website's four forms. Each form has its own endpoint, and each one emails:

1. **The team inbox for that form.** The email lists every submitted field, and Reply-To is set to the visitor, so pressing Reply answers them directly.
2. **The visitor.** They get a confirmation with a copy of what they sent.

There is no database yet. Every submission lives in the team inboxes.

## Endpoints

| Endpoint | Website form | Body | Team inbox (env) |
|---|---|---|---|
| `POST /api/contact` | Contact page enquiry (4 topic tabs) | JSON: `topic`, `name`, `email`, `company`, `application?`, `message?` | `CONTACT_TO` (or a per-topic `CONTACT_*_TO`) |
| `POST /api/spec-enquiry` | "Share your application spec" on industry, Drone and Products pages | JSON: `name`, `email`, `company`, `application?`, `message?`, `page?` | `SPEC_ENQUIRY_TO` |
| `POST /api/careers` | Careers application | multipart: `name`, `email`, `phone?`, `company?`, `role`, `linkedin` (https URL), `resume` (PDF/DOC/DOCX, max 4 MB — Vercel's request limit is 4.5 MB) | `CAREERS_TO` (resume attached) |
| `POST /api/newsletter` | Footer newsletter | JSON: `email`, `captcha` (reCAPTCHA v2 token) | `NEWSLETTER_TO` |
| `GET /api/health` | — | — | — |

Responses:
- Success returns `{ "ok": true, "message": "…" }`. The website shows `message` as the thank-you.
- An invalid form returns `400 { "ok": false, "message": "…", "errors": { field: "…" } }`.
- Each form allows 10 submissions per IP every 15 minutes (`RATE_LIMIT`).

## Run it locally

```bash
cp .env.example .env    # then edit .env
npm install
npm run dev             # http://localhost:5000, restarts on file changes
```

- **Preview mode.** With `SMTP_HOST` empty, nothing is actually sent. Each email is printed in the terminal instead, so you can test without a mail account.
- **With the website.** Run the website with `npm run dev` (or `npm run preview`). It forwards `/api` to `localhost:5000`, so the forms work locally with no extra setup.

## Going live on Vercel

The project is ready for Vercel as is:
- `api/index.js` exposes the Express app as a serverless function.
- `vercel.json` routes every path to it.

1. **Push this folder to its own Git repo.** Import it in Vercel as a new project. Leave the framework preset as **Other**, with no build command and no output directory.
2. **Add the environment variables.** In Project Settings → Environment Variables, enter everything from `.env.example`.
   - Vercel sets `NODE_ENV=production` itself.
   - Without SMTP, all four team addresses and `RECAPTCHA_SECRET`, the function refuses to run, and every form returns an error.
   - `TRUST_PROXY` isn't needed on Vercel.
3. **Deploy.** Check `https://<backend>.vercel.app/api/health`; it should return `{"ok":true}`.
4. **Point the website at the backend.** In the **website's** Vercel project, set `VITE_API_URL=https://<backend>.vercel.app` (or your custom domain, e.g. `https://api.naxatralabs.com`) and redeploy the website.

Notes for serverless:
- **Rate limit.** It is kept in memory per function instance, so it's a light guard, not a hard limit.
- **Logs.** They're in Vercel's Logs tab, including any failed confirmation emails.

Any other Node 22+ host also works (Render, Railway, a VPS…). Run `npm start` with `NODE_ENV=production`, and set `TRUST_PROXY=1` if it sits behind a proxy.

### Settings for any host

1. **SMTP.**
   - For Google Workspace, use `smtp.gmail.com`, port `465`, `SMTP_SECURE=true`, and an App Password from the sending account.
   - `MAIL_FROM` must be an address that account is allowed to send as.
   - Add SPF/DKIM for the domain so the confirmations don't land in spam.
2. **reCAPTCHA.** Register the site at <https://www.google.com/recaptcha/admin> as v2 "I'm not a robot" checkbox.
   - The **secret key** goes in this backend's `RECAPTCHA_SECRET`.
   - The **site key** goes in the website's `VITE_RECAPTCHA_SITE_KEY`.
3. **CORS.** Put the website's domains in `CORS_ORIGINS`, e.g. `https://naxatralabs.com,https://www.naxatralabs.com`. Add the website's own `*.vercel.app` address too if you test on it.

## Where things are

```
api/index.js             Vercel entry (exports the app)
src/app.js               app, CORS, rate limits, error handling
src/server.js            starts the app locally / on a normal Node host
src/config.js            environment variables (and the production checks)
src/mailer.js            Nodemailer transport (SMTP or preview mode)
src/deliver.js           team email + visitor confirmation for one submission
src/emails.js            HTML/text email templates
src/validate.js          field validation
src/recaptcha.js         Google reCAPTCHA check
src/routes/*.js          one file per form: fields, recipients, email wording
```

To change an email's wording, edit the `subject`, `heading` and `confirmation` text in that form's file in `src/routes/`.
