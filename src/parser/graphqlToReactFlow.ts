import {
  type DocumentNode,
  type NameNode,
  parse,
  type TypeDefinitionNode,
  visit,
} from 'graphql';
import type { Edge, Node } from '@xyflow/react';

import type { GraphQLModule, XyFlowNodesAndEdges } from '@/types';
import {
  createEdgeId,
  createNode,
  createNodesEdge,
  createProbableEdges,
  getNodeKind,
  getTargetNodeName,
  getTypeName,
  pushUnique,
} from '@/parser/utils';

export type FieldArg = {
  name: NameNode['value'];
  type: string;
};

export type NodeField = {
  name: NameNode['value'];
  type?: string;
  args?: FieldArg[];
  hasOutgoing?: boolean;
};

export type NodeData = {
  label: string;
  kind: 'object' | 'interface' | 'union' | 'input' | 'enum' | 'scalar';
  fields?: NodeField[]; // for enum, fields can represent enum values as names
};

export type EdgeData = {
  relation?: 'field' | 'argument' | 'member' | 'inputField';
  field?: NameNode['value'];
  type?: string;
  argument?: NameNode['value'];
};

type BuildReactFlowFromDocumentReturn = XyFlowNodesAndEdges;

export function buildReactFlowFromDocument(
  documentNode: DocumentNode,
): BuildReactFlowFromDocumentReturn {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge<EdgeData>[] = [];

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  const markOutgoing = (
    sourceNode: NameNode['value'],
    field: NameNode['value'],
  ) => {
    const node = getNode(sourceNode);
    if (node?.data.fields) {
      node.data.fields.forEach((f) => {
        if (f.name === field) {
          f.hasOutgoing = true;
        }
      });
    }
  };

  visit(documentNode, {
    enter(astNode) {
      const nodeKind = getNodeKind(astNode);

      if (!nodeKind) {
        return;
      }

      const nodeName = (astNode as TypeDefinitionNode).name.value;

      if (!nodeName) {
        return;
      }

      pushUnique(nodes, createNode(nodeName, nodeKind), (n) => n.id);
    },
  });

  visit(documentNode, {
    ObjectTypeDefinition(objectNode) {
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

      const node = getNode(sourceNode);
      if (node) {
        node.data.fields = nodeFields;
      }

      // TODO: Include interface impl code if required

      createProbableEdges(objectNode, sourceNode, edges, markOutgoing);
    },

    // Handle extensions to merge additional fields and edges (e.g., extend type Query)
    ObjectTypeExtension(objectNode) {
      const sourceNode = objectNode.name.value;

      // Ensure Query node exists
      let queryNode = getNode(sourceNode);
      if (!queryNode) {
        queryNode = createNode(sourceNode, 'object');
        pushUnique(nodes, queryNode, (n) => n.id);
      }

      const existingFields = queryNode.data.fields || [];
      const newFields = (objectNode.fields || []).map<NodeField>((field) => ({
        name: field.name.value,
        type: getTypeName(field.type),
        args: (field.arguments || []).map((argument) => ({
          name: argument.name.value,
          type: getTypeName(argument.type),
        })),
        hasOutgoing: false,
      }));

      queryNode.data.fields = [...existingFields, ...newFields];

      // TODO: Include interface impl code if required

      createProbableEdges(objectNode, sourceNode, edges, markOutgoing);
    },

    InterfaceTypeDefinition(interfaceNode) {
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

      const existingInterfaceNode = getNode(sourceNode);
      if (existingInterfaceNode) {
        existingInterfaceNode.data.fields = interfaceFields;
      }

      if (interfaceNode.fields) {
        interfaceNode.fields.forEach((field) => {
          createNodesEdge(field, sourceNode, edges, markOutgoing);
        });
      }
    },

    UnionTypeDefinition(unionNode) {
      const sourceNode = unionNode.name.value;

      if (unionNode.types) {
        unionNode.types.forEach((member) => {
          const targetNode = member.name.value;

          pushUnique(
            edges,
            {
              id: createEdgeId(sourceNode, targetNode, 'member'),
              source: sourceNode,
              target: targetNode,
              animated: true,
              data: { relation: 'member' },
            },
            (e) => e.id,
          );
        });
      }
    },

    InputObjectTypeDefinition(inputNode) {
      const sourceNode = inputNode.name.value;

      const inputFields = (inputNode.fields || []).map<NodeField>((field) => ({
        name: field.name.value,
        type: getTypeName(field.type),
        hasOutgoing: false,
      }));

      const existingInputNode = getNode(sourceNode);
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

          markOutgoing(sourceNode, field.name.value);
        });
      }
    },

    EnumTypeDefinition(enumNode) {
      const sourceNode = enumNode.name.value;

      const enumValues = (enumNode.values || []).map<NodeField>((value) => ({
        name: value.name.value,
      }));

      const existingEnumNode = getNode(sourceNode);
      if (existingEnumNode) {
        existingEnumNode.data = {
          ...existingEnumNode.data,
          fields: enumValues,
        };
      }
    },
  });

  return {
    nodes,
    edges,
  };
}

export function buildReactFlowFromGraphQLModules(graphqlSDLs: GraphQLModule[]) {
  return graphqlSDLs.map((sdl) => {
    const documentNode = parse(sdl.sdl);
    const { nodes, edges } = buildReactFlowFromDocument(documentNode);

    return { nodes, edges };
  });
}
