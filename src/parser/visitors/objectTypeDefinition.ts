import {
  collectSourceSnippetForDefinition,
  createProbableEdges,
  getLineNumberAtOffset,
  getNode,
  getTypeName,
} from '@/parser/utils';
import type { ObjectTypeDefinitionNode } from 'graphql';
import type { VisitorFnArgs } from '@/parser/visitors/types';
import type { NodeField, SourceSnippet } from '@/types';

export function getObjectTypeDefinition({
  nodes,
  edges,
  typeSnippets,
  fieldSnippets,
}: VisitorFnArgs) {
  return function ObjectTypeDefinition(objectNode: ObjectTypeDefinitionNode) {
    const sourceNode = objectNode.name.value;

    const nodeFields = (objectNode.fields || []).map<NodeField>((field) => ({
      name: field.name.value,
      type: getTypeName(field.type),
      args: (field.arguments || []).map((argument) => ({
        name: argument.name.value,
        type: getTypeName(argument.type),
      })),
      hasOutgoing: false,
    }));

    const node = getNode(nodes, sourceNode);
    if (node) {
      node.data.fields = nodeFields;
    }

    // TODO: Include interface impl code if required

    createProbableEdges(objectNode, sourceNode, nodes, edges);

    if (objectNode.loc) {
      const loc = objectNode.loc;
      const body = loc.source.body;
      const moduleName = loc.source.name;
      const code = body.substring(loc.start, loc.end);

      const snippet: SourceSnippet = {
        moduleName,
        code,
        title: `type ${sourceNode}`,
        startLine: getLineNumberAtOffset(body, loc.start),
        endLine: getLineNumberAtOffset(body, loc.end),
      };

      collectSourceSnippetForDefinition({
        typeSnippets,
        fieldSnippets,
        moduleName,
        body,
        sourceNode,
        astNode: objectNode,
        snippet,
      });
    }
  };
}
