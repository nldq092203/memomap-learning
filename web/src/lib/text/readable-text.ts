const FIELD_LABEL_PATTERN =
  /\s+(Nom|Origine|Ville actuelle|Occupation|À propos de moi|Objectif professionnel|Objectif|Adresse|Date|Lieu|Source|Titre)\s*:/gi

export function formatReadableText(value: string | null | undefined): string {
  if (!value) return ""

  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+Texte\s*:\s*/i, "\n\nTexte :\n")
    .replace(FIELD_LABEL_PATTERN, "\n$1 :")
    .replace(/([.!?])\s+(?=[A-ZÀÂÇÉÈÊËÎÏÔÙÛÜŸ])/g, "$1\n")
    .trim()
}
