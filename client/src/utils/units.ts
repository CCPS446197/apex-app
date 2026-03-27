export function kgToLbs(kg: number): number {
  return kg * 2.20462
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462
}

export function fmtWeight(kg: number, unit: 'kg' | 'lbs'): string {
  if (unit === 'lbs') {
    const lbs = kgToLbs(kg)
    return `${Math.round(lbs)}lbs`
  }
  return `${kg}kg`
}

export function fmtWeightVal(kg: number, unit: 'kg' | 'lbs'): string {
  if (unit === 'lbs') {
    return String(Math.round(kgToLbs(kg) * 10) / 10)
  }
  return String(kg)
}

// Height: stored internally as cm
// Slider range: 48–84 total inches (4'0" – 7'0")
export const HEIGHT_MIN_IN = 48
export const HEIGHT_MAX_IN = 84

export function cmToTotalInches(cm: number): number {
  return Math.round(cm / 2.54)
}

export function totalInchesToCm(totalInches: number): number {
  return Math.round(totalInches * 2.54)
}

export function totalInchesToFtIn(totalInches: number): { ft: number; inches: number } {
  const ft = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return { ft, inches }
}

export function fmtHeight(cm: number, unit: 'cm' | 'ft'): string {
  if (unit === 'ft') {
    const { ft, inches } = totalInchesToFtIn(cmToTotalInches(cm))
    return `${ft}'${inches}"`
  }
  return `${Math.round(cm)} cm`
}
