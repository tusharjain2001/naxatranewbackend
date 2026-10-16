import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { drive as driveApi } from '@googleapis/drive'
import { auth, sheets as sheetsApi } from '@googleapis/sheets'
import { config } from './config.js'

// Every form submission is also kept as a row in one shared Google Sheet (a tab per form), and attached files
// (the careers resume) go to a shared Drive folder with their link in the row. It runs next to the emails and
// never breaks a submission: recordSubmission() logs any Google error and resolves anyway, so the email stays
// the safety net. Without the three GOOGLE_*/NAXATRA_* settings it's off and only the emails go out.

// One tab per form. The Contact page's tabs keep their own names (Motors Enquiry, Investment, Partnership, Others).
export const TABS = {
  specEnquiry: 'Spec Enquiry',
  datasheet: 'Data-sheet Requests',
  careers: 'Careers',
  newsletter: 'Newsletter',
}

const TIMEOUT_MS = 15000

// GOOGLE_SERVICE_ACCOUNT_JSON holds the service-account key itself (the JSON text) or the path to the key file.
function loadCredentials(value) {
  try {
    return JSON.parse(value.trim().startsWith('{') ? value : readFileSync(value, 'utf8'))
  } catch (err) {
    console.error(`[sheets] GOOGLE_SERVICE_ACCOUNT_JSON can't be read (${err.message}); submissions won't be recorded.`)
    return null
  }
}

const { serviceAccount, sheetId, driveFolderId } = config.google
const credentials = serviceAccount ? loadCredentials(serviceAccount) : null
const enabled = Boolean(credentials && sheetId)

let clients
function google() {
  clients ??= (() => {
    const client = new auth.GoogleAuth({
      credentials,
      // The service account only reaches the Sheet and folder shared with it, whatever the scope says.
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    })
    return {
      sheets: sheetsApi({ version: 'v4', auth: client, timeout: TIMEOUT_MS }),
      drive: driveApi({ version: 'v3', auth: client, timeout: TIMEOUT_MS }),
    }
  })()
  return clients
}

export function describeSheets() {
  if (enabled) {
    console.log(`[sheets] Recording submissions to sheet ${sheetId}${driveFolderId ? ' and files to Drive' : ' (no Drive folder set, files are not uploaded)'}.`)
  } else {
    console.warn('[sheets] Not set up (GOOGLE_SERVICE_ACCOUNT_JSON / NAXATRA_SHEET_ID): submissions are only emailed.')
  }
}

// "2026-10-16 14:05:03" in India time, which Sheets reads as a date-time.
const istNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata', hour12: false })

// Rows are written as USER_ENTERED, so a visitor's "=…" would run as a formula; a leading apostrophe keeps any
// such value (and phone numbers like +91…) as plain text.
const cell = (value) => {
  const text = value == null ? '' : String(value)
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

const range = (tab, cells) => `'${tab.replace(/'/g, "''")}'!${cells}`

// Creates the tab and its header row the first time a form is recorded (once per process).
const tabsReady = new Map()
function ensureTab(tab, header) {
  if (!tabsReady.has(tab)) {
    const ready = (async () => {
      const { sheets } = google()
      const { data } = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets.properties.title' })
      if (!data.sheets?.some((s) => s.properties.title === tab)) {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] } })
      }
      const first = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: range(tab, '1:1') })
      if (!first.data.values?.length) {
        await sheets.spreadsheets.values.update({ spreadsheetId: sheetId, range: range(tab, 'A1'), valueInputOption: 'RAW', requestBody: { values: [header] } })
      }
    })()
    // A failed setup is retried by the next submission.
    ready.catch(() => tabsReady.delete(tab))
    tabsReady.set(tab, ready)
  }
  return tabsReady.get(tab)
}

// Uploads one attachment ({ filename, content, contentType }) into the Drive folder and returns its link. The
// file isn't made public: it's visible to whoever the folder is shared with.
async function upload(file, label) {
  const { drive } = google()
  const { data } = await drive.files.create({
    requestBody: { name: `${label} - ${file.filename}`, parents: [driveFolderId] },
    media: { mimeType: file.contentType, body: Readable.from(file.content) },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  })
  return data.webViewLink
}

// Appends one submission to its tab: the time first, then each field in `fields` order, then (for forms that take
// files) the Drive links. `files` is undefined for forms without attachments, so they get no file column.
export async function recordSubmission({ tab, fields, data, files }) {
  if (!enabled) return
  try {
    const time = istNow()
    const takesFiles = files !== undefined
    const header = ['Submitted (IST)', ...Object.values(fields).map((f) => f.label), ...(takesFiles ? ['File (Drive link)'] : [])]
    const ready = ensureTab(tab, header)

    let links = ''
    if (files?.length) {
      if (driveFolderId) {
        const who = data.name || data.email || 'submission'
        links = (await Promise.all(files.map((file) => upload(file, `${time} ${who}`)))).join('\n')
      } else {
        links = 'Not uploaded (no Drive folder set)'
      }
    }

    await ready
    const row = [time, ...Object.keys(fields).map((key) => cell(data[key])), ...(takesFiles ? [links] : [])]
    await google().sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range(tab, 'A1'),
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    })
  } catch (err) {
    console.error(`[sheets] Couldn't record a "${tab}" submission from ${data.email}: ${err.message}`)
  }
}
