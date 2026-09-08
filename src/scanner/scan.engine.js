const scoreFor = (findings) => findings.reduce((total, item) => total + item.weight, 0)
const finding = (code, severity, message, weight) => ({ code, severity, message, weight })

// Normalization exposes frequent low-effort obfuscation without altering the
// submitted value saved in rawInput.
const normalizeText = (value) => value.normalize('NFKC')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/\s+/g, ' ').trim()

const compactText = (value) => normalizeText(value).toLowerCase()
  .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e')
  .replace(/4/g, 'a').replace(/[5$]/g, 's').replace(/[7+]/g, 't')
  .replace(/[\s._\-–—]+/g, ' ')

const normalizeUrl = (value) => {
  const url = new URL(value.trim())
  url.hostname = url.hostname.toLowerCase()
  url.hash = ''
  return url.toString()
}

const textFindingRules = [
  ['OTP_OR_VERIFICATION_CODE_REQUEST', 'SUSPICIOUS', 30,
    /\b(?:send|share|give|provide|reply(?:\s+with)?|enter|tell\s+(?:me|us))[^.]{0,50}\b(?:otp|one time (?:password|code)|verification code|security code)\b|\b(?:otp|one time (?:password|code)|verification code|security code)\b[^.]{0,35}\b(?:send|share|give|provide|reply|enter)\b|លេខកូដ/i,
    'The message appears to request a one-time or verification code.'],
  ['CREDENTIAL_OR_FINANCIAL_DETAIL_REQUEST', 'SUSPICIOUS', 30,
    /\b(?:send|share|give|provide|enter|confirm|verify|update)[^.]{0,60}\b(?:password|passcode|pin|cvv|cvc|card number|bank account|account number|routing number|seed phrase|recovery phrase)\b|\b(?:password|passcode|pin|cvv|cvc|seed phrase|recovery phrase)\b[^.]{0,35}\b(?:send|share|give|provide|enter)\b|(?:ពាក្យសម្ងាត់|លេខសម្ងាត់)/i,
    'The message appears to request credentials or sensitive financial details.'],
  ['IDENTITY_DOCUMENT_REQUEST', 'SUSPICIOUS', 25,
    /\b(?:send|upload|share|provide|photograph|photo of)[^.]{0,60}\b(?:id card|identity card|passport|national id|driver'?s? licence|selfie)\b|\b(?:id card|passport|national id)[^.]{0,35}\b(?:send|upload|share|provide)\b/i,
    'The message appears to request identity documents that can enable identity theft.'],
  ['URGENCY_OR_ACCOUNT_THREAT', 'CAUTION', 15,
    /\b(?:urgent|immediately|right now|act now|final (?:notice|warning)|last chance|within \d+ (?:minute|hour|day)s?|account (?:will be |is )?(?:locked|suspended|closed|disabled)|avoid (?:a |your )?(?:fee|penalty|suspension))\b|(?:បន្ទាន់|ភ្លាមៗ|គណនី.*(?:ផ្អាក|បិទ))/i,
    'The message uses urgency, a deadline, or an account threat to pressure a decision.'],
  ['PAYMENT_REQUEST', 'CAUTION', 20,
    /\b(?:send|transfer|wire|pay|deposit|top ?up)[^.]{0,50}\b(?:money|funds|payment|fee|tax|deposit|crypto(?:currency)?|bitcoin|usdt|gift card)\b|\b(?:gift card|bitcoin|usdt|crypto(?:currency)?)\b[^.]{0,40}\b(?:pay|send|transfer|purchase|buy)\b|(?:ផ្ទេរប្រាក់|បង់ប្រាក់)/i,
    'The message asks for money through a potentially hard-to-reverse payment method.'],
  ['PRIZE_REFUND_OR_LOAN_FEE_LURE', 'CAUTION', 18,
    /\b(?:won|winner|prize|lottery|giveaway|refund|compensation|inheritance|loan (?:approved|offer))\b[^.]{0,80}\b(?:fee|tax|payment|deposit|claim|release|unlock)\b|(?:រង្វាន់|ឈ្នះ).*?(?:បង់|ថ្លៃ)/i,
    'The message combines a financial windfall or service offer with a payment or claim request.'],
  ['IMPERSONATION_OR_UNVERIFIED_CONTACT', 'CAUTION', 12,
    /\b(?:this is|we are|i am)\s+(?:your )?(?:bank|police|government|tax office|delivery company|support team|customer service|employer)\b|\b(?:official|verified)\s+(?:agent|support|representative)\b/i,
    'The sender claims to represent an organization; independently verify the contact details.'],
  ['REMOTE_ACCESS_OR_MALWARE_REQUEST', 'SUSPICIOUS', 28,
    /\b(?:install|download|open|run)[^.]{0,70}\b(?:anydesk|teamviewer|remote desktop|screen share|apk|app)\b|\b(?:allow|give)[^.]{0,40}\b(?:remote access|screen control|access to your phone)\b/i,
    'The message asks for software or access that could let someone control a device.'],
  ['INVESTMENT_OR_TASK_SCAM_PATTERN', 'CAUTION', 18,
    /\b(?:guaranteed|risk[- ]free|daily|instant)\s+(?:profit|return|income|earnings)\b|\b(?:like|follow|rating|review|task)\b[^.]{0,70}\b(?:commission|earn|salary|deposit|recharge)\b/i,
    'The message resembles a high-return investment or paid-task scam pattern.'],
  ['BLACKMAIL_OR_EXTORTION_THREAT', 'SUSPICIOUS', 30,
    /\b(?:pay|send)[^.]{0,50}\b(?:or|otherwise)\b[^.]{0,70}\b(?:publish|release|expose|share|report|arrest|delete)\b|\b(?:we (?:have|know)|i have)[^.]{0,70}\b(?:photos|video|password|evidence)\b/i,
    'The message contains an extortion or blackmail pattern.'],
]

const extractUrls = (text) => [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)]
  .map(([url]) => url.replace(/[),.!?]+$/, '')).slice(0, 3)

const addCompoundFindings = (findings) => {
  const codes = new Set(findings.map(({ code }) => code))
  const sensitive = ['OTP_OR_VERIFICATION_CODE_REQUEST', 'CREDENTIAL_OR_FINANCIAL_DETAIL_REQUEST', 'IDENTITY_DOCUMENT_REQUEST'].some((code) => codes.has(code))
  const payment = codes.has('PAYMENT_REQUEST')
  const pressure = codes.has('URGENCY_OR_ACCOUNT_THREAT') || codes.has('BLACKMAIL_OR_EXTORTION_THREAT')
  if (sensitive && pressure) findings.push(finding('COERCED_SENSITIVE_INFORMATION_REQUEST', 'SUSPICIOUS', 'Sensitive information is requested alongside pressure or a threat.', 20))
  if (payment && pressure) findings.push(finding('COERCED_PAYMENT_REQUEST', 'SUSPICIOUS', 'A payment request is paired with urgency or a threat.', 20))
  if (codes.has('IMPERSONATION_OR_UNVERIFIED_CONTACT') && (sensitive || payment)) findings.push(finding('IMPERSONATION_WITH_HIGH_RISK_REQUEST', 'SUSPICIOUS', 'An organizational identity claim is paired with a sensitive or payment request.', 20))
}

const knowledgeFindings = (text, knowledgeRules = []) => knowledgeRules
  .filter((rule) => rule?.enabled !== false && Array.isArray(rule.matchTerms) && rule.matchTerms.length)
  .filter((rule) => rule.matchTerms.some((term) => typeof term === 'string' && term.trim() && text.includes(compactText(term))))
  .map((rule) => finding(
    rule.code,
    rule.severity === 'SUSPICIOUS' ? 'SUSPICIOUS' : 'CAUTION',
    rule.description || rule.title,
    Number.isInteger(rule.weight) && rule.weight > 0 ? rule.weight : 10,
  ))

const isClearSafetyAdvice = (text) => /\b(?:do not|don't|never|avoid|should not)\s+(?:send|share|give|provide|enter|reply(?: with)?)\b[^.]{0,60}\b(?:otp|one time (?:password|code)|verification code|security code|password|passcode|pin|cvv|cvc)\b/i.test(text)

const scanText = (text, knowledgeRules) => {
  const normalized = normalizeText(text)
  const compact = compactText(normalized)
  const findings = textFindingRules
    .filter(([, , , pattern]) => pattern.test(compact))
    // A safety notice such as "Never share your OTP" is not itself a scam
    // request. Do not suppress other, independent indicators in that text.
    .filter(([code]) => !isClearSafetyAdvice(compact) || !['OTP_OR_VERIFICATION_CODE_REQUEST', 'CREDENTIAL_OR_FINANCIAL_DETAIL_REQUEST'].includes(code))
    .map(([code, severity, weight, , message]) => finding(code, severity, message, weight))
  const builtInCodes = new Set(findings.map(({ code }) => code))
  findings.push(...knowledgeFindings(compact, knowledgeRules).filter(({ code }) => !builtInCodes.has(code)))
  for (const url of extractUrls(normalized)) {
    try { findings.push(...scanUrl(url).findings) } catch { findings.push(finding('MALFORMED_EMBEDDED_URL', 'CAUTION', 'The message contains a malformed web link.', 10)) }
  }
  addCompoundFindings(findings)
  return { normalized, findings }
}

const scanUrl = (value) => {
  const normalized = normalizeUrl(value)
  const url = new URL(normalized)
  const findings = []
  if (url.protocol === 'http:') findings.push(finding('INSECURE_HTTP', 'CAUTION', 'The link does not use encrypted HTTPS.', 10))
  if (url.username || url.password) findings.push(finding('URL_USERINFO', 'SUSPICIOUS', 'The link contains a username or password segment that can hide its real destination.', 30))
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.includes(':')) findings.push(finding('IP_ADDRESS_HOST', 'SUSPICIOUS', 'The link uses an IP address instead of a recognizable domain name.', 25))
  if (url.hostname.split('.').some((part) => part.startsWith('xn--'))) findings.push(finding('PUNYCODE_DOMAIN', 'SUSPICIOUS', 'The domain uses an encoded internationalized name that can resemble another site.', 30))
  if (url.hostname.split('.').length >= 5) findings.push(finding('MANY_SUBDOMAINS', 'CAUTION', 'The link has an unusually deep subdomain structure.', 10))
  return { normalized, findings }
}

const deterministicAssessment = (findings, input) => {
  if (!input) return 'UNABLE_TO_ASSESS'
  const score = scoreFor(findings)
  if (score >= 60) return 'STRONG_SCAM_INDICATORS'
  if (score >= 30) return 'SUSPICIOUS'
  if (score > 0) return 'CAUTION'
  return 'INSUFFICIENT_EVIDENCE'
}

const runScan = ({ type, value, knowledgeRules = [] }) => {
  const result = type === 'TEXT' ? scanText(value, knowledgeRules) : scanUrl(value)
  return { normalizedInput: result.normalized, findings: result.findings.map(({ weight, ...item }) => item), deterministicAssessment: deterministicAssessment(result.findings, result.normalized), score: scoreFor(result.findings) }
}

export { normalizeText, normalizeUrl, runScan }
