/*!
 * Database interface for Afina Sequel Rest Server
 * Copyright(c) 2017 igor-go <igorgo16@gmail.com>
 * MIT Licensed
 */

'use strict'

/**
 * Oracle Bind Parameter
 */
class OraSqlParam {
  /**
   * Set the parameter's direction to IN
   * @returns {OraSqlParam} IN Param
   */
  dirIn() {
    this.dir = api.oci.BIND_IN
    return this
  }

  /**
   * Set the parameter's direction to OUT
   * @returns {OraSqlParam} OUT Param
   */
  dirOut() {
    this.dir = api.oci.BIND_OUT
    return this
  }

  /**
   * Set the parameter's direction to IN/OUT
   * @returns {OraSqlParam} IN/OUT Param
   */
  dirInOut() {
    this.dir = api.oci.BIND_INOUT
    return this
  }

  /**
   * Set the parameter's  datatype to NUMBER
   * @returns {OraSqlParam} number Param
   */
  typeNumber() {
    this.type = api.oci.NUMBER
    return this
  }

  /**
   * Set the parameter's  datatype to STRING
   * @param {number} [maxSize] max length of parameter. It's mandatory for OUT string params
   * @returns {OraSqlParam} varchar Param
   */
  typeString(maxSize) {
    this.type = api.oci.STRING
    if (maxSize) this.maxSize = maxSize
    return this
  }

  /**
   * Set the parameter's  datatype to DATE
   * @returns {OraSqlParam} date Param
   */
  typeDate() {
    this.type = api.oci.DATE
    return this
  }

  /**
   * Set the parameter's  datatype to CLOB
   * @returns {OraSqlParam} clob Param
   */
  typeClob() {
    this.type = api.oci.CLOB
    return this
  }

  /**
   * Set the parameter's  value
   * @param {*} value The Param's Value
   * @returns {OraSqlParam} Param with value
   */
  val(value) {
    this.val = value
    return this
  }
}

/**
 * Oracle Bind Parameters Collection
 */
class OraSqlParams {
  /**
   * Add parameter to collection
   * @param {string} name The Param's name
   * @returns {OraSqlParam} Added parameter
   */
  add(name) {
    const param = new OraSqlParam()
    api._.set(this, name, param)
    return param
  }
}


const db = {}

// Constants
const DEFAULT_RETRY_COUNT = 3
const DEFAULT_RETRY_INTERVAL = '2s'
const DEFAULT_SLOW_TIME = '2s'
const SESSION_TIMEOUT_MINUTES = 60
// todo: reconnet, exceptions

const SESSION_IMPLEMENTATION = 'AdminOnline'
const CONFIG_ERROR = 'Cannot find a datatabase config file. Check if the ' +
  'directory "config" contains a "database.json" file, and if it is valid.'
const CONFIG_SESSION_ERROR = 'Cannot find a session config file. Check if the ' +
  'directory "config" contains a "session.json" file, and if it is valid.'


let pool, sessionConfig, pubSessionID
db.isOpened = false

const pubKeepAlive = () => {
  if (!db.pubSessionActive) return
  db.getConnectionPub().then((c) => {
    c.close()
  })
}

const pubLogon = async () => {
  db.pubSessionActive = false
  if (!api._.get(sessionConfig, 'enablePublicSession')) return
  const cLogInfo = await api.db.logon(sessionConfig.pubUser, sessionConfig.pubPassword)
  pubSessionID = cLogInfo.sessionID
  db.pubSessionInfo = cLogInfo
  api._.unset(db.pubSessionInfo, 'sessionID')
  db.pubSessionActive = true
  afs.log.server(`The public session is started (user: ${sessionConfig.pubUser})`)
  db.pubSessionTimer = api.timers.setInterval(
    pubKeepAlive,
    api.common.duration('30m')
  )
}


db.open = async () => {
  if (db.isOpened) return
  afs.log.server('Opening the database…')
  db.config = api._.get(afs.config, 'database')
  if (!db.config) throw new Error(CONFIG_ERROR)
  sessionConfig = api._.get(afs.config, 'session')
  if (!sessionConfig) throw new Error(CONFIG_SESSION_ERROR)
  db.alias = api._.get(db.config, 'alias')
  db.schema = api._.get(db.config, 'schema')
  api.oci.outFormat = api.oci.OBJECT
  api.oci.maxRows = 10000
  api.oci.fetchAsString = [api.oci.CLOB]
  pool = await api.oci.createPool({
    user: api._.get(db.config, 'username'),
    password: api._.get(db.config, 'password'),
    connectString: db.alias
  })
  db.isOpened = true
  afs.log.server('The database is open')
  await pubLogon()
}

db.createParams = () => new OraSqlParams()

db.close = async () => {
  afs.log.server('Closing the database…')
  if (!db.isOpened) return
  if (db.pubSessionActive) {
    api.timers.clearInterval(db.pubSessionTimer)
    await db.logoff(pubSessionID)
    afs.log.server('The public session is closed')
  }
  await pool.terminate()
  db.isOpened = false
  afs.log.server('The database is closed')
}

/**
 * Creates connection, sets the session schema, and changes session context to session utilizer
 * @param {string} aSessionId Afina Sequel Session ID
 * @returns {Promise.<oracledb.Connection>} Connection object is obtained by a Pool
 */
db.getConnection = async (aSessionId) => {
  if (!db.isOpened) await db.open()
  const lConnection = await pool.getConnection()
  await lConnection.execute(`alter session set CURRENT_SCHEMA = ${db.schema}`)
  await lConnection.execute('begin PKG_SESSION.VALIDATE_WEB(SCONNECT => :SCONNECT); end;', [aSessionId])
  return lConnection
}

db.getConnectionPub = async () => await db.getConnection(pubSessionID)

/**
 * Executes a statement
 * @param {string} aSessionId An Afina Sequel Session ID
 * @param {string} aSql The SQL string that is executed. The SQL string may contain bind parameters.
 * @param {OraSqlParams|Array} [aBindParams] Definintion and values of the bind parameters.
 * It's needed if there are bind parameters in the SQL statement
 * @param {{}|oracledb.IExecuteOptions} [aExecuteOptions] Execution options o control statement execution,
 * such a fetchInfo, outFormat etc.
 * @param {oracledb.Connection} [aConnection] Existing connection. If it is set, then connection won't be closed,
 * if not set the new connection will be open and will be closed after execution
 * @returns {Promise.<oracledb.IExecuteReturn>} The result Object. See https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-result-object-properties
 */
db.execute = async (aSessionId, aSql, aBindParams = [], aExecuteOptions = {}, aConnection = null) => {
  const lConnection = aConnection ? aConnection : (await db.getConnection(aSessionId))
  try {
    return await lConnection.execute(aSql, aBindParams, aExecuteOptions)
  } catch (e) {
    afs.log.error(afs.normalizeStack(e.stack))
    return e
  } finally {
    aConnection || await lConnection.close()
  }
}

db.executePub = async (aSql, aBindParams = [], aExecuteOptions = {}, aConnection = null) => await db.execute(
  pubSessionID, aSql, aBindParams, aExecuteOptions, aConnection
)

/**
 * Logon to AfinaSql by utilizer
 * @param {string} aAfinaUser Afina's user name
 * @param {string} aAfinaWebPassword Afina's user web password
 * @param {string} [aAfinaCompany] Code of the session company
 * @param {string} [aAfinaApplication] Code of the Afina App, e.g. Admin, Balance …
 * @param {string} [aAfinaInterfaceLanguage] The session language (UKRAINIAN or RUSSIAN)
 * @returns {Promise.<logon>} New user session information
 * @property {number} nCompany Session company RN
 * @property {string} userFullName Session user full name
 * @property {string} appName Afina application name
 * @property {string} sCompanyName Session company name
 * @property {string} sessionID  An Afina Sequel Session ID
 */
db.logon = async (
  aAfinaUser,
  aAfinaWebPassword,
  aAfinaCompany,
  aAfinaApplication,
  aAfinaInterfaceLanguage) => {
  const lSessionId = (api.crypto.randomBytes(24)).toString('hex')
  const sqlLogon =
    `begin
       PKG_SESSION.LOGON_WEB(SCONNECT        => :SCONNECT,
                             SUTILIZER       => :SUTILIZER,
                             SPASSWORD       => :SPASSWORD,
                             SIMPLEMENTATION => :SIMPLEMENTATION,
                             SAPPLICATION    => :SAPPLICATION,
                             SCOMPANY        => :SCOMPANY,
                             ${!sessionConfig.oldVersion ? 'SBROWSER        => :SBROWSER,' : ''}
                             SLANGUAGE       => :SLANGUAGE);
     end;`
  const paramsLogin = db.createParams()
  paramsLogin.add('SCONNECT').val(lSessionId)
  paramsLogin.add('SUTILIZER').val(aAfinaUser || sessionConfig.login)
  paramsLogin.add('SPASSWORD').val(aAfinaWebPassword || sessionConfig.password)
  paramsLogin.add('SIMPLEMENTATION').val(SESSION_IMPLEMENTATION)
  paramsLogin.add('SAPPLICATION').val(aAfinaApplication || sessionConfig.appcode)
  paramsLogin.add('SCOMPANY').val(aAfinaCompany || sessionConfig.company)
  paramsLogin.add('SLANGUAGE').val(aAfinaInterfaceLanguage || sessionConfig.language)
  !sessionConfig.oldVersion && paramsLogin.add('SBROWSER').val(afs.title)
  const sqlTimeout = 'begin PKG_SESSION.TIMEOUT_WEB(:CONNECT, :TIMEOUT); end;'
  const paramsTimeout = db.createParams()
  paramsTimeout.add('CONNECT').val(lSessionId)
  paramsTimeout.add('TIMEOUT').typeNumber().val(SESSION_TIMEOUT_MINUTES)
  const sqlInfo =
    `select 
        PKG_SESSION.GET_COMPANY(0) as NCOMPANY, 
        PKG_SESSION.GET_UTILIZER_NAME() as SFULLUSERNAME, 
        PKG_SESSION.GET_APPLICATION_NAME(0) as SAPPNAME, 
        PKG_SESSION.GET_COMPANY_FULLNAME(0) as SCOMPANYFULLNAME 
    from dual`
  if (!db.isOpened) await db.open()
  const lConnection = await pool.getConnection()
  await lConnection.execute(`alter session set CURRENT_SCHEMA = ${db.schema}`)
  try {
    await lConnection.execute(sqlLogon, paramsLogin, {})
    await lConnection.execute(sqlTimeout, paramsTimeout, {})
    const resultInfo = (await lConnection.execute(sqlInfo, {}, {})).rows[0]
    const result = {
      sessionID: lSessionId,
      nCompany: resultInfo['NCOMPANY'],
      sCompanyName: resultInfo['SCOMPANYFULLNAME'],
      userFullName: resultInfo['SFULLUSERNAME'],
      appName: resultInfo['SAPPNAME']
    }
    let authMessage = 'Session started:'
    authMessage += '\n\tseesion ID: ' + lSessionId
    authMessage += '\n\tuser      : ' + resultInfo['SFULLUSERNAME']
    authMessage += '\n\tcompany   : ' + (aAfinaCompany || sessionConfig.company)
    afs.log.auth(authMessage)
    return result
  } finally {
    await lConnection.close()
  }
}

/**
 * Logs off from AfinaSql
 * @param {string} aSessionId An Afina Sequel Session ID
 * @returns {Promise.<number>} 0 if no errors, -1 if some error occurs
 */
db.logoff = async (aSessionId) => {
  try {
    await db.execute(aSessionId, 'begin PKG_SESSION.LOGOFF_WEB(SCONNECT => :SCONNECT); end;', [aSessionId])
    let authMessage = 'Session finished:'
    authMessage += '\n\tseesion ID: ' + aSessionId
    afs.log.auth(authMessage)
  } catch (e) {
    afs.log.warning('Attempt logoff from non logged session')
  }
}


module.exports = db
