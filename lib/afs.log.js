/*!
 * 
 * Copyright(c) 2017 igor-go <igorgo16@gmail.com>
 * MIT Licensed
 */

'use strict'

const DAY_MILLISECONDS = api.common.duration('1d')
const SEMICOLON_REGEXP = /;/g

const colorError = api.concolor('b,red')
const colorDebug = api.concolor('b,green')
const colorWarn = api.concolor('b,yellow')

afs.log = {}


afs.log.stringifyObject = (aObject) => {
  let cache = []
  const result = api.json.stringify(aObject, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Circular reference found, discard key
        return
      }
      // Store value in our collection
      cache.push(value)
    }
    return value
  }, 2)
  cache = null
  return result
}

afs.log.fileTypes = ['server', 'error', 'debug', 'warning', 'access', 'auth', 'slow']


afs.log.dir = api.path.join(afs.DIR, 'log')
afs.log.files = new Map()

afs.log.init = () => {
  afs.log.active = false
  const makeTimer = fileType => (() => afs.log.flush(fileType))

  afs.log.open = async () => {
    afs.log.writeInterval = api._.get(afs.config.log, 'writeInterval')
    afs.log.bufferSize = api._.get(afs.config.log, 'bufferSizeKB') * 1024
    afs.log.keepDays = api._.get(afs.config.log, 'keepDays')
    try {
      api.mkdirp.sync(afs.log.dir)
    } catch (e) {
      console.error(e)
      return
    }
    const now = new Date()
    const nextDate = new Date()
    await Promise.all(api._.map(
      afs.log.fileTypes,
      async fileType => await afs.log.openFile(fileType)
    ))
    afs.log.active = true
    nextDate.setUTCHours(0, 0, 0, 0)
    const nextReopen = nextDate - now + DAY_MILLISECONDS
    api.timers.setTimeout(afs.log.open, nextReopen)
    api.timers.setTimeout(afs.log.open, nextReopen)
    if (afs.log.keepDays) {
      afs.log.deleteOldFiles()
    }
  }

  afs.log.openFile = async (aFileType, aOnOpen, aOnError) => {
    const date = api.common.nowDate()
    const fileName = api.path.join(afs.log.dir, date + '-' + aFileType + '.log')
    await afs.log.closeFile(aFileType)
    const stream = api.fs.createWriteStream(fileName, {
      flags: 'a',
      highWaterMark: afs.log.bufferSize
    })
    const timer = api.timers.setInterval(
      makeTimer(aFileType),
      api.common.duration(afs.log.writeInterval)
    )
    const file = { stream, buf: '', lock: false, timer }
    afs.log.files.set(aFileType, file)
    if (aOnOpen) file.stream.on('open', aOnOpen)
    if (aOnError) file.stream.on('error', aOnError)
  }

  afs.log.close = async () => {
    if (!afs.log.active) return
    afs.log.active = false
    await Promise.all(api._.map(
      afs.log.fileTypes,
      async fileType => await afs.log.closeFile(fileType)
    ))
  }

  afs.log.closeFile = aFileType => new Promise(async resolve => {
    const file = afs.log.files.get(aFileType)
    if (!file) {
      resolve()
      return
    }
    const filePath = file.stream.path
    await afs.log.flush(aFileType)
    if (file.stream.destroyed || file.stream.closed) {
      resolve()
      return
    }
    file.stream.end(() => {
      api.timers.clearInterval(file.timer)
      afs.log.files.delete(aFileType)
      api.fs.stat(filePath, (e, stats) => {
        if (e || stats.size > 0) {
          resolve()
          return
        }
        api.fs.unlink(filePath, resolve)
      })
    })
  })

  afs.log.deleteOldFiles = () => {
    api.fs.readdir(afs.log.dir, (e, fileList) => {
      const now = new Date()
      const date = new Date(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0
      )
      const time = date.getTime()
      let i, fileTime, fileAge
      for (i in fileList) {
        fileTime = new Date(fileList[i].substring(0, 10)).getTime()
        fileAge = Math.floor((time - fileTime) / DAY_MILLISECONDS)
        if (fileAge > 1 && fileAge > afs.log.keepDays) {
          api.fs.unlink(api.path.join(afs.log.dir, fileList[i]), api.common.emptyFunc)
        }
      }
    })
  }

  afs.log.flush = fileType => new Promise(resolve => {
    const file = afs.log.files.get(fileType)
    if (!file || file.lock || file.buf.length === 0) {
      resolve()
      return
    }
    file.lock = true
    const buf = file.buf
    file.buf = ''
    file.stream.write(buf, () => {
      file.lock = false
      resolve()
    })
  })

  afs.log.write = (aFileType, aMessage) => {
    const file = afs.log.files.get(aFileType)
    if (!file) return
    let msg = (
      new Date().toISOString() + '\t' + aMessage + '\n'
    )
    file.buf += msg
    if (afs.config.log && afs.config.log.stdout.includes(aFileType)) {
      msg = msg.substring(0, msg.length - 1)
      /**/
      if (aFileType === 'debug') {
        console.log(msg)
        if (typeof msg === 'object') {
          console.log(msg)
          msg = afs.log.stringifyObject(msg)
        }
        msg = colorDebug(afs.normalizeStack((new Error(msg)).stack)).split(';')
        api._.remove(msg, (v) => v.startsWith(' Object.afs.log.'))
        msg[0] = msg[0].slice(16)
        msg = msg.join('\n')
      } else msg = msg.replace(SEMICOLON_REGEXP, '\n ')

      if (aFileType === 'error') msg = colorError(msg)
      else if (aFileType === 'debug') msg = colorDebug(msg)
      else if (aFileType === 'warning') msg = colorWarn(msg)
      msg = msg.replace(SEMICOLON_REGEXP, '\n ')
      console.log(msg)
    }
  }

  /* Generate log methods, for example:
   *   afs.log.server(message)
   *   afs.log.error(message)
   *   afs.log.debug(message)
   *   afs.log.warning(message)
   *   afs.log.access(message)
   *   afs.log.slow(message)
   */
  api._.forEach(
    afs.log.fileTypes,
    fileType => {
      afs.log[fileType] = message => {
        afs.log.write(fileType, message)
      }
    }
  )
}
