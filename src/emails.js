// Email templates: one for the team inbox (every submitted field) and one confirmation for the sender.
// Both use a CLEAN LIGHT body under a DARK branded header (logo/tagline/label/socials over the hero image).
// Light body because Gmail's iOS/Android apps mangle force-dark emails (white text turns invisible) but
// invert a proper light email into a clean, readable dark one — so this renders right in every client.
// Table layout + inline styles so it renders the same in Gmail, Outlook and on phones.
//
// Per-form variables: `label` (header tag, e.g. "CONTACT FORM"), the greeting name, and the body copy.
// Images are hosted at absolute https URLs so Gmail/Outlook can load them (they strip SVG and reject
// local refs). Override the host with EMAIL_ASSET_BASE; it defaults to the live site.
const ASSET_BASE = (process.env.EMAIL_ASSET_BASE || 'https://www.naxatralabs.com/email-assets').replace(/\/+$/, '')
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const GRAY = '#6b7280' // muted text (sign-off tagline), legible on the light body
const INK = '#1a1a1a' // primary text on the light body
const LABEL_COLOR = 'rgba(255,255,255,0.65)' // the per-form label; sits on the dark header image

// Same profiles as the website footer.
const SOCIALS = [
  ['x', 'https://x.com/naxatralabs', 'X'],
  ['fb', 'https://www.facebook.com/share/1K1QdBdCVZ/?mibextid=wwXIfr', 'Facebook'],
  ['linkedin', 'https://www.linkedin.com/company/naxatra-labs/', 'LinkedIn'],
  ['instagram', 'https://www.instagram.com/naxatralabs/', 'Instagram'],
]

const escape = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const html = (value) => escape(value).replace(/\n/g, '<br>')

// The dark header band: hero background (with a #000 fallback and an Outlook VML fill),
// logo top-left, tagline top-right, the per-form label lower-left, socials lower-right.
function header(label) {
  const hero = `${ASSET_BASE}/header-hero.jpg`
  const socials = SOCIALS.map(
    ([key, url, name]) =>
      `<a href="${url}" style="text-decoration:none"><img src="${ASSET_BASE}/social-${key}.png" width="22" height="22" alt="${name}" style="display:inline-block;border:0;width:22px;height:22px;vertical-align:middle"></a>`,
  ).join('<span style="display:inline-block;width:10px">&nbsp;</span>')
  const labelCell = label
    ? `<td align="left" valign="bottom" style="font-family:${FONT};font-size:13px;letter-spacing:0.06em;color:${LABEL_COLOR};text-transform:uppercase">${escape(label)}</td>`
    : '<td></td>'
  return `<tr>
    <td background="${hero}" bgcolor="#000000" valign="top" height="150" style="height:150px;background:#000000 url('${hero}') center/cover no-repeat">
      <!--[if gte mso 9]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" fill="true" stroke="false" style="width:600px;height:150px;">
      <v:fill type="frame" src="${hero}" color="#000000" /><v:textbox inset="0,0,0,0">
      <![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%">
        <tr><td class="nx-pad" style="padding:20px 24px 0 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="left" valign="top"><img class="nx-logo" src="${ASSET_BASE}/naxatra-logo.png" width="140" height="14" alt="Naxatra Labs" style="display:block;border:0;width:140px;height:14px"></td>
            <td class="nx-tagline" align="right" valign="top" style="font-family:${FONT};font-size:13px;line-height:18px;color:#ffffff">Engineered In India.<br>Powering Electric Motion Worldwide.</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:50px;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td class="nx-pad" style="padding:0 24px 18px 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${labelCell}
            <td align="right" valign="bottom">${socials}</td>
          </tr></table>
        </td></tr>
      </table>
      <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
    </td>
  </tr>`
}

function layout({ label, body }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @media only screen and (max-width: 480px) {
    .nx-pad { padding-left: 18px !important; padding-right: 18px !important; }
    .nx-tagline { font-size: 11px !important; line-height: 15px !important; }
    .nx-logo { width: 112px !important; height: 11px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT};color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f4f5" style="background:#f4f4f5">
  <tr><td align="center" style="padding:24px 12px">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e6e6e6;border-radius:8px;overflow:hidden">
      ${header(label)}
      <tr><td class="nx-pad" bgcolor="#ffffff" style="background:#ffffff;padding:34px 28px 40px 28px;font-family:${FONT};color:${INK}">
        ${body}
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`
}

// The submitted fields as label/value rows; email addresses and links are clickable.
function fieldTable(fields, data) {
  const value = (key, field) => {
    const v = escape(data[key])
    if (field.type === 'url') return `<a href="${v}" style="color:${TEAM_LINK}">${v}</a>`
    if (field.type === 'email') return `<a href="mailto:${v}" style="color:${TEAM_LINK}">${v}</a>`
    return html(data[key])
  }
  const rows = Object.entries(fields)
    .filter(([key]) => data[key])
    .map(
      ([key, field]) => `<tr>
        <td style="padding:10px 16px 10px 0;border-bottom:1px solid ${TEAM_RULE};color:${TEAM_MUTED};font-size:14px;line-height:20px;vertical-align:top;white-space:nowrap">${escape(field.label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${TEAM_RULE};color:${TEAM_TEXT};font-size:14px;line-height:20px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere">${value(key, field)}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${TEAM_RULE};margin-top:18px">${rows}</table>`
}

const fieldText = (fields, data) =>
  Object.entries(fields)
    .filter(([key]) => data[key])
    .map(([key, field]) => `${field.label}: ${data[key]}`)
    .join('\n')

// The team's copy (to enquiry@). Figma only designs the visitor's confirmation, so this is a plain, light email
// built to scan: which form it came from, a heading, every submitted field, and a reminder that Reply goes
// straight to the sender (Reply-To is set to them in deliver.js).
const TEAM_TEXT = '#111111'
const TEAM_MUTED = '#6b6b6b'
const TEAM_RULE = '#e6e6e6'
const TEAM_LINK = '#1863da'

export function teamEmail({ label, heading, fields, data, note }) {
  const first = data.name?.trim().split(/\s+/)[0]
  const replyTo = first ? `Reply to this email to answer ${first} directly.` : 'Reply to this email to answer the sender directly.'
  const body = `
    ${label ? `<p style="margin:0 0 8px;font-size:12px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${TEAM_MUTED}">${escape(label)}</p>` : ''}
    ${heading ? `<h1 style="margin:0;font-size:20px;line-height:28px;font-weight:600;color:${TEAM_TEXT}">${escape(heading)}</h1>` : ''}
    ${fieldTable(fields, data)}
    ${note ? `<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:${TEAM_TEXT}">${escape(note)}</p>` : ''}
    <p style="margin:24px 0 0;font-size:13px;line-height:18px;color:${TEAM_MUTED}">${escape(replyTo)}<br>Sent from the website form on naxatralabs.com.</p>`
  return {
    html: `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:${FONT};color:${TEAM_TEXT}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f4f4" style="background:#f4f4f4">
  <tr><td align="center" style="padding:24px 12px">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${TEAM_RULE};border-radius:8px">
      <tr><td style="padding:28px 28px 30px 28px;font-family:${FONT}">${body}
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`,
    text: `${label ? `${label}\n` : ''}${heading}\n\n${fieldText(fields, data)}${note ? `\n\n${note}` : ''}\n\n${replyTo}`,
  }
}

// To the sender: the dark branded thank-you (greeting by first name + message + sign-off). No copy table — the
// approved design is a clean confirmation.
export function confirmationEmail({ label, name, message }) {
  const first = name?.trim().split(/\s+/)[0]
  const greeting = first ? `Hi ${first},` : 'Hi,'
  return {
    html: layout({
      label,
      body: `<p style="margin:0 0 20px;font-family:${FONT};font-size:16px;line-height:26px;color:${INK}">${escape(greeting)}</p>
        <p style="margin:0 0 30px;font-family:${FONT};font-size:16px;line-height:26px;color:${INK}">${html(message)}</p>
        <p style="margin:0;font-family:${FONT};font-size:16px;line-height:26px;color:${INK}">Best Regards,</p>
        <p style="margin:8px 0 0;font-family:${FONT};font-weight:700;font-size:16px;line-height:24px;color:${INK}">Team Naxatra Labs</p>
        <p style="margin:3px 0 0;font-family:${FONT};font-size:14px;line-height:22px;color:${GRAY}">Engineering the future of motion.</p>`,
    }),
    text: `${greeting}\n\n${message}\n\nBest Regards,\nTeam Naxatra Labs\nEngineering the future of motion.`,
  }
}
