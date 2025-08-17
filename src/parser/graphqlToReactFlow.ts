import {
  type DocumentNode,
  parse,
  type TypeDefinitionNode,
  visit,
} from 'graphql';

import type {
  BuildReactFlowFromDocumentFnReturn,
  FieldSnippets,
  GraphQLModule,
  TransformedGraphQLModules,
  TypeSnippets,
  XyFlowEdge,
  XyFlowGroupNode,
  XyFlowNode,
} from '@/types';
import {
  applyOutgoingFlagsToNodes,
  attachSnippetsToMergedNodes,
  buildGroupsForModules,
  computeFieldOutgoingFlags,
  computeGroupEdges,
  createNode,
  getNodeKind,
  getUniqueTypesFromEachModule,
  layoutModuleGroups,
  mergeNodesAcrossModules,
  pushUnique,
  remapEdgesToNamespaceIds,
} from '@/parser/utils';
import { DagreLayoutOptions } from '@/parser/dagre';
import { getObjectTypeDefinition } from '@/parser/visitors/objectTypeDefinition';
import { getObjectTypeExtension } from '@/parser/visitors/objectTypeExtension';
import { getInterfaceTypeDefinition } from '@/parser/visitors/interfaceTypeDefinition';
import { getUnionTypeDefinition } from '@/parser/visitors/unionTypeDefinition';
import { getInputObjectTypeDefinition } from '@/parser/visitors/inputObjectTypeDefinition';
import { getEnumTypeDefinition } from '@/parser/visitors/enumTypeDefinition';
import { getScalarTypeDefinition } from '@/parser/visitors/scalarTypeDefinition';

export function buildReactFlowFromDocument(
  documentNode: DocumentNode,
): BuildReactFlowFromDocumentFnReturn {
  const nodes: XyFlowNode[] = [];
  const edges: XyFlowEdge[] = [];

  const typeSnippets: TypeSnippets = new Map();
  const fieldSnippets: FieldSnippets = new Map();

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
    ObjectTypeDefinition: getObjectTypeDefinition({
      nodes,
      edges,
      typeSnippets,
      fieldSnippets,
    }),

    // Handle extensions to merge additional fields and edges (e.g., extend type Query)
    ObjectTypeExtension: getObjectTypeExtension({
      nodes,
      edges,
      typeSnippets,
      fieldSnippets,
    }),

    InterfaceTypeDefinition: getInterfaceTypeDefinition({
      nodes,
      edges,
      typeSnippets,
      fieldSnippets,
    }),

    UnionTypeDefinition: getUnionTypeDefinition({ edges }),

    InputObjectTypeDefinition: getInputObjectTypeDefinition({
      nodes,
      edges,
      typeSnippets,
      fieldSnippets,
    }),

    EnumTypeDefinition: getEnumTypeDefinition({
      nodes,
      typeSnippets,
      fieldSnippets,
    }),

    ScalarTypeDefinition: getScalarTypeDefinition({ typeSnippets }),
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

  const { uniqueTypesFromEachModule } =
    getUniqueTypesFromEachModule(transformedModules);

  const allNodes: (XyFlowNode | XyFlowGroupNode)[] = [];
  const allEdges: XyFlowEdge[] = [];

  const dagreLayoutOptions: Required<DagreLayoutOptions> = {
    nodeWidth: 220,
    nodeHeight: 300,
    rankDir: 'LR',
    rankSep: 80,
    nodeSep: 40,
    edgeSep: 10,
  };

  const { mergedNodesAcrossModules } =
    mergeNodesAcrossModules(transformedModules);

  attachSnippetsToMergedNodes({
    mergedNodesAcrossModules,
    mergedTypeSnippets,
    mergedFieldSnippets,
  });

  const graphqlModulesGroups = graphqlModules.map((graphModule) =>
    buildGroupsForModules({
      graphModule,
      transformedModules,
      uniqueTypesFromEachModule,
      mergedNodesAcrossModules,
      dagreLayoutOptions,
    }),
  );

  const { groupEdges } = computeGroupEdges({
    transformedModules,
    uniqueTypesFromEachModule,
  });

  const groupNodes = graphqlModulesGroups.map((n) => n.groupNode);
  const { groupNodePositions } = layoutModuleGroups({
    groupNodes,
    groupEdges,
    dagreLayoutOptions,
  });

  graphqlModulesGroups.forEach((group) => {
    group.groupNode.position = groupNodePositions.get(group.groupId) || {
      x: 0,
      y: 0,
    };
    allNodes.push(group.groupNode, ...group.childNodes);
  });

  const { remappedEdges } = remapEdgesToNamespaceIds({
    transformedModules,
    uniqueTypesFromEachModule,
  });

  allEdges.push(...remappedEdges);

  const { outgoingNodesNames } = computeFieldOutgoingFlags(allEdges);

  applyOutgoingFlagsToNodes(allNodes, outgoingNodesNames);

  return {
    nodes: allNodes,
    edges: allEdges,
    typeSnippets: mergedTypeSnippets,
    fieldSnippets: mergedFieldSnippets,
  };
}
