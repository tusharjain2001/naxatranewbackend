// Email templates: one for the team inbox (every submitted field) and one confirmation for the sender.
// Both share one dark, image-led wrapper matching the approved Figma design (node 15835:16625).
// Table layout + inline styles so it renders the same in Gmail, Outlook and on phones.
//
// Per-form variables: `label` (header tag, e.g. "CONTACT FORM"), the greeting name, and the body copy.
// Images are hosted at absolute https URLs so Gmail/Outlook can load them (they strip SVG and reject
// local refs). Override the host with EMAIL_ASSET_BASE; it defaults to the live site.
const ASSET_BASE = (process.env.EMAIL_ASSET_BASE || 'https://naxatralabs.com/email-assets').replace(/\/+$/, '')
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const GRAY = '#999999'
const LABEL_COLOR = 'rgba(255,255,255,0.65)'
const BLUE = '#4da3ff' // links on the dark body, kept legible on black

const SOCIALS = [
  ['x', 'https://x.com/naxatralabs', 'X'],
  ['fb', 'https://www.facebook.com/naxatralabs', 'Facebook'],
  ['linkedin', 'https://www.linkedin.com/company/naxatralabs', 'LinkedIn'],
  ['instagram', 'https://www.instagram.com/naxatralabs', 'Instagram'],
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
        <tr><td style="padding:20px 24px 0 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="left" valign="top"><img src="${ASSET_BASE}/naxatra-logo.png" width="140" height="14" alt="Naxatra Labs" style="display:block;border:0;width:140px;height:14px"></td>
            <td align="right" valign="top" style="font-family:${FONT};font-size:13px;line-height:18px;color:#ffffff">Engineered In India.<br>Powering Electric Motion Worldwide.</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:50px;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:0 24px 18px 24px">
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
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
</head>
<body style="margin:0;padding:0;background:#000000;font-family:${FONT};color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background:#000000">
  <tr><td align="center" style="padding:0">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#000000" style="width:600px;max-width:600px;background:#000000">
      ${header(label)}
      <tr><td bgcolor="#000000" style="background:#000000;padding:34px 28px 40px 28px;font-family:${FONT};color:#ffffff">
        ${body}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function fieldTable(fields, data) {
  const rows = Object.entries(fields)
    .filter(([key]) => data[key])
    .map(
      ([key, field]) => `<tr>
        <td style="padding:8px 14px 8px 0;color:${GRAY};font-size:14px;vertical-align:top;white-space:nowrap">${escape(field.label)}</td>
        <td style="padding:8px 0;font-size:14px;color:#ffffff">${field.type === 'url' ? `<a href="${escape(data[key])}" style="color:${BLUE}">${escape(data[key])}</a>` : html(data[key])}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #333;margin-top:16px">${rows}</table>`
}

const fieldText = (fields, data) =>
  Object.entries(fields)
    .filter(([key]) => data[key])
    .map(([key, field]) => `${field.label}: ${data[key]}`)
    .join('\n')

// To the team: what was submitted, with Reply-To set to the sender so a reply goes straight back to them.
export function teamEmail({ label, heading, fields, data, note }) {
  const intro = heading ? `<p style="margin:0;font-family:${FONT};font-weight:300;font-size:20px;line-height:28px;color:#ffffff">${escape(heading)}</p>` : ''
  const extra = note ? `<p style="margin:16px 0 0;font-size:14px;color:${GRAY}">${escape(note)}</p>` : ''
  return {
    html: layout({ label, body: `${intro}${fieldTable(fields, data)}${extra}` }),
    text: `${heading}\n\n${fieldText(fields, data)}${note ? `\n\n${note}` : ''}`,
  }
}

// To the sender: the dark branded thank-you (greeting + message + sign-off). No copy table — the
// approved design is a clean confirmation.
export function confirmationEmail({ label, name, message }) {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return {
    html: layout({
      label,
      body: `<p style="margin:0 0 20px;font-family:${FONT};font-weight:300;font-size:16px;line-height:26px;color:#ffffff">${escape(greeting)}</p>
        <p style="margin:0 0 28px;font-family:${FONT};font-weight:300;font-size:16px;line-height:26px;color:#ffffff">${html(message)}</p>
        <p style="margin:0;font-family:${FONT};font-weight:300;font-size:16px;line-height:26px;color:#ffffff">Best Regards,</p>
        <p style="margin:6px 0 0;font-family:${FONT};font-size:16px;line-height:24px;color:#ffffff">Team Naxatra Labs</p>
        <p style="margin:2px 0 0;font-family:${FONT};font-size:14px;line-height:22px;color:${GRAY}">Engineering the future of motion.</p>`,
    }),
    text: `${greeting}\n\n${message}\n\nBest Regards,\nTeam Naxatra Labs\nEngineering the future of motion.`,
  }
}
