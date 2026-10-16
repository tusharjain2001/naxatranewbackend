import app from './app.js'
import { config } from './config.js'
import { verifyMailer } from './mailer.js'
import { describeSheets } from './sheets.js'

// Local development and long-running hosts. On Vercel, api/index.js is used instead.
app.listen(config.port, () => {
  console.log(`[server] Listening on http://localhost:${config.port}`)
  verifyMailer()
  describeSheets()
})
