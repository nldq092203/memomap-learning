"use client"

interface TargetLangsSelectorProps {
  targetLangs: string[]
  onChange: (langs: string[]) => void
  availableLangs?: string[]
}

export function TargetLangsSelector({
  targetLangs,
  onChange,
  availableLangs = ["en", "vi"],
}: TargetLangsSelectorProps) {
  const toggleLang = (lang: string) => {
    const newLangs = new Set(targetLangs)
    newLangs.has(lang) ? newLangs.delete(lang) : newLangs.add(lang)
    onChange(Array.from(newLangs))
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t">
      {availableLangs.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => toggleLang(lang)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            targetLangs.includes(lang)
              ? "bg-primary/10 text-primary border-primary/30"
              : "hover:bg-muted border-border"
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
