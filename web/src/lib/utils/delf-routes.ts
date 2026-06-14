import type { DelfLevel, DelfSection } from "@/lib/types/api/delf"

export const DELF_PRACTICE_ROOT = "/learning/delf-practice"

const VALID_LEVELS = new Set<DelfLevel>(["A2", "B1", "B2", "C1"])
const VALID_SECTIONS = new Set<DelfSection>(["CO", "CE", "PE", "PO"])

export function isDelfLevel(value: string): value is DelfLevel {
  return VALID_LEVELS.has(value as DelfLevel)
}

export function isDelfSection(value: string): value is DelfSection {
  return VALID_SECTIONS.has(value as DelfSection)
}

export function buildDelfVariant(level: DelfLevel): string {
  return `tout-public-${level.toLowerCase()}`
}

export function formatDelfVariantLabel(variant: string): string {
  return variant
    .split("-")
    .filter(Boolean)
    .map((part) => part.toUpperCase() === part ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function buildDelfLevelRoute(level: DelfLevel): string {
  return `${DELF_PRACTICE_ROOT}/${level}`
}

export function buildDelfListRoute(
  level: DelfLevel,
  variant: string,
  section: DelfSection,
): string {
  return `${DELF_PRACTICE_ROOT}/${level}/${variant}/${section}`
}

export function buildDelfTestRoute(
  level: DelfLevel,
  variant: string,
  section: DelfSection,
  testId: string,
): string {
  return `${DELF_PRACTICE_ROOT}/${level}/${variant}/${section}/${testId}`
}
