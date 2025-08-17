import { VisitorFnArgs } from '@/parser/visitors/types';
import { getLineNumberAtOffset, getNode } from '@/parser/utils';
import { NodeField, SourceSnippet } from '@/parser/graphqlToReactFlow';
import { EnumTypeDefinitionNode } from 'graphql/language';

export function getEnumTypeDefinition({
  nodes,
  typeSnippets,
  fieldSnippets,
}: Omit<VisitorFnArgs, 'edges'>) {
  return function EnumTypeDefinition(enumNode: EnumTypeDefinitionNode) {
    const sourceNode = enumNode.name.value;

    const enumValues = (enumNode.values || []).map<NodeField>((value) => ({
      name: value.name.value,
    }));

    const existingEnumNode = getNode(nodes, sourceNode);
    if (existingEnumNode) {
      existingEnumNode.data = {
        ...existingEnumNode.data,
        fields: enumValues,
      };
    }

    if (enumNode.loc) {
      const loc = enumNode.loc;
      const body = loc.source.body;
      const moduleName = loc.source.name;
      const code = body.substring(loc.start, loc.end);

      const snippet: SourceSnippet = {
        moduleName,
        code,
        title: `enum ${sourceNode}`,
        startLine: getLineNumberAtOffset(body, loc.start),
        endLine: getLineNumberAtOffset(body, loc.end),
      };

      if (!typeSnippets.has(sourceNode)) {
        typeSnippets.set(sourceNode, []);
      }

      typeSnippets.get(sourceNode)?.push(snippet);

      (enumNode.values || []).forEach((value) => {
        if (!value.loc) {
          return;
        }

        const valueLoc = value.loc;
        const valueCode = body.substring(valueLoc.start, valueLoc.end);
        const valueSnippet: SourceSnippet = {
          moduleName,
          code: valueCode,
          title: `enum ${sourceNode}.${value.name.value}`,
          startLine: getLineNumberAtOffset(body, valueLoc.start),
          endLine: getLineNumberAtOffset(body, valueLoc.end),
        };

        if (!fieldSnippets.has(sourceNode)) {
          fieldSnippets.set(sourceNode, new Map());
        }

        const fieldSnippetsMap = fieldSnippets.get(sourceNode);

        if (!fieldSnippetsMap?.has(value.name.value)) {
          fieldSnippetsMap?.set(value.name.value, []);
        }

        fieldSnippetsMap?.get(value.name.value)?.push(valueSnippet);
      });
    }
  };
}
