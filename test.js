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
  /*  it('should successfully create a user with valid credentials', async() => {
    const createUser = gql `
            mutation {
              createUser(data: {
                name: "Gbolahan Olagunju",
                email: "gbols@example.com",
                password: "dafeMania"
              }){
                token
                user {
                  id
                }
              }
            }
            `;

    const res = await client.mutate({
      mutation: createUser
    })
    const exists = await prisma.$exists.user({
      id: res.data.createUser.id
    });
    expect(exists).toBe(true);
  });

  it('should not create two users with the same crededntials', async() => {
    const createUser = gql `
            mutation {
              createUser(data: {
                name: "Gbolahan Olagunju",
                email: "gbols@example.com",
                password: "dafeMania"
              }){
                token
                user {
                  name
                  password
                  email
                  id
                }
              }
            }
            `;
    await expect(client.mutate({
      mutation: createUser
    })).rejects.toThrowError("A unique constraint would be violated on User. Details: Field name = email");
  });
*/

})
