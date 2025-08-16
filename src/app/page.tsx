import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { buildReactFlowFromGraphQLModules } from '@/parser/graphqlToReactFlow';
import { type GraphQLModule } from '@/types';
import { GraphQLVisualizer } from '@/app/components/GraphQLVisualizer';

async function readSDLs() {
  const schemasDir = path.join(process.cwd(), 'src', 'schemas');
  const schemaFiles = (await readdir(schemasDir)).filter((file) =>
    file.endsWith('.graphql'),
  );

  const contents = await Promise.all(
    schemaFiles.map(async (file): Promise<GraphQLModule> => {
      return {
        name: file.replace(/\.graphql$/, ''),
        sdl: await readFile(path.join(schemasDir, file), 'utf8'),
      };
    }),
  );

  return contents;
}

export default async function GraphQLDSLVisualizer() {
  const graphQLModules = await readSDLs();
  const graphNodes = buildReactFlowFromGraphQLModules(graphQLModules);

  console.log('Graph::: ', graphNodes);

  return (
    <GraphQLVisualizer
      nodes={graphNodes[1].nodes}
      edges={graphNodes[1].edges}
    />
  );
}
