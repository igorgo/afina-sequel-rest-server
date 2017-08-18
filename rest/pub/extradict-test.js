/*!
 * © Copyright 2016-2017 Igor Gorodetskyy <igorgo16@gmail.com>
 */

'use strict'

let nExtraDictVersion = null
let nExtraDictRn = null
let nCompany = null
const EXTRA_DICT_CODE = 'TEST_WEB'

const getExtraDictVersion = async () => {
  const sql =
    'begin FIND_VERSION_BY_COMPANY(NCOMPANY => :NCOMPANY, SUNITCODE => :SUNITCODE, NVERSION => :NVERSION); end;'
  const params = api.db.createParams()
  params.add('NCOMPANY').dirIn().typeNumber().val(nCompany)
  params.add('SUNITCODE').dirIn().typeString().val('ExtraDictionaries')
  params.add('NVERSION').dirOut().typeNumber()
  nExtraDictVersion = (await api.db.executePub(sql, params)).outBinds['NVERSION']
}

const getExtraDictRn = async () => {
  const sql = `
  begin
    FIND_EXTRA_DICT_BY_CODE(NFLAG_SMART    => :NFLAG_SMART,
                            NCOMPANY       => :NCOMPANY,
                            SCODE          => :SCODE,
                            NRN            => :NRN,
                            NFORMAT        => :NFORMAT,
                            NNUM_WIDTH     => :NNUM_WIDTH,
                            NNUM_PRECISION => :NNUM_PRECISION,
                            NSTR_WIDTH     => :NSTR_WIDTH,
                            SNAME          => :SNAME);
  end;
  `
  const params = api.db.createParams()
  params.add('NFLAG_SMART').dirIn().typeNumber().val(0)
  params.add('NCOMPANY').dirIn().typeNumber().val(nCompany)
  params.add('SCODE').dirIn().typeString().val(EXTRA_DICT_CODE)
  params.add('NRN').dirOut().typeNumber()
  params.add('NFORMAT').dirOut().typeNumber()
  params.add('NNUM_WIDTH').dirOut().typeNumber()
  params.add('NNUM_PRECISION').dirOut().typeNumber()
  params.add('NSTR_WIDTH').dirOut().typeNumber()
  params.add('SNAME').dirOut().typeString(320)
  nExtraDictRn = (await api.db.executePub(sql, params)).outBinds['NRN']
}

const init = async () => {
  nCompany = api.db.pubSessionInfo.nCompany
  if (!nExtraDictVersion) await getExtraDictVersion()
  if (!nExtraDictRn) await getExtraDictRn()
}

const getHandler = async (req, res, next) => {
  await init()
  const code = api._.get(req, 'params.code')
  const codeCondition = code ? ' and SSTR_VALUE = :CODE ' : ''
  const sql = `
  select NRN, SSTR_VALUE as SCODE, SNOTE as SNAME 
    from V_EXTRA_DICTS_VALUES 
   where NPRN=:PRN ${codeCondition} 
   order by SSTR_VALUE`
  const params = api.db.createParams()
  params.add('PRN').typeNumber().val(nExtraDictRn)
  code && params.add('CODE').typeString().val(code)
  api.rest.sendOraResults(await api.db.executePub(sql, params), req, res)
  next()
}

const insertHandler = async (req, res, next) => {
  await init()
  const sql = `  
     begin
       PKG_PROC_BROKER.PROLOGUE;
       PKG_PROC_BROKER.SET_PARAM_NUM('NCOMPANY', :NCOMPANY);
       PKG_PROC_BROKER.SET_PARAM_NUM('NPRN', :NPRN);
       PKG_PROC_BROKER.SET_PARAM_STR('SSTR_VALUE', :SCODE);
       PKG_PROC_BROKER.SET_PARAM_NUM('NNUM_VALUE', NULL);
       PKG_PROC_BROKER.SET_PARAM_DAT('DDATE_VALUE', NULL);
       PKG_PROC_BROKER.SET_PARAM_STR('SNOTE', :SNAME);
       PKG_PROC_BROKER.SET_PARAM_NUM('NRN');
       PKG_PROC_BROKER.EXECUTE('P_EXTRA_DICTS_VALUES_INSERT', 1);
       PKG_PROC_BROKER.GET_PARAM_NUM(0, 'NRN', :NRN);
       PKG_PROC_BROKER.EPILOGUE;
     exception
       when others then
         PKG_PROC_BROKER.EPILOGUE;
         raise;
     end;`
  const params = api.db.createParams()
  params.add('NCOMPANY').dirIn().typeNumber().val(nCompany)
  params.add('NPRN').dirIn().typeNumber().val(nExtraDictRn)
  params.add('SCODE').dirIn().typeString().val(api._.get(req, 'params.code'))
  params.add('SNAME').dirIn().typeString().val(api._.get(req, 'params.name'))
  params.add('NRN').dirOut().typeNumber()
  api.rest.sendOraResults(await api.db.executePub(sql, params), req, res)
  next()
}

const updateHandler = async (req, res, next) => {
  await init()
  const sql = `  
     begin
       PKG_PROC_BROKER.PROLOGUE;
       PKG_PROC_BROKER.SET_PARAM_NUM('NCOMPANY', :NCOMPANY);
       PKG_PROC_BROKER.SET_PARAM_NUM('NRN', :NRN);
       PKG_PROC_BROKER.SET_PARAM_NUM('NPRN', :NPRN);
       PKG_PROC_BROKER.SET_PARAM_STR('SSTR_VALUE', :SCODE);
       PKG_PROC_BROKER.SET_PARAM_NUM('NNUM_VALUE', NULL);
       PKG_PROC_BROKER.SET_PARAM_DAT('DDATE_VALUE', NULL);
       PKG_PROC_BROKER.SET_PARAM_STR('SNOTE', :SNAME);
       PKG_PROC_BROKER.EXECUTE('P_EXTRA_DICTS_VALUES_UPDATE', 1);
       PKG_PROC_BROKER.EPILOGUE;
     exception
       when others then
         PKG_PROC_BROKER.EPILOGUE;
         raise;
     end;`
  const params = api.db.createParams()
  afs.log.debug(req.params)
  params.add('NCOMPANY').dirIn().typeNumber().val(nCompany)
  params.add('NRN').dirIn().typeNumber().nVal(api._.get(req, 'params.rn'))
  params.add('NPRN').dirIn().typeNumber().val(nExtraDictRn)
  params.add('SCODE').dirIn().typeString().val(api._.get(req, 'params.code'))
  params.add('SNAME').dirIn().typeString().val(api._.get(req, 'params.name'))
  afs.log.debug(params)
  api.rest.sendOraResults(await api.db.executePub(sql, params), req, res)
  next()
}
const deleteHandler = async (req, res, next) => {
  await init()
  const sql = `  
    begin
      PKG_PROC_BROKER.PROLOGUE;
      PKG_PROC_BROKER.SET_PARAM_NUM('NCOMPANY', :NCOMPANY);
      PKG_PROC_BROKER.SET_PARAM_NUM('NRN', :NRN);
      PKG_PROC_BROKER.EXECUTE('P_EXTRA_DICTS_VALUES_DELETE', 1);
      PKG_PROC_BROKER.EPILOGUE;
    exception
      when others then
        PKG_PROC_BROKER.EPILOGUE;
        raise;
    end;`
  const params = api.db.createParams()
  params.add('NCOMPANY').dirIn().typeNumber().val(nCompany)
  params.add('NRN').dirIn().typeNumber().nVal(api._.get(req, 'params.rn'))
  api.rest.sendOraResults(await api.db.executePub(sql, params), req, res)
  next()
}



api.rest.get('/pub/tstEntity/:code', getHandler)
api.rest.get('/pub/tstEntity', getHandler)
api.rest.put('/pub/tstEntity', insertHandler)
api.rest.patch('/pub/tstEntity', updateHandler)
api.rest.delete('/pub/tstEntity', deleteHandler)

