// Email templates: one for the team inbox (every submitted field) and one confirmation for the sender.
// Plain table layout with inline styles so it renders the same in Gmail, Outlook and phones.
const BLUE = '#1863DA'

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const html = (value) => escape(value).replace(/\n/g, '<br>')

function layout({ heading, body }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Helvetica,Arial,sans-serif;color:#000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#000;padding:20px 28px;color:#fff;font-size:20px;font-weight:bold">Naxatra Labs</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:normal">${escape(heading)}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#fafafa;color:#515151;font-size:12px">
        Naxatra Labs · Sector 44, Gurugram, Haryana 122003 · <a href="https://naxatralabs.com" style="color:${BLUE}">naxatralabs.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

function fieldTable(fields, data) {
  const rows = Object.entries(fields)
    .filter(([key]) => data[key])
    .map(
      ([key, field]) => `<tr>
        <td style="padding:8px 12px 8px 0;color:#515151;font-size:14px;vertical-align:top;white-space:nowrap">${escape(field.label)}</td>
        <td style="padding:8px 0;font-size:14px">${field.type === 'url' ? `<a href="${escape(data[key])}" style="color:${BLUE}">${escape(data[key])}</a>` : html(data[key])}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #eee">${rows}</table>`
}

const fieldText = (fields, data) =>
  Object.entries(fields)
    .filter(([key]) => data[key])
    .map(([key, field]) => `${field.label}: ${data[key]}`)
    .join('\n')

// To the team: what was submitted, with Reply-To set to the sender so a reply goes straight back to them.
export function teamEmail({ heading, fields, data, note }) {
  const extra = note ? `<p style="margin:16px 0 0;font-size:14px;color:#515151">${escape(note)}</p>` : ''
  return {
    html: layout({ heading, body: `${fieldTable(fields, data)}${extra}` }),
    text: `${heading}\n\n${fieldText(fields, data)}${note ? `\n\n${note}` : ''}`,
  }
}

// To the sender: a thank-you and a copy of what they sent.
export function confirmationEmail({ name, heading, message, fields, data }) {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const copy = fields ? `<p style="margin:24px 0 8px;font-size:14px;color:#515151">Here’s a copy of what you sent us:</p>${fieldTable(fields, data)}` : ''
  return {
    html: layout({
      heading,
      body: `<p style="margin:0 0 12px;font-size:16px">${escape(greeting)}</p>
        <p style="margin:0 0 12px;font-size:16px;line-height:24px">${escape(message)}</p>
        ${copy}
        <p style="margin:24px 0 0;font-size:16px">Regards,<br>Team Naxatra Labs</p>`,
    }),
    text: `${greeting}\n\n${message}${fields ? `\n\nHere’s a copy of what you sent us:\n${fieldText(fields, data)}` : ''}\n\nRegards,\nTeam Naxatra Labs`,
  }
}
