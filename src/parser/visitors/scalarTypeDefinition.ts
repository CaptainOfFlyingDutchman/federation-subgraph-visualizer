import { VisitorFnArgs } from '@/parser/visitors/types';
import { getLineNumberAtOffset } from '@/parser/utils';
import { SourceSnippet } from '@/parser/graphqlToReactFlow';
import { ScalarTypeDefinitionNode } from 'graphql/language';

export function getScalarTypeDefinition({
  typeSnippets,
}: Pick<VisitorFnArgs, 'typeSnippets'>) {
  return function ScalarTypeDefinition(scalarNode: ScalarTypeDefinitionNode) {
    if (!scalarNode.loc) {
      return;
    }

    const sourceNode = scalarNode.name.value;
    const loc = scalarNode.loc;
    const body = loc.source.body;
    const moduleName = loc.source.name;
    const code = body.substring(loc.start, loc.end);

    const snippet: SourceSnippet = {
      moduleName,
      code,
      title: `scalar ${sourceNode}`,
      startLine: getLineNumberAtOffset(body, loc.start),
      endLine: getLineNumberAtOffset(body, loc.end),
    };

    if (!typeSnippets.has(sourceNode)) {
      typeSnippets.set(sourceNode, []);
    }

    typeSnippets.get(sourceNode)?.push(snippet);
  };
}
