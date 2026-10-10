// Small schema check for form bodies. Each field: { label, required, max, type: 'email' | 'url', oneOf, multiline,
// noun } where `noun` names the field inside error messages (defaults to the lower-cased label).
export class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors)[0] ?? 'Please check the form and try again.')
    this.status = 400
    this.errors = errors
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const isUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function read(body, schema) {
  const data = {}
  const errors = {}
  for (const [key, field] of Object.entries(schema)) {
    const noun = field.noun ?? field.label.toLowerCase()
    let value = typeof body?.[key] === 'string' ? body[key].trim() : ''
    // Single-line fields can't carry line breaks (they end up in email subjects and headers).
    if (!field.multiline) value = value.replace(/\s+/g, ' ')
    const max = field.max ?? (field.multiline ? 5000 : 200)

    if (!value) {
      if (field.required) errors[key] = `${field.label} is required.`
    } else if (value.length > max) {
      errors[key] = `${field.label} must be ${max} characters or fewer.`
    } else if (field.type === 'email' && !EMAIL.test(value)) {
      errors[key] = `Please enter a valid ${noun}.`
    } else if (field.type === 'url' && !isUrl(value)) {
      errors[key] = `Please enter a valid ${noun} (starting with https://).`
    } else if (field.oneOf && !field.oneOf.includes(value)) {
      errors[key] = `Please choose a valid ${noun}.`
    }
    data[key] = value
  }
  if (Object.keys(errors).length) throw new ValidationError(errors)
  return data
}
