import {
  collectSourceSnippetForDefinition,
  createNode,
  createProbableEdges,
  getLineNumberAtOffset,
  getNode,
  getTypeName,
  pushUnique,
} from '@/parser/utils';
import type { ObjectTypeExtensionNode } from 'graphql';
import type { VisitorFnArgs } from '@/parser/visitors/types';
import type { NodeField, SourceSnippet } from '@/types';

export function getObjectTypeExtension({
  nodes,
  edges,
  typeSnippets,
  fieldSnippets,
}: VisitorFnArgs) {
  return function ObjectTypeExtension(
    objectExtensionNode: ObjectTypeExtensionNode,
  ) {
    const sourceNode = objectExtensionNode.name.value;

    // Ensure Query node exists
    let queryNode = getNode(nodes, sourceNode);
    if (!queryNode) {
      queryNode = createNode(sourceNode, 'object');
      pushUnique(nodes, queryNode, (n) => n.id);
    }

    const existingFields = queryNode.data.fields || [];
    const newFields = (objectExtensionNode.fields || []).map<NodeField>(
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

    queryNode.data.fields = [...existingFields, ...newFields];

    // TODO: Include interface impl code if required

    createProbableEdges(objectExtensionNode, sourceNode, nodes, edges);

    if (objectExtensionNode.loc) {
      const loc = objectExtensionNode.loc;
      const body = loc.source.body;
      const moduleName = loc.source.name;
      const code = body.substring(loc.start, loc.end);

      const snippet: SourceSnippet = {
        moduleName,
        code,
        title: `extend type ${sourceNode}`,
        startLine: getLineNumberAtOffset(body, loc.start),
        endLine: getLineNumberAtOffset(body, loc.end),
      };

      collectSourceSnippetForDefinition({
        typeSnippets,
        fieldSnippets,
        moduleName,
        body,
        sourceNode,
        astNode: objectExtensionNode,
        snippet,
      });
    }
  };
}
