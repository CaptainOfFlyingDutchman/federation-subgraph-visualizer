import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import {
  buildReactFlowFromGraphQLModules,
  FieldSnippets,
  SourceSnippet,
} from '@/parser/graphqlToReactFlow';
import { type GraphQLModule } from '@/types';
import { GraphQLVisualizer } from '@/components/xyflow/GraphQLVisualizer';
import { SourceProvider } from '@/components/sourceViewer/SourceContext';

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

  console.log(
    'Graph::: typeSnippets ',
    JSON.stringify(Array.from(graphNodes[0].typeSnippets), null, 2),
  );

  console.log(
    'Graph::: fieldSnippets',
    JSON.stringify(deepMapToObject(graphNodes[0].fieldSnippets), null, 2),
  );

  return (
    <SourceProvider>
      <GraphQLVisualizer
        nodes={graphNodes[0].nodes}
        edges={graphNodes[0].edges}
      />
    </SourceProvider>
  );
}

// Debug utils
function mapToObject<V>(map: Map<string, V>): Record<string, V> {
  return Object.fromEntries(map);
}

function deepMapToObject(snippets: FieldSnippets) {
  const obj: Record<string, Record<string, SourceSnippet[]>> = {};
  for (const [typeName, fieldMap] of snippets.entries()) {
    obj[typeName] = mapToObject(fieldMap);
  }
  return obj;
}
