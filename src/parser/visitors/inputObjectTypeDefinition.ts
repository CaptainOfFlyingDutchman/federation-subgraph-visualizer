import type { VisitorFnArgs } from '@/parser/visitors/types';
import {
  collectSourceSnippetForDefinition,
  createEdgeId,
  getLineNumberAtOffset,
  getNode,
  getTargetNodeName,
  getTypeName,
  markOutgoing,
  pushUnique,
} from '@/parser/utils';
import type { InputObjectTypeDefinitionNode } from 'graphql';
import type { NodeField, SourceSnippet } from '@/types';

export function getInputObjectTypeDefinition({
  nodes,
  edges,
  typeSnippets,
  fieldSnippets,
}: VisitorFnArgs) {
  return function InputObjectTypeDefinition(
    inputNode: InputObjectTypeDefinitionNode,
  ) {
    const sourceNode = inputNode.name.value;

    const inputFields = (inputNode.fields || []).map<NodeField>((field) => ({
      name: field.name.value,
      type: getTypeName(field.type),
      hasOutgoing: false,
    }));

    const existingInputNode = getNode(nodes, sourceNode);
    if (existingInputNode) {
      existingInputNode.data.fields = inputFields;
    }

    if (inputNode.fields) {
      inputNode.fields.forEach((field) => {
        const targetNode = getTargetNodeName(field.type);

        pushUnique(
          edges,
          {
            id: createEdgeId(sourceNode, targetNode, 'inputField'),
            source: sourceNode,
            target: targetNode,
            animated: true,
            sourceHandle: `field-${field.name.value}`,
            data: {
              relation: 'inputField',
              field: field.name.value,
              type: getTypeName(field.type),
            },
          },
          (e) => e.id,
        );

        markOutgoing(nodes, sourceNode, field.name.value);
      });
    }

    if (inputNode.loc) {
      const loc = inputNode.loc;
      const body = loc.source.body;
      const moduleName = loc.source.name;
      const code = body.substring(loc.start, loc.end);

      const snippet: SourceSnippet = {
        moduleName,
        code,
        title: `input ${sourceNode}`,
        startLine: getLineNumberAtOffset(body, loc.start),
        endLine: getLineNumberAtOffset(body, loc.end),
      };

      collectSourceSnippetForDefinition({
        typeSnippets,
        fieldSnippets,
        moduleName,
        body,
        sourceNode,
        astNode: inputNode,
        snippet,
      });
    }
  };
}
