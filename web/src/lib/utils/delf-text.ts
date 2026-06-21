export type DelfTextBlock = {
  kind: "heading" | "paragraph" | "source"
  text: string
}

function isSourceLine(text: string) {
  return /^D[’']après\b/i.test(text.trim())
}

function isLikelyHeading(text: string) {
  if (isSourceLine(text)) return false

  const letters = Array.from(text.matchAll(/\p{L}/gu), (match) => match[0])
  if (letters.length < 3 || text.length > 90) return false

  const uppercaseLetters = letters.filter((char) => char === char.toLocaleUpperCase("fr-FR"))
  return uppercaseLetters.length / letters.length > 0.72
}

function normalizeWordJoin(text: string) {
  return text
    .replace(/\bce quelle\b/g, "ce qu’elle")
    .replace(/\bfra giles\b/g, "fragiles")
    .replace(/\bpres crire\b/g, "prescrire")
    .replace(/\binitia tive\b/g, "initiative")
    .replace(/\bexposi tion\b/g, "exposition")
    .replace(/\bthéra pie\b/g, "thérapie")
    .replace(/\bna tional\b/g, "national")
    .replace(/\borga nise\b/g, "organise")
    .replace(/\bpsychia trie\b/g, "psychiatrie")
    .replace(/\binter viennent\b/g, "interviennent")
    .replace(/\bmon diale\b/g, "mondiale")
    .replace(/\bcom ment\b/g, "comment")
    .replace(/\bpro blèmes\b/g, "problèmes")
}

function repairPdfLineBreaks(lines: string[]) {
  const repaired: string[] = []

  for (const line of lines) {
    if (!line || repaired.length === 0) {
      repaired.push(line)
      continue
    }

    const previous = repaired[repaired.length - 1]
    if (!previous) {
      repaired.push(line)
      continue
    }

    if (previous.endsWith("-") && /^[\p{Ll}àâäéèêëîïôöùûüç]/u.test(line)) {
      repaired[repaired.length - 1] = `${previous}${line}`
      continue
    }

    repaired.push(line)
  }

  return repaired
}

function shouldStartParagraph(current: string, nextLine: string) {
  if (!current) return false

  const currentIsHeading = isLikelyHeading(current)
  const nextIsHeading = isLikelyHeading(nextLine)
  if (isSourceLine(nextLine)) return true
  if (currentIsHeading || nextIsHeading) return currentIsHeading !== nextIsHeading

  return current.length > 140 && /[.!?…»]$/.test(current) && /^[A-ZÀ-Ö]/.test(nextLine)
}

export function formatDelfReadingText(rawText: string | undefined): DelfTextBlock[] {
  if (!rawText?.trim()) return []

  const lines = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\u00ad/g, "")
    .split("\n")
    .map((line) => line.trim())

  const paragraphs: string[] = []
  let current = ""

  const flush = () => {
    if (!current.trim()) return
    paragraphs.push(normalizeWordJoin(current.replace(/\s+/g, " ").trim()))
    current = ""
  }

  for (const line of repairPdfLineBreaks(lines)) {
    if (!line) {
      flush()
      continue
    }

    if (shouldStartParagraph(current, line)) {
      flush()
    }

    current = current ? `${current} ${line}` : line
  }

  flush()

  return paragraphs.map((text) => ({
    kind: isSourceLine(text) ? "source" : isLikelyHeading(text) ? "heading" : "paragraph",
    text,
  }))
}
