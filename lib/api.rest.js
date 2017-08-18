/*!
 * rest interface for Afina Sequel Rest Server
 * © Copyright 2016-2017 Igor Gorodetskyy <igorgo16@gmail.com>
 */

'use strict'

const rest = {}
rest.active = false

/*
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
 */
const restify = require('restify')
const onFinished = require('on-finished')
const onHeaders = require('on-headers')
const CONFIG_REST_ERROR = new Error('Cannot find a REST config file. Check if the ' +
  'directory "config" contains a "rest.json" file, and if it is valid.')
const SESSION_ID_HEADER = 'x-afs-session-id'
const XML_HEADER = '<?xml version="1.0" encoding="utf-8" standalone="yes" ?>\n'

let httpServer

const getip = req => req.ip ||
  req._remoteAddress ||
  (req.connection && req.connection.remoteAddress) ||
  undefined

const getRespHeader = (res, field) => {
  if (!res._header) {
    return undefined
  }
  // get header
  const header = res.getHeader(field)
  return Array.isArray(header) ? header.join(', ') : header
}

const logger = (req, res, next) => {
  // request data
  req._startAt = undefined
  req._startTime = undefined
  req._remoteAddress = getip(req)

  // response data
  res._startAt = undefined
  res._startTime = undefined

  const recordStartTime = (o) => {
    o._startAt = process.hrtime()
    o._startTime = new Date()
  }


  // record request start
  recordStartTime(req)

  const logRequest = () => {
    const sessionID = req.headers[SESSION_ID_HEADER] ||
      getRespHeader(res, SESSION_ID_HEADER)
    let msg = []
    const setRespTime = () => {
      if (!req._startAt || !res._startAt) {
        // missing request and/or response start time
        return
      }
      // calculate diff
      const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
        (res._startAt[1] - req._startAt[1]) * 1e-6
      msg.push(' - ' + ms.toFixed(3) + 'ms')
      if (ms > rest.slowTime) afs.log.slow('Request ' +
        (req.originalUrl || req.url) +
        ' takes ' + ms + 'ms'
      )
    }

    msg.push(getip(req))
    msg.push(req.method)
    msg.push(req.originalUrl || req.url)
    msg.push(res._header ? String(res.statusCode) : undefined)
    msg.push(getRespHeader(res, 'content-length'))
    setRespTime()
    if (sessionID) msg += 'sid: ' + sessionID
    afs.log.access(msg.join(' '))
  }

  // record response start
  onHeaders(res, () => recordStartTime(res))

  // log when response finished
  onFinished(res, logRequest)

  next()
}


const fillRoutes = async (aPath) => {
  let restRoutes
  try {
    restRoutes = api.fs.readdirSync(aPath)
  } catch (e) {
    console.log(api.concolor('b,red')(afs.CANT_READ_DIR + aPath))
  }
  // parallel load config from all files
  await Promise.all(
    api._.map(
      restRoutes,
      async (f) => {
        require(api.path.join(aPath, f))
      }
    )
  )
}

rest.sendOraResults = (aResults, req, res) => {
  let lFormat
  switch (req.header('Accept')) {
    case 'application/xml' :
      lFormat = 'xml'
      break
    case 'application/json' :
      lFormat = 'json'
      break
    default:
      lFormat = api.rest.responseFormat
  }

  const bRows = !api._.isEmpty(aResults.rows)
  const bBinds = !api._.isEmpty(aResults.outBinds)

  if (lFormat === 'xml') {
    res.header('content-type', 'application/xml')
    let txt = ''
    if (aResults instanceof Error) {
      res.status(500)
      txt += XML_HEADER + '<ERROR><MESSAGE><![CDATA[' + aResults.message + ']]></MESSAGE></ERROR>'
    } else if (bRows) {
      txt += XML_HEADER + '<ROWSET>'
      for (let i = 0, l = aResults.rows.length; i < l; i++) {
        txt += '<ROW>'
        txt += api.jsonxml(aResults.rows[i])
        txt += '</ROW>'
      }
      txt += '</ROWSET>'
    } else if (bBinds) {
      txt += XML_HEADER + '<RESULT>'
      txt += api.jsonxml(aResults.outBinds)
      txt += '</RESULT>'
    } else {
      res.status(204)
      res.end()
    }
    res.end(txt)
  } else {
    res.header('content-type', 'application/json')
    if (aResults instanceof Error) {
      res.status(500)
      res.end(api.json.stringify({
        error: aResults.message
      }))
    } else if (bRows) {
      res.end(api.json.stringify(aResults.rows))
    } else if (bBinds) {
      res.end(api.json.stringify(aResults.outBinds))
    } else {
      res.status(204)
      res.end()
    }
  }
}

rest.start = async () => {
  if (rest.active) return
  afs.log.server('Starting the REST service…')
  const config = api._.get(afs.config, 'rest')
  if (!config) throw CONFIG_REST_ERROR
  rest.listeningPort = config.port
  rest.responseFormat = config.format
  rest.slowTime = api.common.duration(config.slowTime)
  httpServer = restify.createServer({ name: afs.title })
  /*
    httpServer = express()
    httpServer.set('port', rest.listeningPort)
    httpServer.use(bodyParser.json())
    httpServer.use(bodyParser.urlencoded({ extended: false }))
    httpServer.use(cookieParser())
    // allow cross origin requests
    httpServer.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
      res.header('X-Powered-By', afs.title)
      next()
    })
  */
  httpServer.use(logger)
  //httpServer.use(restify.plugins.acceptParser(httpServer.acceptable))
  httpServer.use(restify.plugins.bodyParser({ mapParams: true }))
  httpServer.use(restify.plugins.queryParser({ mapParams: true }))
  /*httpServer.on('InternalServer', (req, res, route, err) => {
    afs.log.error(afs.normalizeStack(err.stack))
    res.status(500)
    res.end(err.message)
    // this event will be fired, with the error object from above:
    // ReferenceError: x is not defined
  })*/
  httpServer.get(/\/docs\/?.*/, restify.plugins.serveStatic({
    directory: __dirname
  }))
  await fillRoutes(api.path.join(afs.DIR, 'rest', 'priv'))
  if (api.db.pubSessionActive) await fillRoutes(api.path.join(afs.DIR, 'rest', 'pub'))

  httpServer.listen(rest.listeningPort, () => {
    afs.log.server('The REST service listen port ' + rest.listeningPort)
  })
}

rest.get = (aRoute, aHandler) => {
  httpServer.get(aRoute, aHandler)
}

rest.post = (aRoute, aHandler) => {
  httpServer.post(aRoute, aHandler)
}

rest.put = (aRoute, aHandler) => {
  httpServer.put(aRoute, aHandler)
}

rest.patch = (aRoute, aHandler) => {
  httpServer.patch(aRoute, aHandler)
}

rest.delete = (aRoute, aHandler) => {
  httpServer.del(aRoute, aHandler)
}


module.exports = rest

