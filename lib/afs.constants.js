/*!
 * 
 * Copyright(c) 2017 igor-go <igorgo16@gmail.com>
 * MIT Licensed
 */

'use strict'

afs.DIR = process.cwd()
afs.CANT_READ_DIR = 'Cannot read directory: '
afs.CANT_READ_FILE = 'Cannot read file: '
afs.CANT_PARSE_FILE = 'Cannot parse file: '
afs.CANT_VALIDATE_JSON = 'Parse errors in file: '

afs.SESSION_IMPLEMENTATION = 'AdminOnline'
afs.SESSION_BROWSER = 'Afina Sequel REST Server'

afs.PATH_SEPARATOR = process.isWin ? '\\' : '/'


// Preparing stack trace transformations
afs.STACK_REGEXP = [
  [afs.DIR + afs.PATH_SEPARATOR + 'node_modules', ''],
  [afs.DIR + afs.PATH_SEPARATOR + 'lib', ''],
  [afs.DIR, ''],
  [/\n\s{4,}at/g, ';'],
  [/\n/g, ';'],
  [/[\t^]/g, ' '],
  [/\s{2,}/g, ' '],
  [/;\s;/g, ';']
]

// Escape STACK_REGEXP
afs.STACK_REGEXP.forEach((item) => {
  if (typeof(item[0]) === 'string') {
    item[0] = api.common.newEscapedRegExp(item[0])
  }
})
