const scoreFor = (findings) => findings.reduce((total, finding) => total + finding.weight, 0)

const finding = (code, severity, message, weight) => ({ code, severity, message, weight })

const normalizeText = (value) => value.normalize('NFKC').replace(/\s+/g, ' ').trim()

const searchableWords = (value) => new Set(
  normalizeText(value).toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [],
)

const normalizeUrl = (value) => {
  const url = new URL(value.trim())
  url.hostname = url.hostname.toLowerCase()
  url.hash = ''
  return url.toString()
}

const scanText = (text) => {
  const normalized = normalizeText(text)
  const lower = normalized.toLocaleLowerCase()
  const findings = []
  if (/\b(urgent|immediately|act now|within \d+ (minute|hour)|last chance)\b/.test(lower)) findings.push(finding('URGENCY_LANGUAGE', 'CAUTION', 'The message uses urgency or pressure language.', 15))
  if (/\b(password|passcode|otp|verification code|one-time code|login code)\b/.test(lower) && /\b(send|share|reply|provide|tell)\b/.test(lower)) findings.push(finding('CREDENTIAL_REQUEST', 'SUSPICIOUS', 'The message asks for login or verification information.', 35))
  if (/\b(pay|payment|transfer|deposit|fee|fine)\b/.test(lower) && /\b(crypto|gift card|voucher|wallet address)\b/.test(lower)) findings.push(finding('UNUSUAL_PAYMENT_METHOD', 'SUSPICIOUS', 'The message requests payment through a hard-to-reverse method.', 30))
  if (/\b(account (will be )?(closed|suspended|locked)|legal action|arrest warrant)\b/.test(lower)) findings.push(finding('THREAT_OR_CONSEQUENCE', 'CAUTION', 'The message threatens a consequence to pressure action.', 15))
  return { normalized, findings }
}

const scanUrl = (value) => {
  const normalized = normalizeUrl(value)
  const url = new URL(normalized)
  const findings = []
  if (url.protocol === 'http:') findings.push(finding('INSECURE_HTTP', 'CAUTION', 'The link does not use encrypted HTTPS.', 10))
  if (url.username || url.password) findings.push(finding('URL_USERINFO', 'SUSPICIOUS', 'The link contains a username or password segment that can hide its real destination.', 30))
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.includes(':')) findings.push(finding('IP_ADDRESS_HOST', 'SUSPICIOUS', 'The link uses an IP address instead of a recognizable domain name.', 25))
  if (url.hostname.startsWith('xn--') || url.hostname.split('.').some((part) => part.startsWith('xn--'))) findings.push(finding('PUNYCODE_DOMAIN', 'SUSPICIOUS', 'The domain uses an encoded internationalized name that can resemble another site.', 30))
  if (url.hostname.split('.').length >= 5) findings.push(finding('MANY_SUBDOMAINS', 'CAUTION', 'The link has an unusually deep subdomain structure.', 10))
  if (/\b(login|verify|secure|wallet|bonus|claim)\b/i.test(`${url.hostname}${url.pathname}`)) findings.push(finding('SENSITIVE_ACTION_IN_URL', 'CAUTION', 'The link contains terms commonly used to solicit account or payment actions.', 10))
  return { normalized, findings }
}

const urlsIn = (value) => normalizeText(value).match(/https?:\/\/[^\s,]+/gi) || []

// ScamCase records are the scanner's single retrieval catalogue. A match is
// explainable but does not on its own assert that the input is definitively a scam.
const scamCaseMatches = ({ type, normalizedInput, scamCases }) => scamCases.flatMap((scamCase) => {
  const caseContent = [scamCase.title, scamCase.description, scamCase.sampleText, ...(Array.isArray(scamCase.indicators) ? scamCase.indicators : [])].join(' ')
  let similarity = 0
  let matchReason = ''

  if (type === 'URL') {
    const inputHost = new URL(normalizedInput).hostname
    const caseHosts = urlsIn(caseContent).map((url) => new URL(url).hostname)
    if (caseHosts.includes(inputHost)) {
      similarity = 100
      matchReason = 'The URL host appears in the case sample.'
    }
  } else {
    const input = normalizedInput.toLocaleLowerCase()
    const sample = normalizeText(scamCase.sampleText).toLocaleLowerCase()
    if (input === sample) {
      similarity = 100
      matchReason = 'The message exactly matches the case sample.'
    } else {
      const inputWords = searchableWords(normalizedInput)
      const caseWords = searchableWords(caseContent)
      const sharedWords = [...inputWords].filter((word) => caseWords.has(word))
      const coverage = inputWords.size ? sharedWords.length / inputWords.size : 0
      if (sharedWords.length >= 3 && coverage >= 0.5) {
        similarity = Math.round(coverage * 100)
        matchReason = `The message shares ${sharedWords.length} distinctive terms with the case.`
      }
    }
  }

  if (!similarity) return []
  return [{
    scamCaseId: scamCase.id,
    title: scamCase.title,
    scamType: scamCase.scamType,
    riskLevel: scamCase.riskLevel,
    similarity,
    matchReason,
  }]
})

const assess = (findings, input) => {
  if (!input) return 'UNABLE_TO_ASSESS'
  const score = scoreFor(findings)
  if (score >= 60) return 'STRONG_SCAM_INDICATORS'
  if (score >= 30) return 'SUSPICIOUS'
  if (score > 0) return 'CAUTION'
  return 'NO_STRONG_WARNING_SIGNS'
}

const recommendationsFor = (assessment) => {
  const common = ['Do not share passwords, one-time codes, or banking details.', 'Verify the sender or organization through a contact method you find independently.']
  if (assessment === 'STRONG_SCAM_INDICATORS') return ['Avoid interacting with the message or link.', 'Do not send money or credentials.', ...common]
  if (assessment === 'SUSPICIOUS') return ['Pause before responding or clicking.', 'Do not send money or credentials.', ...common]
  if (assessment === 'CAUTION') return ['Treat the content carefully and verify it independently.', ...common]
  if (assessment === 'UNABLE_TO_ASSESS') return ['Provide a non-empty text message or a complete http/https URL.']
  return ['No strong warning signs were found by these limited checks.', ...common]
}

const runScan = ({ type, value, scamCases = [] }) => {
  const base = type === 'TEXT' ? scanText(value) : scanUrl(value)
  const matchedScamCases = scamCaseMatches({ type, normalizedInput: base.normalized, scamCases })
  const caseFindings = matchedScamCases.map((scamCase) => finding(
    'SCAM_CASE_MATCH',
    'SUSPICIOUS',
    `This resembles curated scam case "${scamCase.title}". ${scamCase.matchReason}`,
    45,
  ))
  const findings = [...base.findings, ...caseFindings]
  const assessment = assess(findings, base.normalized)
  return { normalizedInput: base.normalized, findings: findings.map(({ weight, ...item }) => item), assessment, recommendations: recommendationsFor(assessment), score: scoreFor(findings), matchedScamCases }
}

export { assess, normalizeText, normalizeUrl, recommendationsFor, runScan, scamCaseMatches }
