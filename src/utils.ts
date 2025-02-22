const BTC_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 8,
})

const SATS_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 0,
})

export const BTC: Unit = 'BTC'
export const SATS: Unit = 'sats'

export const walletDisplayName = (name: string) => name.replace('.jmdat', '')

export const displayDate = (string: string) => new Date(string).toLocaleString()

export const btcToSats = (value: string) => Math.round(parseFloat(value) * 100000000)

export const satsToBtc = (value: string) => parseInt(value, 10) / 100000000

export const formatBtc = (value: number) => {
  const decimalPoint = '\u002E'
  const nbHalfSpace = '\u202F'

  const numberString = BTC_FORMATTER.format(value)

  const [integerPart, fractionalPart] = numberString.split(decimalPoint)

  const formattedFractionalPart = fractionalPart
    .split('')
    .map((char, idx) => (idx === 2 || idx === 5 ? `${nbHalfSpace}${char}` : char))
    .join('')

  return integerPart + decimalPoint + formattedFractionalPart
}

export const formatSats = (value: number) => {
  return SATS_FORMATTER.format(value)
}

export const shortenStringMiddle = (value: string, chars = 8, separator = '…') => {
  const prefixLength = Math.max(Math.floor(chars / 2), 1)
  if (value.length <= prefixLength * 2) {
    return `${value}`
  }
  return `${value.substring(0, prefixLength)}${separator}${value.substring(value.length - prefixLength)}`
}

export const percentageToFactor = (val: number, precision = 6) => {
  // Value cannot just be divided
  // e.g. ✗ 0.0027 / 100 == 0.000027000000000000002
  // but: ✓ Number((0.0027 / 100).toFixed(6)) = 0.000027
  return Number((val / 100).toFixed(precision))
}

export const factorToPercentage = (val: number, precision = 6) => {
  // Value cannot just be multiplied
  // e.g. ✗ 0.000027 * 100 == 0.0026999999999999997
  // but: ✓ Number((0.000027 * 100).toFixed(6)) = 0.0027
  return Number((val * 100).toFixed(precision))
}

export const isValidNumber = (val: number | undefined) => typeof val === 'number' && !isNaN(val)
