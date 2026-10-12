import { readFile } from 'node:fs/promises'

// The motor data-sheets the "Request data-sheet" form emails out, keyed by the motor name the website sends
// (the variant code, or the motor's own name for single-variant motors). The PDFs live in /datasheets and are
// bundled into the Vercel function by vercel.json. To add one, drop the PDF in /datasheets and list it here.
const SHEETS = {
  'RF 15/42': 'Antarix-RF15-42-Datasheet.pdf',
  'RF 15/60': 'Antarix-RF15-60-Datasheet.pdf',
  'RF 22/42': 'Antarix-RF22-42-Datasheet.pdf',
  'RF 22/60': 'Antarix-RF22-60-Datasheet.pdf',
  'RF 22/86': 'Antarix-RF22-86-Datasheet.pdf',
  'RF 33/60': 'Antarix-RF33-60-Datasheet.pdf',
  'RF 33/86': 'Antarix-RF33-86-Datasheet.pdf',
  'RF 55/86': 'Antarix-RF55-86-Datasheet.pdf',
}

// Motors on the website with no sheet yet: their requests still reach the team, who send it by hand.
const PENDING = ['RF 33/90', 'RF 66/70', 'RF 66/90', 'AF 58', 'PT-500', 'AKSH 3115']

// Every motor the form accepts (a new motor page needs adding here too).
export const MOTORS = [...Object.keys(SHEETS), ...PENDING]

// The file is picked from this list only, never from the request, so a form can't ask for any other file.
export async function datasheetFor(motor) {
  const filename = Object.hasOwn(SHEETS, motor) ? SHEETS[motor] : null
  if (!filename) return null
  const content = await readFile(new URL(`../datasheets/${filename}`, import.meta.url))
  return { filename, content, contentType: 'application/pdf' }
}
