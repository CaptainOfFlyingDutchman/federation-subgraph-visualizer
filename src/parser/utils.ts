import {
  type ASTNode,
  type FieldDefinitionNode,
  type InterfaceTypeDefinitionNode,
  Kind,
  type NameNode,
  type ObjectTypeDefinitionNode,
  type ObjectTypeExtensionNode,
  type TypeNode,
} from 'graphql';
import type { EdgeData, NodeData } from '@/parser/graphqlToReactFlow';
import type { Edge, Node } from '@xyflow/react';

export const customNodeType = 'typeNode';

export function getNodeKind(astNode: ASTNode): NodeData['kind'] | null {
  switch (astNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return 'object';
    case Kind.INTERFACE_TYPE_DEFINITION:
      return 'interface';
    case Kind.UNION_TYPE_DEFINITION:
      return 'union';
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return 'input';
    case Kind.ENUM_TYPE_DEFINITION:
      return 'enum';
    case Kind.SCALAR_TYPE_DEFINITION:
      return 'scalar';
    default:
      return null;
  }
}

export function pushUnique<T>(array: T[], item: T, key: (node: T) => string) {
  const id = key(item);

  if (!array.some((n) => key(n) === id)) {
    array.push(item);
  }
}

export function createNode(
  id: NameNode['value'],
  kind: NodeData['kind'],
): Node<NodeData> {
  return {
    id,
    type: customNodeType,
    position: { x: 0, y: 0 },
    data: { label: id, kind, fields: [] },
  };
}

export function createEdgeId(
  source: string,
  target: string,
  label?: string,
): string {
  return label ? `${source} -> ${target} [${label}]` : `${source} -> ${target}`;
}

export function getTypeName(typeNode: TypeNode): string {
  switch (typeNode.kind) {
    case Kind.NAMED_TYPE:
      return typeNode.name.value;
    case Kind.LIST_TYPE:
      return `[${getTypeName(typeNode.type)}]`;
    case Kind.NON_NULL_TYPE:
      return `${getTypeName(typeNode.type)}!`;
  }
}

export function getTargetNodeName(typeNode: TypeNode): string {
  switch (typeNode.kind) {
    case Kind.NAMED_TYPE:
      return typeNode.name.value;
    case Kind.LIST_TYPE:
    case Kind.NON_NULL_TYPE:
      return getTargetNodeName(typeNode.type);
  }
}

export function createNodesEdge(
  field: FieldDefinitionNode,
  sourceNode: NameNode['value'],
  edges: Edge<EdgeData>[],
  markOutgoing: (
    sourceNode: NameNode['value'],
    field: NameNode['value'],
  ) => void,
) {
  const targetNode = getTargetNodeName(field.type);

  if (targetNode !== sourceNode) {
    pushUnique(
      edges,
      {
        id: createEdgeId(sourceNode, targetNode, 'field'),
        source: sourceNode,
        target: targetNode,
        animated: true,
        sourceHandle: `field-${field.name.value}`,
        data: {
          relation: 'field',
          field: field.name.value,
          type: getTypeName(field.type),
        },
      },
      (e) => e.id,
    );

    markOutgoing(sourceNode, field.name.value);
  }
}

export function createProbableEdges(
  objectNode:
    | ObjectTypeDefinitionNode
    | ObjectTypeExtensionNode
    | InterfaceTypeDefinitionNode,
  sourceNode: NameNode['value'],
  edges: Edge<EdgeData>[],
  markOutgoing: (
    sourceNode: NameNode['value'],
    field: NameNode['value'],
  ) => void,
) {
  if (objectNode.fields) {
    // Create edge even if the target node isn't present in this document;
    // maybe resolved across other graphql modules
    objectNode.fields.forEach((field) => {
      createNodesEdge(field, sourceNode, edges, markOutgoing);

      if (field.arguments) {
        field.arguments.forEach((argument) => {
          const targetNode = getTargetNodeName(argument.type);

          pushUnique(
            edges,
            {
              id: createEdgeId(
                sourceNode,
                targetNode,
                `argument-${field.name.value}-${argument.name.value}`,
              ),
              source: sourceNode,
              target: targetNode,
              animated: true,
              sourceHandle: `field-${field.name.value}`,
              data: {
                relation: 'argument',
                field: field.name.value,
                // type: getTypeName(argument.type),
                argument: argument.name.value,
              },
            },
            (e) => e.id,
          );

          markOutgoing(sourceNode, field.name.value);
        });
      }
    });
  }
}
