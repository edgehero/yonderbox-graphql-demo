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

const proxy = false
const persistedQueries = true
const testProxyCacheHit = false
const useGETForQueries = false
const useGETForHashedQueries = true
const clearCache = true

const pkg = require( '../package.json' )
const yves = require( 'yves' )
const debug = yves.debugger( pkg.name.replace( /-/g,':' ) )

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


function fetch(url,options) {
  debug('fetch %y %y',url,options)
  _.set(options,'headers.user-agent',`${pkg.name} v${pkg.version}`)
  return nodeFetch(url,options)
}

function createApolloClient( initialState = {} ) {

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
          'Cache-Control': 'no-cache, no-store'
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




const graphQL = createApolloClient()



const queries = {}
const queryFiles = glob.sync( path.join( __dirname,'queries' ) + '/*.graphql', {} )
for ( let f = 0; f < queryFiles.length; f++ ) {
  const name = path.basename( queryFiles[f], '.graphql' )
  const query = fs.readFileSync( queryFiles[f] )
  if ( query ) {
    queries[name] = gql `${query}`
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
    const respons = graphQL.query( {query} ) //.then( data => console.log(data) )
    await expect( graphQL.query( {query} ) ).resolves.toMatchObject( match )

    if ( testProxyCacheHit ) {
      match.data.headers.sample['x-cache-status'] = 'HIT'
      //      debug('dd %y %y',match.data.headers,respons)
      await expect( graphQL.query( {query} ) ).resolves.toMatchObject( match )
    }
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
    await expect( graphQL.query( {query,variables} ) ).resolves.toMatchObject( match )

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
    await expect( graphQL.query( {query,variables} ) ).resolves.toMatchObject( match )

  } )

} )
