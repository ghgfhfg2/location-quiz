import rawCountries from "world-countries"

export type CountryMeta = {
  cca2?: string
  cca3: string
  ccn3?: string
  name: { common: string }
  translations?: {
    kor?: { common?: string }
  }
  latlng: [number, number]
}

export const countryMetas: CountryMeta[] = rawCountries as CountryMeta[]

export function getCountryDisplayName(country: CountryMeta): string {
  // 북한의 경우 공식 명칭으로 변경
  if (country.cca3 === "PRK" || country.cca2 === "KP") {
    return "조선민주주의인민공화국"
  }
  return country.translations?.kor?.common ?? country.name.common
}

export function getCountryNumericCode(country: CountryMeta): number | null {
  if (!country.ccn3) return null
  const n = Number(country.ccn3)
  return Number.isFinite(n) ? n : null
}


