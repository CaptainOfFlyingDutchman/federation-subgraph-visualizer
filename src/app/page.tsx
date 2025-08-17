import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { buildReactFlowFromGraphQLModules } from '@/parser/graphqlToReactFlow';
import type { GraphQLModule } from '@/types';
import { GraphQLVisualizer } from '@/components/xyflow/GraphQLVisualizer';
import { SourceProvider } from '@/components/sourceViewer/SourceContext';

async function readSDLs() {
  const schemasDir = path.join(process.cwd(), 'src', 'schemas');
  const schemaFiles = (await readdir(schemasDir)).filter((file) =>
    file.endsWith('.graphql'),
  );

  const sortedFiles = [
    'users.graphql',
    ...schemaFiles.filter((file) => file !== 'users.graphql'),
  ];

  const contents = await Promise.all(
    sortedFiles.map(async (file): Promise<GraphQLModule> => {
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

  return (
    <SourceProvider>
      <GraphQLVisualizer nodes={graphNodes.nodes} edges={graphNodes.edges} />
    </SourceProvider>
  );
}
