'use strict'

api.rest.get('/hello/:name', (req, res, next) => {
  res.send('hello ' + req.params.name)
  next()
})

