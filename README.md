# yonderbox-graphql-demo
YondeBox GraphQL Demo featuring Contentful to MongoDB mapping

This project tries to demonstrate the use of two packages collaborating through somthing called 'abstract schema'. This is a very simple representation of a data model. Simple in the sence that it is simple to understand JSON (for humans), simple to generate or convert to (for machines), but still powerful enough to power a very fast GraphQL/MongoDB combination.

To demonstrate this, first (1) we are going to make a backup of a Contentful space, then (2) we are going to convert a Contentful backup into a Abstract Schema, and import it into MongoDB. Then we are going to start a GraphQL server that will use this Abstract Schema to drive it and allow access to the MongoDB data in a typical GraphQL way.

To run this project, please check it out by issueing the command.

```
git clone git@github.com:jorisroling/yonderbox-graphql-demo.git
```

After that, please move in the newly created directory:

```
cd yonderbox-graphql-demo
npm install
```

We start with making the (1) Contentful Backup by issuing the following:

```
SPACE_ID=<Your Contentful Space ID> MANAGEMENT_TOKEN=<Your Contentful Managemnt Token> npm run fetch-backup
```

This will (if all works out) create a `data` directory, containing a backup file. To import this last backup, usue the following:

```
npm run import-backup
```

This will import the Contentfull backup into the MongoDB database.

Now we are ready to see it run this with GraphQL interface, by doing so:

```
npm start
```