const express = require('express')
const { ApolloServer } = require('apollo-server-express')

const path = require('path')
const createError = require('http-errors')

const port = parseInt(process.env.PORT) || 3100
const grapQLpath = '/graphql/'
const yves = require('yves')
const pkg = require('./package.json')
const debug = yves.debugger(pkg.name.replace(/-/g,':'))

const setup = {
  enabled: true,
  url: 'mongodb://localhost:3001',
  db: 'abstract',
  options: {
    keepAlive: 1,
    connectTimeoutMS: 30000,
    // reconnectTries: Number.MAX_VALUE,
    // reconnectInterval: 5000,
  },
  schema: path.resolve('./spaces/abstract.schema.json'),
  root: 'Abstract',
  dataloader: {
    maxBatchSize:512
  },
  introspect: {
    enabled: true,
  },
  limit:1000,
  writeGraphQLfile:true,
}

const Adapter = require('yonderbox-graphql-mongodb-adapter')

Adapter.setIntrospect({name:pkg.name,version:pkg.version,config:setup})

Adapter.register('abstract',setup)

const options = {
  typeDefs: Adapter.typeDefs(),
  resolvers:  Adapter.resolvers(),
  dataSources: Adapter.dataSources,
  schemaDirectives: Adapter.schemaDirectives(),
  context:Adapter.context,

  debug: true, // print stack traces, not on prod! XXX

  // Enable playground in prod
  introspection: true,
  playground: {
    endpoint: '/graphql/',
    settings: {
      'request.credentials': 'include',
      'editor.cursorShape': 'line',
    },
  },

  // Response handling
  formatResponse: response => {
    return response
  },
  formatError: error => {
    if (error && error.extensions) {
      if (!(error.extensions.code == 'INTERNAL_SERVER_ERROR' && error.extensions.response && error.extensions.response.status == 404)) {
        debug('error: %s %y',error.toString(),error.extensions.exception.stacktrace)
      } else {
        debug('resonse: %y %s',error.extensions.response && error.extensions.response.url,error.message)
        delete error.extensions // Hides error.extensions as 404 response are not considered an error
      }
      delete error.extensions.exception.stacktrace // Hides inner workings when in production
    }
    return error
  },

  tracing: false,
  cacheControl: {
    calculateHttpHeaders: true,
    defaultMaxAge: 30,
    stripFormattedExtensions: true,
  },
}

const apolloServer = new ApolloServer(options)

const app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'html')
app.engine('html', require('hbs').__express)

app.use(express.json({limit: '1mb'}))

Adapter.applyMiddleware({
  app,
  home: grapQLpath,
  preProcessVariables: true,
  logGraphQL: true,
  metrics:true,
})


apolloServer.applyMiddleware({
  app,
  path: grapQLpath,
  cors: false, // we use espress
})


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

app.listen({ port} , () => {
  debug(`🚀  YonderBox GraphQL Demo Server ready at http://localhost:${port}${grapQLpath}`)
})