# Federation Subgraph Visualizer

A small Next.js app that visualizes GraphQL SDL across multiple modules ("subgraphs").

- Reads all .graphql files from `src/schemas` at runtime
- Parses types, fields, arguments, unions, interfaces, enums, inputs, and scalars
- Groups nodes by module (filename) and draws edges where types reference each other
- Lets you view source snippets for types and fields

## Prerequisites

- Node.js 18+ (20 LTS recommended)
- A package manager: npm (bundled with Node)

## Setup

1. Install dependencies
   - npm install
2. Ensure your GraphQL SDL files are in src/schemas (see Data format below).

## Data format

Place one or more GraphQL SDL files with the .graphql extension in `src/schemas`.
Each file is treated as a separate module/subgraph. The module name is the filename without the extension.

- Supported SDL constructs: type, interface, union, enum, input, scalar, and type extensions.
- Cross-module references are supported. For example, a type in users.graphql can reference Product defined in product.graphql.
- File loading order: users.graphql (if present) is loaded first, then all other .graphql files.

Example: src/schemas/users.graphql

```graphql
enum Role {
  ADMIN
  MODERATOR
  USER
  GUEST
}

type User {
  id: ID!
  name: String!
  email: String
  role: Role!
  reviews: [Review!]
}

union SearchResult = User | Product | Review

type Query {
  user(id: ID!): User
  users: [User!]!
  search(term: String!): [SearchResult!]!
}
```

You can add more modules, e.g., src/schemas/product.graphql:

```graphql
type Product {
  id: ID!
  name: String!
}
```

and src/schemas/reviews.graphql:

```graphql
type Review {
  id: ID!
  body: String!
  author: User
  product: Product
}
```

The visualizer will render module groups and draw edges based on field and argument types (e.g., Review.author -> User, Review.product -> Product).

## Run locally

1. Start the development server
   - npm run dev
2. Open http://localhost:3000 in your browser
3. Edit or add .graphql files in src/schemas and refresh. The app will load all .graphql files at request time.

## Build and run (production)

- npm run build && npm start

## Notes and tips

- Module grouping is based on filenames; rename files to change group labels.

## Troubleshooting

- Port already in use: set PORT=3001 (or any free port) before the command, e.g. `PORT=3001 npm run dev`.
- Changes are not visible: ensure your .graphql files are saved in src/schemas and refresh the page.
- Node version issues: upgrade to Node 18 or 20 LTS.
