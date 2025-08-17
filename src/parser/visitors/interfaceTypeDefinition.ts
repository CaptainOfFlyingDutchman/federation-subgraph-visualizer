import { VisitorFnArgs } from '@/parser/visitors/types';
import {
  collectSourceSnippetForDefinition,
  createNodesEdge,
  getLineNumberAtOffset,
  getNode,
  getTypeName,
} from '@/parser/utils';
import { NodeField, SourceSnippet } from '@/parser/graphqlToReactFlow';
import { InterfaceTypeDefinitionNode } from 'graphql';

export function getInterfaceTypeDefinition({
  nodes,
  edges,
  typeSnippets,
  fieldSnippets,
}: VisitorFnArgs) {
  return function InterfaceTypeDefinition(
    interfaceNode: InterfaceTypeDefinitionNode,
  ) {
    const sourceNode = interfaceNode.name.value;

    const interfaceFields = (interfaceNode.fields || []).map<NodeField>(
      (field) => ({
        name: field.name.value,
        type: getTypeName(field.type),
        args: (field.arguments || []).map((argument) => ({
          name: argument.name.value,
          type: getTypeName(argument.type),
        })),
        hasOutgoing: false,
      }),
    );

    const existingInterfaceNode = getNode(nodes, sourceNode);
    if (existingInterfaceNode) {
      existingInterfaceNode.data.fields = interfaceFields;
    }

    if (interfaceNode.fields) {
      interfaceNode.fields.forEach((field) => {
        createNodesEdge(field, sourceNode, nodes, edges);
      });
    }

    if (interfaceNode.loc) {
      const loc = interfaceNode.loc;
      const body = loc.source.body;
      const moduleName = loc.source.name;
      const code = body.substring(loc.start, loc.end);

      const snippet: SourceSnippet = {
        moduleName,
        code,
        title: `interface ${sourceNode}`,
        startLine: getLineNumberAtOffset(body, loc.start),
        endLine: getLineNumberAtOffset(body, loc.end),
      };

      collectSourceSnippetForDefinition({
        typeSnippets,
        fieldSnippets,
        moduleName,
        body,
        sourceNode,
        astNode: interfaceNode,
        snippet,
      });
    }
  };
}
