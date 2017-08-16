/*!
 * Afina Sequel Rest Server Registry
 * Copyright(c) 2017 igor-go <igorgo16@gmail.com>
 * MIT Licensed
 */

'use strict'

/**
 * Global API namespace
 * @namespace
 */
global.api = {}

/**
 * API registry for Afina Sequel Rest Server
 * @namespace
 */
api.registry = {}

api.registry.load = () => {
  api.json = JSON
  api.fs = require('fs')
  api.path = require('path')
  api.events = require('events')
  api.timers = require('timers')
  api.crypto = require('crypto')
  api.http = require('http')
  api._ = require('lodash')
  api.concolor = require('concolor')
  api.mkdirp = require('mkdirp')
  api.jsonschema = require('jsonschema')
  api.jsonxml = require('jsontoxml')
  api.common = require('./api.common')
  api.oci = require('oracle12db-win64')
  api.db = require('./api.db')
  api.rest = require('./api.rest')
}
