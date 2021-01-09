const { HttpLink } = require( 'apollo-link-http' )
const { InMemoryCache } = require( 'apollo-cache-inmemory' )
const { createPersistedQueryLink } = require( 'apollo-link-persisted-queries' )

const { ApolloClient } = require( 'apollo-client' )
const { ApolloLink } = require( 'apollo-link' )

const gql = require( 'graphql-tag' )

const nodeFetch = require( 'node-fetch' )

const path = require( 'path' )
const fs = require( 'fs' )
const glob = require( 'glob' )
const _ = require( 'lodash' )

const graphQLdirectURL = 'http://localhost:3100/graphql'
const graphQLproxyURL = 'http://localhost/graphql'

const proxy = true
const persistedQueries = false
const testProxyCacheHit = true
const useGETForHashedQueries = true
const useGETForQueries = (persistedQueries && useGETForHashedQueries) ? false : true
const clearCache = true

const pkg = require( '../package.json' )
const yves = require( 'yves' )
const debug = yves.debugger( pkg.name.replace( /-/g,':' ) )

const itif = (condition) => condition ? it : it.skip;

const match_basic = {
  data: {
    headers: expect.objectContaining( {
      'x-powered-by': `${pkg.name} v${pkg.version}`,
    } )
  }
}


/*
const { createHttpLink } = require( 'apollo-link-http' )

const directHttpLinkOptions = { uri: graphQLdirectURL, fetch, useGETForQueries}
const proxyHttpLinkOptions = { uri: graphQLproxyURL, fetch, useGETForQueries}

const graphQL2 = new ApolloClient  ( {
  link: createHttpLink( proxyHttpLinkOptions ),
  cache: new InMemoryCache(),
  onError: ( e ) => { console.error( e ) },
} )
*/


function fetch( url,options ) {
/*  debug('fetch %y %y',url,options)*/
  _.set( options,'headers.user-agent',`${pkg.name} v${pkg.version}` )
  return nodeFetch( url,options )
}

function createApolloClient( {clearCache, persistedQueries } = {} ) {

  const httpLink = new HttpLink( {
    uri: proxy ? graphQLproxyURL : graphQLdirectURL,
    fetch,
    headers: {},
    useGETForQueries,
  } )

  const afterwareLink = new ApolloLink( ( operation, forward ) => {
    return forward( operation ).map( response => {
      const context = operation.getContext()
      if ( response && response.data ) response.data.headers = Object.fromEntries( context.response.headers )
      return response
    } )
  } )
  let link = afterwareLink.concat( httpLink )

  if ( persistedQueries ) link = createPersistedQueryLink( {useGETForHashedQueries} ).concat( link )
  if ( clearCache ) {
    const clearCacheLink = new ApolloLink( ( operation, forward ) => {

      // Use the setContext method to set the HTTP headers.
      operation.setContext( {
        headers: {
          'Cache-Control': 'no-cache' //'no-cache, no-store'
        }
      } )

      // Call the next link in the middleware chain.
      return forward( operation )
    } )

    link = clearCacheLink.concat( link )
  }

  return new ApolloClient( {
    link,
    cache: new InMemoryCache(), //.restore(initialState),
    onError: ( e ) => { console.error( e ) },
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache', // no-cache allow for data changes in afterware
      },
    },
  } )
}




const graphQLinitial = createApolloClient({clearCache})
const graphQLfollowup = createApolloClient()
const graphQLpersistedQuesies = createApolloClient({persistedQueries})



const queries = {}
const queryFiles = glob.sync( path.join( __dirname,'queries' ) + '/*.graphql', {} )
for ( let f = 0; f < queryFiles.length; f++ ) {
  const name = path.basename( queryFiles[f], '.graphql' )
  const query = fs.readFileSync( queryFiles[f],'utf-8' ).replace(/Fragment/g,`Fragment_${name}`)
  if ( query ) {
    queries[name] = gql `${query}`
  }
}

const variables = {}
const variableFiles = glob.sync( path.join( __dirname,'queries' ) + '/*.json', {} )
for ( let f = 0; f < variableFiles.length; f++ ) {
  const name = path.basename( variableFiles[f], '.json' )
  const vars = fs.readFileSync( variableFiles[f],'utf-8' )
  if ( vars && vars.length ) {
    /*    debug('vars %y %y',vars,f)*/
    variables[name] = JSON.parse( vars )
  }
}

/*beforeAll(async () => {
  await prisma.deleteManyUsers()
})
*/

describe( 'Tests the Yonderbox GraphQL MongoDB Adapter', () => {
  it( 'should handle the most basic query "query {__typename}"', async() => {
    const query = gql `query {__typename}`
    const match = {
      data:{
        __typename: 'Query',
        headers: expect.objectContaining( {
          'x-powered-by': `${pkg.name} v${pkg.version}`,
          /*          'x-cache-status': 'MISS'*/
        } )
      }
    }
    await expect( graphQLinitial.query( {query} ) ).resolves.toMatchObject( match )
  } )

  itif(proxy && testProxyCacheHit && (useGETForQueries || (persistedQueries && useGETForHashedQueries)))( 'should handle the most basic query "query {__typename}" from cache', async() => {
    const query = gql `query {__typename}`
    const match = {
      data:{
        __typename: 'Query',
        headers: expect.objectContaining( {
          'x-powered-by': `${pkg.name} v${pkg.version}`,
          'x-cache-status': 'HIT'
        } )
      }
    }
    await expect( graphQLfollowup.query( {query} ) ).resolves.toMatchObject( match )
  } )

  it( 'should handle the more complex query', async() => {

    const matchPattern = 'radio'
    const matchOptions = 'i'

    const variables = {
      'filter': {
        'title': {
          '$regex': matchPattern,
          '$options': matchOptions,
        }
      }
    }

    const match = {
      data: {
        juke: {
          collections: expect.arrayContaining( [
            expect.objectContaining( {
              items: expect.arrayContaining( [
                expect.objectContaining( {
                  title: expect.stringMatching( new RegExp( matchPattern, matchOptions ) )
                } )
              ] )
            } )
          ] )
        },
        headers: expect.objectContaining( {
          'x-powered-by': `${pkg.name} v${pkg.version}`,
        } )
      }
    }

    const query = queries['filtered_sections']
    //    graphQL.query( {query,variables} ).then( data => debug( 'data: %y',data ) )
    await expect( graphQLinitial.query( {query,variables} ) ).resolves.toMatchObject( match )

  } )

  it( 'should handle the even more complex query', async() => {

    const matchPattern = 'Trending'
    const matchOptions = 'i'

    const variables = {
      'filter': {
        'title': {
          '$regex': matchPattern,
          '$options': matchOptions,
        }
      }
    }

    const match = {
      data: {
        juke: {
          collections: expect.arrayContaining( [
            expect.objectContaining( {
              items: expect.arrayContaining( [
                expect.objectContaining( {
                  title: expect.stringMatching( new RegExp( matchPattern, matchOptions ) )
                } )
              ] )
            } )
          ] )
        },
        headers: expect.objectContaining( {
          'x-powered-by': `${pkg.name} v${pkg.version}`,
        } )
      }
    }

    const query = queries['filtered_sections']
    await expect( graphQLinitial.query( {query,variables} ) ).resolves.toMatchObject( match )

  } )

if (0) {
  Object.keys(queries).forEach(key =>
    it( `should handle query key "${key}"`, async() => {
      await expect( graphQLinitial.query( {query:queries[key],variables:variables[key]} ) ).resolves.toMatchObject( match_basic )
    } )
  )
}

  if (1) {
  it( 'should handle query "juke_demo"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_demo'],variables:variables['juke_demo']} ) ).resolves.toMatchObject( match_basic )
  } )

  it( 'should handle query "juke_call_1"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_call_1'],variables:variables['juke_call_1']} ) ).resolves.toMatchObject( match_basic )
  } )

  it( 'should handle query "juke_call_2"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_call_2'],variables:variables['juke_call_2']} ) ).resolves.toMatchObject( match_basic )
  } )

  it( 'should handle query "juke_home_overview_demo"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_home_overview_demo'],variables:variables['juke_home_overview_demo']} ) ).resolves.toMatchObject( match_basic )
  } )

  it( 'should handle query "juke_home_overview_demo"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_home_overview_demo'],variables:variables['juke_home_overview_demo']} ) ).resolves.toMatchObject( match_basic )
  } )
  it( 'should handle query "juke_introspect"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_introspect'],variables:variables['juke_introspect']} ) ).resolves.toMatchObject( match_basic )
  } )
  it( 'should handle query "juke_multiples"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_multiples'],variables:variables['juke_multiples']} ) ).resolves.toMatchObject( match_basic )
  } )
  it( 'should handle query "juke_mutation_update"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_mutation_update'],variables:variables['juke_mutation_update']} ) ).resolves.toMatchObject( match_basic )
  } )
  it( 'should handle query "juke_mutation_insert"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_mutation_insert'],variables:variables['juke_mutation_insert']} ) ).resolves.toMatchObject( match_basic )
  } )
  it( 'should handle query "juke_mutation_delete"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_mutation_delete'],variables:variables['juke_mutation_delete']} ) ).resolves.toMatchObject( match_basic )
  } )
  it( 'should handle query "juke_test"', async() => {
    await expect( graphQLinitial.query( {query:queries['juke_test'],variables:variables['juke_test']} ) ).resolves.toMatchObject( match_basic )
  } )
}

  } )
