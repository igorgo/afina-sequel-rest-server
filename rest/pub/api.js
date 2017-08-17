/*!
 * © Copyright 2016-2017 Igor Gorodetskyy <igorgo16@gmail.com>
 */

const helper = (req, res, next) => {
  let help = {}
  help.commonHeaders = {
    'Accept': {
      'description': 'sets output format',
      'values': {
        'application/xml': 'returns results in xml format',
        'application/json': 'returns results in json format'
      }
    },
    'Content-Type': {
      'description': 'When you send the data with POST, PUT, PATCH, DELETE methods set it with your type of content',
      'values': {
        'application/json': 'fo raw json body',
        'application/x-www-form-urlencoded': 'for urlencoded form data',
        'multipart/form-data': 'for multipart form data with boundary'
      }
    },
    'x-afs-session-id': {
      'description': '(only for non public resources) the Afina Sequel session ID obtained with logon'
    }
  }
  help.resources = {
    '/pub/currency': {
      description: 'rates of currency',
      methods: {
        'GET': {
          description: 'returns list of currencies and their last rate',
          params: {},
          result: 'recordset',
          recordFields: {
            'RN': 'Registry number of the currency',
            'CURCODE': 'Digital currency code (national classification)',
            'INTCODE': 'ISO currency code (international classification)',
            'CURNAME': 'Currency name',
            'DCURDATEBEG': 'date of rate',
            'NCURSUM': 'rate measure of currency',
            'NEQUALSUM': 'value of currency in hryvnia'
          }
        }
      }
    },
    '/pub/tstEntity': {
      description: 'abstract entity for testing',
      methods: {
        'GET': {
          description: 'returns list of entities',
          params: {},
          result: 'recordset',
          recordFields: {
            'NRN': 'Registry number of the entity',
            'SCODE': 'entity code',
            'SNAME': 'entity name'
          }
        },
        'PUT': {
          description: 'inserts new entity',
          params: {
            'code': 'entity code',
            'name': 'entity name'
          },
          result: 'output',
          outputFields: {
            'NRN': 'Registry number of inserted entity',
          }
        },
        'PATCH': {
          description: 'updates existing entity',
          params: {
            'rn': 'Registry number of updating entity',
            'code': 'Entity code',
            'name': 'Entity name'
          },
          result: 'none'
        },
        'DELETE': {
          description: 'deletes existing entity',
          params: {
            'rn': 'Registry number of deleting entity'
          },
          result: 'none'
        }
      }
    },
    '/pub/tstEntity/:code': {
      description: 'abstract entity for testing',
      methods: {
        'GET': {
          description: 'returns entity by code',
          params: {
            'code': 'Entity code'
          },
          result: 'recordset',
          recordFields: {
            'NRN': 'Registry number of the entity',
            'SCODE': 'entity code',
            'SNAME': 'entity name'
          }
        }
      }
    }
  }
  res.json(help)
}

api.rest.get('/pub/api', helper)
