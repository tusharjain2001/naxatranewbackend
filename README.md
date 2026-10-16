# Naxatra Labs website: form backend

A small Node.js (Express + Nodemailer) API behind the website's five forms. Each form has its own endpoint, and each one emails:

1. **The team inbox for that form.** The email lists every submitted field, and Reply-To is set to the visitor, so pressing Reply answers them directly.
2. **The visitor.** They get a confirmation with a copy of what they sent.

There is no database yet. Every submission lives in the team inboxes.

The data-sheet form is the exception to point 2: the visitor's email carries the motor's PDF instead of a plain confirmation. The PDFs are in `datasheets/` and mapped to motors in `src/datasheets.js`; the file is always picked from that map, never from the request. A motor without a PDF yet still sends the team the request (with a note to reply with the sheet), and the visitor is told the team will send it.

## Endpoints

| Endpoint | Website form | Body | Team inbox (env) |
|---|---|---|---|
| `POST /api/contact` | Contact page enquiry (4 topic tabs) | JSON: `topic`, `name`, `email`, `company` (required for Motors Enquiry only), `application?` (the tab's dropdown: application / investment / partnership / enquiry type), `message?`. Each tab's labels and dropdown lists are in `src/routes/contact.js`. | `CONTACT_TO` (or a per-topic `CONTACT_*_TO`) |
| `POST /api/spec-enquiry` | "Share your application spec" on industry, Drone and Products pages | JSON: `name`, `email`, `company`, `application?`, `message?`, `page?` | `SPEC_ENQUIRY_TO` |
| `POST /api/datasheet` | "Request data-sheet" on each motor page | JSON: `firstName`, `lastName`, `company`, `email`, `motor` (one of the motors in `src/datasheets.js`), `page?` | `DATASHEET_TO` (falls back to `SPEC_ENQUIRY_TO`) |
| `POST /api/careers` | Careers application | multipart: `name`, `email`, `phone?`, `company?`, `role`, `linkedin` (https URL), `resume` (PDF/DOC/DOCX, max 4 MB — Vercel's request limit is 4.5 MB) | `CAREERS_TO` (resume attached) |
| `POST /api/newsletter` | Footer newsletter | JSON: `email`, `captcha` (reCAPTCHA v2 token) | `NEWSLETTER_TO` |
| `GET /api/health` | — | — | — |

Responses:
- Success returns `{ "ok": true, "message": "…" }`. The website shows `message` as the thank-you.
- An invalid form returns `400 { "ok": false, "message": "…", "errors": { field: "…" } }`.
- Each form allows 10 submissions per IP every 15 minutes (`RATE_LIMIT`).

## Google Sheet + Drive record (optional)

Next to the emails, every submission can also be saved as a row in one shared Google Sheet. Careers resumes are uploaded to a shared Drive folder, and their link goes in the row. This is set up in `src/sheets.js`.

- **One tab per form:** Motors Enquiry, Investment, Partnership, Others (the Contact page tabs), Spec Enquiry, Data-sheet Requests, Careers, Newsletter. A tab and its header row are created the first time that form is used.
- **Columns:** the time (IST) first, then the form's fields in a fixed order, then the Drive link (Careers only).
- **It never breaks a submission.** If Google is down or misconfigured, the error is logged as `[sheets] …` and the visitor still gets their success message and emails.
- **Files aren't made public.** Only people the Drive folder is shared with can open them.
- **Text stays text.** Values that start with `=`, `+`, `-` or `@` (phone numbers, or someone typing a formula) are saved as plain text.

**One-time setup:**
1. In Google Cloud, create or reuse a project and enable the **Google Sheets API** and **Google Drive API**.
2. Create a **service account** (IAM & Admin → Service Accounts) and download its **JSON key**. Keep it out of git.
3. Create the Google Sheet. The tabs are added automatically.
4. Create the uploads folder **inside a Shared Drive** (Google Workspace). A service account has no storage of its own, so uploads into a normal "My Drive" folder fail with a storage-quota error.
5. **Share both with the service account's email** (the `client_email` in the JSON):
   - the Sheet as **Editor**;
   - the Shared Drive (or the folder) as **Content manager**.

   Without this, every write fails with 403.
6. Set `GOOGLE_SERVICE_ACCOUNT_JSON` (the JSON text, or the path to the key file), `NAXATRA_SHEET_ID` and `NAXATRA_DRIVE_FOLDER_ID`, then restart. On start the server logs `[sheets] Recording submissions to sheet …`.

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
   - Without SMTP and all four team addresses (`CONTACT_TO`, `CAREERS_TO`, `SPEC_ENQUIRY_TO`, `NEWSLETTER_TO`), the function refuses to run, and every form returns an error. `DATASHEET_TO` is optional.
   - Without `RECAPTCHA_SECRET`, the contact, spec and careers forms still work; only the newsletter sign-up is refused until it is set.
   - Set `EMAIL_ASSET_BASE` to the website's address plus `/email-assets`, so the email images load.
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
src/datasheets.js        motor -> data-sheet PDF map (and the motors the data-sheet form accepts)
src/sheets.js            optional Google Sheet row + Drive upload for every submission
datasheets/              the data-sheet PDFs (bundled into the Vercel function via vercel.json)
```

To change an email's wording, edit the `subject`, `heading` and `confirmation` text in that form's file in `src/routes/`.
