const { ApolloClient, gql } = require('apollo-boost')
const { InMemoryCache } = require('apollo-cache-inmemory')
const { createHttpLink } = require('apollo-link-http')


const graphQL = new ApolloClient({
  link: createHttpLink({ uri: 'http://localhost:3100/graphql',fetch: require('node-fetch'), }),
  cache: new InMemoryCache(),
  onError: (e) => { console.error(e) },
})




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
    const query = gql `
query juke($filter: Object) {
  introspect {
    name
    version
    meta
  }
  juke {
    collections(_filter: {slug: "juke-app-home"}) {
      title
      slug
      items(_filter: $filter) {
        ... on Juke_Section {
          title
          images {
            ...imageFragment
          }
        }
      }
    }
  }
}

fragment imageFragment on Juke_Image {
  _id
  image {
    _id
    file {
      url
    }
    description
  }
}
`

    const variables = {
      'filter': {
        'title': {
          '$regex': 'radio',
          '$options': 'i'
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
                  title: expect.stringMatching('radio')
                })
              ])
            })
          ])
        }
      }
    }

    await expect(graphQL.query({query,variables})).resolves.toMatchObject(match)

  })

})
