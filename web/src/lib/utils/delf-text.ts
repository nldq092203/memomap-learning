export type DelfTextBlock = {
  kind: "heading" | "paragraph"
  text: string
}

function isLikelyHeading(text: string) {
  const letters = Array.from(text.matchAll(/\p{L}/gu), (match) => match[0])
  if (letters.length < 3 || text.length > 90) return false

  const uppercaseLetters = letters.filter((char) => char === char.toLocaleUpperCase("fr-FR"))
  return uppercaseLetters.length / letters.length > 0.72
}

function shouldStartParagraph(current: string, nextLine: string) {
  if (!current) return false

  const currentIsHeading = isLikelyHeading(current)
  const nextIsHeading = isLikelyHeading(nextLine)
  if (currentIsHeading || nextIsHeading) return currentIsHeading !== nextIsHeading

  return current.length > 140 && /[.!?…»]$/.test(current) && /^[A-ZÀ-Ö]/.test(nextLine)
}

export function formatDelfReadingText(rawText: string | undefined): DelfTextBlock[] {
  if (!rawText?.trim()) return []

  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())

  const paragraphs: string[] = []
  let current = ""

  const flush = () => {
    if (!current.trim()) return
    paragraphs.push(current.replace(/\s+/g, " ").trim())
    current = ""
  }

  for (const line of lines) {
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
    kind: isLikelyHeading(text) ? "heading" : "paragraph",
    text,
  }))
}
