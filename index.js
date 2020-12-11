process.env.TZ = 'Europe/Amsterdam'

const http = require('http')
const express = require('express')
const { ApolloServer } = require('apollo-server-express')

const path = require('path')
const createError = require('http-errors')

const port = parseInt(process.env.PORT) || 3100
const grapQLpath = '/graphql/'
const yves = require('yves')
const pkg = require('./package.json')
const debug = yves.debugger(pkg.name.replace(/-/g,':'))

const Adapter = require('yonderbox-graphql-mongodb-adapter')


const setups = {}
const glob = require('glob')

const setupFiles = glob.sync(path.join(__dirname,'spaces')+'/*.js', {})
for (let f=0; f<setupFiles.length; f++) {
  const name = path.basename(setupFiles[f], '.js')
  const setup = require(setupFiles[f])
  if (setup) {
    setups[name] = setup
    Adapter.register(name,setup)
  }
}

// const setup = {
//   enabled: true,
//   url: 'mongodb://localhost:3001',
//   db: 'abstract',
//   options: {
//     keepAlive: 1,
//     connectTimeoutMS: 30000,
//     // reconnectTries: Number.MAX_VALUE,
//     // reconnectInterval: 5000,
//   },
//   schema: path.resolve('./spaces/abstract.schema.json'),
//   root: 'Abstract',
//   dataloader: {
//     maxBatchSize:512
//   },
//   introspect: {
//     enabled: true,
//   },
//   limit:1000,
//   writeGraphQLfile:true,
// }

Adapter.setIntrospect({name:pkg.name,version:pkg.version,setup:setups})


const options = {
  typeDefs: Adapter.typeDefs(),
  resolvers: Adapter.resolvers(),
  subscriptions: Adapter.subscriptions(),
  dataSources: Adapter.dataSources, // function
  schemaDirectives: Adapter.schemaDirectives(),
  context:Adapter.context, // function
  plugins: Adapter.plugins({
    useJsonPath: true, // This will see if a '_path' variable exists and then process the GraphQL result with JSONpath. See for '_path' options https://goessner.net/articles/JsonPath/index.html#e2
  }),

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
    if (error && error.extensions && error.extensions.code != 'PERSISTED_QUERY_NOT_FOUND' ) {
      if (!(error.extensions.code == 'INTERNAL_SERVER_ERROR' && error.extensions.response && error.extensions.response.status == 404)) {
        debug('error: %y %s %y',error.extensions.code,error.toString(),error.extensions.exception.stacktrace)
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
  persistedQueries: {
    cache: Adapter.mongodbCache('queries','query')
  },
}

const apolloServer = new ApolloServer(options)

const app = express()

/*app.use(require('cors'))*/

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'html')
app.engine('html', require('hbs').__express)

app.use(express.json({limit: '1mb'}))



app.use( ( req, res, next ) => {
  res.setHeader( 'X-Powered-By', `${pkg.name} v${pkg.version}` )
  next()
})

Adapter.applyMiddleware({
  app,
  redirectRoot: grapQLpath,
  preProcessVariables: true,
  logGraphQL: true,
  metrics:true,
  monitor:true,
  cacheInvalidate: true,
})


apolloServer.applyMiddleware({
  app,
  path: grapQLpath,
/*  cors: false, // we use espress*/
  cors: {
      origin: '*',      // <- allow request from all domains
      credentials: true,
  },
})
const httpServer = http.createServer(app)
apolloServer.installSubscriptionHandlers(httpServer)

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

httpServer.listen({ port} , () => {
  debug(`🚀  YonderBox GraphQL Demo Server ready at http://localhost:${port}${grapQLpath}`)
  debug(`🚀  YonderBox GraphQL Demo Server Subscriptions ready at ws://localhost:${port}${apolloServer.subscriptionsPath}`)
})
