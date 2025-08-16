import {
  type DocumentNode,
  type NameNode,
  parse,
  Source,
  Location,
  type TypeDefinitionNode,
  visit,
} from 'graphql';
import type { Edge, Node } from '@xyflow/react';

import type { GraphQLModule, XyFlowNodesAndEdges } from '@/types';
import {
  collectSourceSnippetForDefinition,
  createEdgeId,
  createNode,
  createNodesEdge,
  createProbableEdges,
  getLineNumberAtOffset,
  getNodeKind,
  getTargetNodeName,
  getTypeName,
  pushUnique,
} from '@/parser/utils';

export type SourceSnippet = {
  moduleName: GraphQLModule['name'];
  startLine: Location['start'];
  endLine: Location['end'];
  code: Source['body'];
  title?: NameNode['value'];
};

export type FieldMap = Map<string, SourceSnippet[]>; // fieldName -> snippets
export type TypeSnippets = Map<string, SourceSnippet[]>; // typeName -> snippets
export type FieldSnippets = Map<string, FieldMap>; // typeName -> (field -> snippets)

export type FieldArg = {
  name: NameNode['value'];
  type: string;
};

export type NodeField = {
  name: NameNode['value'];
  type?: string;
  args?: FieldArg[];
  hasOutgoing?: boolean;
  sourceSnippets?: SourceSnippet[];
};

export type NodeData = {
  label: string;
  kind: 'object' | 'interface' | 'union' | 'input' | 'enum' | 'scalar';
  fields?: NodeField[]; // for enum, fields can represent enum values as names
  sourceSnippets?: SourceSnippet[]; // where the type itself is defined
};

export type EdgeData = {
  relation?: 'field' | 'argument' | 'member' | 'inputField';
  field?: NameNode['value'];
  type?: string;
  argument?: NameNode['value'];
};

type BuildReactFlowFromDocumentReturn = XyFlowNodesAndEdges & {
  typeSnippets: TypeSnippets;
  fieldSnippets: FieldSnippets;
};

export function buildReactFlowFromDocument(
  documentNode: DocumentNode,
): BuildReactFlowFromDocumentReturn {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge<EdgeData>[] = [];

  const typeSnippets: TypeSnippets = new Map();
  const fieldSnippets: FieldSnippets = new Map();

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
    // TODO: Move each visitor to a separate file
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
    },

    // Handle extensions to merge additional fields and edges (e.g., extend type Query)
    ObjectTypeExtension(objectExtensionNode) {
      const sourceNode = objectExtensionNode.name.value;

      // Ensure Query node exists
      let queryNode = getNode(sourceNode);
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

      createProbableEdges(objectExtensionNode, sourceNode, edges, markOutgoing);

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
    },

    ScalarTypeDefinition(scalarNode) {
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
    },
  });

  nodes.forEach((node) => {
    const sourceSnippets = typeSnippets.get(node.id);
    if (sourceSnippets) {
      node.data.sourceSnippets = sourceSnippets;
    }

    const fieldSnippetsMap = fieldSnippets.get(node.id);
    if (fieldSnippetsMap) {
      const originalNodeFields = node.data.fields;

      node.data.fields = originalNodeFields?.map((field) => ({
        ...field,
        sourceSnippets: fieldSnippetsMap.get(field.name) || [],
      }));
    }
  });

  return {
    nodes,
    edges,
    typeSnippets,
    fieldSnippets,
  };
}

export type TransformedGraphQLModules = GraphQLModule &
  BuildReactFlowFromDocumentReturn;

export function buildReactFlowFromGraphQLModules(
  graphqlModules: GraphQLModule[],
) {
  const transformedModules = graphqlModules.map<TransformedGraphQLModules>(
    (module) => {
      const documentNode = parse(module.sdl);

      return {
        ...buildReactFlowFromDocument(documentNode),
        ...module,
      };
    },
  );

  const mergedTypeSnippets: TypeSnippets = new Map();
  const mergedFieldSnippets: FieldSnippets = new Map();

  transformedModules.forEach((module) => {
    for (const [typeName, snippets] of module.typeSnippets.entries()) {
      if (!mergedTypeSnippets.has(typeName)) {
        mergedTypeSnippets.set(typeName, []);
      }

      mergedTypeSnippets.get(typeName)?.push(...snippets);
    }

    for (const [typeName, fieldSnippetsMap] of module.fieldSnippets.entries()) {
      if (!mergedFieldSnippets.has(typeName)) {
        mergedFieldSnippets.set(typeName, new Map());
      }

      const fieldSnippetsAccumulator = mergedFieldSnippets.get(typeName);

      if (fieldSnippetsAccumulator) {
        for (const [fieldName, snippets] of fieldSnippetsMap.entries()) {
          if (!fieldSnippetsAccumulator.has(fieldName)) {
            fieldSnippetsAccumulator.set(fieldName, []);
          }

          fieldSnippetsAccumulator.get(fieldName)?.push(...snippets);
        }
      }
    }
  });

  return [
    {
      nodes: transformedModules[0].nodes,
      edges: transformedModules[0].edges,
      typeSnippets: mergedTypeSnippets,
      fieldSnippets: mergedFieldSnippets,
    },
  ];
}
