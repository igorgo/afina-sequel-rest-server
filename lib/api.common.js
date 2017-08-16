/*!
 * 
 * Copyright(c) 2017 igor-go <igorgo16@gmail.com>
 * MIT Licensed
 */

'use strict'

const  common = {}

const DURATION_UNITS = {
  days:    { rx: /(\d+)\s*d/, mul: 86400 },
  hours:   { rx: /(\d+)\s*h/, mul: 3600 },
  minutes: { rx: /(\d+)\s*m/, mul: 60 },
  seconds: { rx: /(\d+)\s*s/, mul: 1 }
}

/**
 * Parse duration to seconds
 * @param {string|number} aDuration duration syntax
 * @return {number} milliseconds
 * @example duration('1d 10h 7m 13s')
 */
common.duration = aDuration => {
  if (typeof(aDuration) === 'number') return aDuration
  let result = 0
  let unit, match, key
  if (typeof(aDuration) === 'string') {
    for (key in DURATION_UNITS) {
      unit = DURATION_UNITS[key]
      match = aDuration.match(unit.rx)
      if (match) result += parseInt(match[1], 10) * unit.mul
    }
  }
  return result * 1000
}

/**
 * Pads number to 2-symbol string
 * @param {number} aNumber
 * @return {string} s
 */
const pad2 = aNumber => (aNumber < 10 ? '0' + aNumber : '' + aNumber)

/**
 * Current date in YYYY-MM-DD format
 * @param {Date} [aDate] date
 * @return {string} string date
 */
common.nowDate = aDate => {
  if (!aDate) aDate = new Date()
  return (
    aDate.getUTCFullYear() + '-' +
    pad2(aDate.getUTCMonth() + 1) + '-' +
    pad2(aDate.getUTCDate())
  )
}

common.emptyFunc = () => {}

const ESCAPE_REGEXP_SPECIALS = [
  // order matters for these
  '-', '[', ']',
  // order doesn't matter for any of these
  '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
]

const ESCAPE_REGEXP = new RegExp(
  '[' + ESCAPE_REGEXP_SPECIALS.join('\\') + ']', 'g'
)

/**
 * Escape regular expression control characters
 * @param {string} s string
 * @return {string} escaped string
 */
common.escapeRegExp = s => (
  s.replace(ESCAPE_REGEXP, '\\$&')
)

/**
 * Generate escaped regular expression
 * @param {string} s string
 * @return {RegExp} instance
 */
common.newEscapedRegExp = s => (
  new RegExp(api.common.escapeRegExp(s), 'g')
)

module.exports = common
