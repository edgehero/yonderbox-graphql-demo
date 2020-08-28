const express = require('express')
const { ApolloServer } = require('apollo-server-express')
const { GraphQLScalarType } = require('graphql')
const gql = require('graphql-tag')

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
  schema: path.resolve('./abstract.schema.json'),
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


const basicSchema = gql`
"A date"
scalar Date

"A object"
scalar Object

"Root Query for querying data"
#@cacheControl(maxAge: 30)
type Query

`

const basicResolvers = {
Date: new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  parseValue(value) {
    return new Date(value) // value from the client
  },
  serialize(value) {
    return value.toUTCString() // value sent to the client
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(ast.value) // ast value is always in string format
    }
    return null
  },
}),
}

const Adapter = require('yonderbox-graphql-mongodb-adapter')

const { schema, resolvers } = Adapter.moduleSetup(setup,'abstract')

const typeDefs = [ basicSchema,schema ]
const dataSources = {}

Adapter.build(setup,'abstract').then(ds => dataSources.abstract = ds )

const options = {
  typeDefs,
  resolvers,
  dataSources:() => dataSources,
  schemaDirectives: {},
  context:require('yonderbox-graphql-mongodb-adapter').context,

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

app.use(async function(req, res, next) {
  Adapter.preProcessVariables(req,res).then( () => next() )
})


apolloServer.applyMiddleware({
  app,
  path: grapQLpath,
  cors: false, // we use espress
})

app.get('/', function(req, res) {
  res.redirect(grapQLpath)
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