'use strict'

api.rest.get('/hello/:name', (req, res, next) => {
  res.send('hello ' + req.params.name)
  next()
})


let nCurrencyVersion = null

const ncompany = api.db.pubSessionInfo.ncompany

const getCurrencyVersion = async () => {
  const sql =
    'begin PARUS.FIND_VERSION_BY_COMPANY(NCOMPANY => :NCOMPANY, SUNITCODE => :SUNITCODE, NVERSION => :NVERSION); end;'
  const params = api.db.createParams()
  params.add('NCOMPANY').dirIn().typeNumber().val(ncompany)
  params.add('SUNITCODE').dirIn().typeString().val('CURNAMES')
  params.add('NVERSION').dirOut().typeNumber()
  nCurrencyVersion = (await api.db.executePub(sql, params)).outBinds['NVERSION']
}


api.rest.get('/pub/currency', async (req, res, next) => {
  if (!nCurrencyVersion) await getCurrencyVersion()
  const sql = `
select C.rn,
       C.curcode,
       C.intcode,
       C.curname,
       H.dcurdatebeg,
       H.ncursum,
       round(H.nequalsum,5) as nequalsum
  from V_CURNAMES C,
       V_CURHIST  H,
       (select distinct H2.NPRN, max(H2.dcurdatebeg) over (PARTITION BY H2.NPRN) D  
          from V_CURHIST H2 where H2.nopersign = 1) HH
 where HH.NPRN = C.RN
       and H.nprn = C.RN
       and H.dcurdatebeg = hh.d
       and h.nopersign = 1
       and h.sequalcur = 'UAH'
   and C.VERSION = :NVERSION
 order by CURCODE`
  api.rest.sendOraResults(await api.db.executePub(sql, [nCurrencyVersion]), req, res)
  next()
}
)

api.rest.post('/pub/currency', (req, res, next) => {
  afs.log.debug(req.params)
  res.end('OK')
  next()
})
