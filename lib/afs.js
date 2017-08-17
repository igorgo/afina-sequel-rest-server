/*!
 * Afina Sequel Rest Server Core
 * © Copyright 2016-2017 Igor Gorodetskyy <igorgo16@gmail.com>
 */

'use strict'

process.isWin = !!process.platform.match(/^win/)

require('./api.registry')
api.registry.load()
global.afs = new api.events.EventEmitter()
afs.title = 'Afina Sequel Rest Server'
require('./afs.constants')
require('./afs.config')
require('./afs.log')
afs.log.init()
afs.server = new api.events.EventEmitter()
afs.stat = { fork: 0, event: 0, req: 0, res: 0 }


afs.server.start = async () => {
  await afs.config.load()
  await afs.log.open()
  afs.log.server('The server is starting…')
  afs.ipc()
  await api.db.open()
  await api.rest.start()
  afs.log.server('The server started')
}


afs.shutdown = async (code = 0) => {
  if (afs.finalization) return
  afs.finalization = true
  afs.log.server('The server is shutting down…')
  await afs.server.stop()
  api.timers.setImmediate(async () => {
    await afs.log.close()
    process.exit(code)
  })
}



afs.normalizeStack = (stack) => {
  afs.STACK_REGEXP.forEach((rx) => {
    stack = stack.replace(rx[0], rx[1])
  })
  return stack
}

/**
 * Fatal error with process termination
 * @param {Error|string} err instance of Error or string
 */
afs.fatalError = err => {
  let msg
  if (['EADDRINUSE', 'EACCES'].includes(err.code)) {
    msg = 'Can\'t bind to host/port ' + err.address
  } else {
    msg = afs.normalizeStack(err.stack)
  }
  if (afs.log && afs.log.active) {
    afs.log.error(msg)
    afs.log.server('Crashed')
  } else {
    console.log(api.concolor('b,red')(msg))
  }
  void afs.shutdown(1)
}

const errorFunc = (err) => {
  void afs.fatalError(err)
}
process.on('uncaughtException', errorFunc)
process.on('unhandledRejection', errorFunc)

/**
 * Establish IPC processing
 */
afs.ipc = () => {
  process.on('SIGINT', async () => await afs.shutdown(0))
  process.on('SIGTERM', async () => await afs.shutdown(0))
}

/**
 * Unload configuration and stop server
 */
afs.server.stop = async () => {
  await api.db.close()
  afs.log.server('Server stopped')
}
