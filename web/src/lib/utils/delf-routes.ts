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

export function buildDelfListRoute(level: DelfLevel, section: DelfSection): string {
  return `${DELF_PRACTICE_ROOT}/${level}/${section}`
}

export function buildDelfTestRoute(
  level: DelfLevel,
  variant: string,
  section: DelfSection,
  testId: string,
): string {
  return `${DELF_PRACTICE_ROOT}/${level}/${variant}/${section}/${testId}`
}
