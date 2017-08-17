/*!
 * 
 * © Copyright 2016-2017 Igor Gorodetskyy <igorgo16@gmail.com>
 */

'use strict'

afs.config = {}

afs.config.loadFromFile = async file => {
  // file w/o path and extension
  const configKeyName = api.path.basename(file, api.path.extname(file))
  // config file in config dir
  const configFile = api.path.join(afs.DIR, 'config', file)
  // json schema for config file
  const schemaFile = api.path.join(afs.DIR, 'jsonschemas',
    'config.' + api.path.basename(file))
  // parallel read config:0 and schema:1 file
  let contents
  try {
    contents = await Promise.all(
      api._.map(
        [
          { file: configFile, type: 'config' },
          { file: schemaFile, type: 'schema' }
        ],
        async (f) => {
          let lContent
          try {
            lContent = api.fs.readFileSync(f.file)
          } catch (e) {
            if (f.type === 'schema') return null
            throw afs.CANT_READ_FILE + f.file
          }
          try {
            return api.json.parse(lContent)
          } catch (e) {
            if (f.type === 'schema') return null
            throw afs.CANT_PARSE_FILE + f.file
          }
        }
      ))
  } catch (e) {
    console.log(api.concolor('b,red')(e))
    process.exit(1)
  }
  // if returned file and schema then validate on schema
  if (contents[1]) {
    const validate = (new api.jsonschema.Validator())
      .validate(contents[0], contents[1])
    // if there is errors then warn to console and set empty config key
    if (validate.errors.length > 0) {
      let errMessage = afs.CANT_VALIDATE_JSON + file
      for (let i = 0, l = validate.errors.length; i < l; i++) {
        errMessage += '\n\t' + validate.errors[i].stack.replace(/instance/, '')
      }
      console.log(api.concolor('b,yellow')(errMessage))
      afs.config[configKeyName] = {}
      return
    }
  }
  // validate OK or no schema
  afs.config[configKeyName] = contents[0]
}

afs.config.load = async () => {
  const configDir = api.path.join(afs.DIR, 'config')
  // get all files in config dir
  let configFiles
  try {
    configFiles = api.fs.readdirSync(configDir)
  } catch (e) {
    console.log(api.concolor('b,red')(afs.CANT_READ_DIR + configDir))
  }
  // parallel load config from all files
  await Promise.all(
    api._.map(
      configFiles,
      async (f) => {
        await afs.config.loadFromFile(f)
      }
    )
  )
}
