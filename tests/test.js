const { ApolloClient, gql } = require('apollo-boost')
const { InMemoryCache } = require('apollo-cache-inmemory')
const { createHttpLink } = require('apollo-link-http')

const path = require('path')
const fs = require('fs')
const glob = require('glob')

const graphQL = new ApolloClient  ({
  link: createHttpLink({ uri: 'http://localhost:3100/graphql',fetch: require('node-fetch'), }),
  cache: new InMemoryCache(),
  onError: (e) => { console.error(e) },
})

const queries = {}
const queryFiles = glob.sync(path.join(__dirname,'queries')+'/*.graphql', {})
for (let f=0; f<queryFiles.length; f++) {
  const name = path.basename(queryFiles[f], '.graphql')
  const query = fs.readFileSync(queryFiles[f])
  if (query) {
    queries[name] = gql `${query}`
  }
}

/*beforeAll(async () => {
  await prisma.deleteManyUsers()
})
*/

describe('Tests the Yonderbox GraphQL MongoDB Adapter', () => {
  it('should handle the most basic query "query {__typename}"', async() => {
    const query = gql `query {__typename}`
    await expect(graphQL.query({query})).resolves.toMatchObject({data: {__typename: 'Query'}})
  })
  it('should handle the more complex query', async() => {

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
          collections: expect.arrayContaining([
            expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  title: expect.stringMatching(new RegExp(matchPattern, matchOptions))
                })
              ])
            })
          ])
        }
      }
    }

      const query = queries['filtered_sections']
    await expect(graphQL.query({query,variables})).resolves.toMatchObject(match)

  })

  it('should handle the even more complex query', async() => {

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
          collections: expect.arrayContaining([
            expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                    title: expect.stringMatching(new RegExp(matchPattern, matchOptions))
                })
              ])
            })
          ])
        }
      }
    }

    const query = queries['filtered_sections']
    await expect(graphQL.query({query,variables})).resolves.toMatchObject(match)

  })

})
