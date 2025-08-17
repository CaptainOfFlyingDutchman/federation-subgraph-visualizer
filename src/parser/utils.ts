import {
  type ASTNode,
  type FieldDefinitionNode,
  type InputObjectTypeDefinitionNode,
  type InterfaceTypeDefinitionNode,
  Kind,
  type NameNode,
  type ObjectTypeDefinitionNode,
  type ObjectTypeExtensionNode,
  type TypeNode,
} from 'graphql';
import type {
  FieldSnippets,
  GraphQLModule,
  GroupEdge,
  NodeData,
  NodeField,
  SourceSnippet,
  TransformedGraphQLModules,
  TypeSnippets,
  XyFlowEdge,
  XyFlowGroupNode,
  XyFlowNode,
} from '@/types';
import { type DagreLayoutOptions, getLayoutedElements } from '@/parser/dagre';

export const customNodeType = 'typeNode';
export const customGroupNodeType = 'groupNode';

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
): XyFlowNode {
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
  return label ? `${source}->${target}#${label}` : `${source}->${target}`;
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
  nodes: XyFlowNode[],
  edges: XyFlowEdge[],
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

    markOutgoing(nodes, sourceNode, field.name.value);
  }
}

export function createProbableEdges(
  objectNode:
    | ObjectTypeDefinitionNode
    | ObjectTypeExtensionNode
    | InterfaceTypeDefinitionNode,
  sourceNode: NameNode['value'],
  nodes: XyFlowNode[],
  edges: XyFlowEdge[],
) {
  if (objectNode.fields) {
    // Create edge even if the target node isn't present in this document;
    // maybe resolved across other graphql modules
    objectNode.fields.forEach((field) => {
      createNodesEdge(field, sourceNode, nodes, edges);

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

          markOutgoing(nodes, sourceNode, field.name.value);
        });
      }
    });
  }
}

export function getLineNumberAtOffset(moduleSource: string, offset: number) {
  if (offset <= 0) {
    return 1;
  }

  let count = 1;
  const textLength = Math.min(offset, moduleSource.length);

  for (let i = 0; i < textLength; i++) {
    if (moduleSource.charCodeAt(i) === 10) {
      count += 1;
    }
  }

  return count;
}

export function getNode(
  nodes: XyFlowNode[],
  id: string,
): XyFlowNode | undefined {
  return nodes.find((n) => n.id === id);
}

export function markOutgoing(
  nodes: XyFlowNode[],
  sourceNode: NameNode['value'],
  field: NameNode['value'],
): void {
  const node = getNode(nodes, sourceNode);
  if (node?.data.fields) {
    node.data.fields.forEach((f) => {
      if (f.name === field) {
        f.hasOutgoing = true;
      }
    });
  }
}

export type CollectSourceSnippetForDefinitionFnArgs = {
  typeSnippets: TypeSnippets;
  fieldSnippets: FieldSnippets;
  moduleName: string;
  body: string;
  sourceNode: NameNode['value'];
  astNode:
    | ObjectTypeDefinitionNode
    | ObjectTypeExtensionNode
    | InterfaceTypeDefinitionNode
    | InputObjectTypeDefinitionNode;
  snippet: SourceSnippet;
};

export function collectSourceSnippetForDefinition({
  fieldSnippets,
  typeSnippets,
  moduleName,
  body,
  sourceNode,
  astNode,
  snippet,
}: CollectSourceSnippetForDefinitionFnArgs) {
  if (!typeSnippets.has(sourceNode)) {
    typeSnippets.set(sourceNode, []);
  }

  // Add type snippets
  typeSnippets.get(sourceNode)?.push(snippet);

  // Add field snippets
  (astNode.fields || []).forEach((field) => {
    if (!field.loc) {
      return;
    }

    const fieldLoc = field.loc;
    const fieldCode = body.substring(fieldLoc.start, fieldLoc.end);
    const fieldSnippet: SourceSnippet = {
      moduleName,
      code: fieldCode,
      title: `field ${sourceNode}.${field.name.value}`,
      startLine: getLineNumberAtOffset(body, fieldLoc.start),
      endLine: getLineNumberAtOffset(body, fieldLoc.end),
    };

    if (!fieldSnippets.has(sourceNode)) {
      fieldSnippets.set(sourceNode, new Map());
    }

    const fieldSnippetMap = fieldSnippets.get(sourceNode);

    if (!fieldSnippetMap?.has(field.name.value)) {
      fieldSnippetMap?.set(field.name.value, []);
    }

    fieldSnippetMap?.get(field.name.value)?.push(fieldSnippet);
  });
}

export type GetUniqueTypesFromEachModuleFnReturn = {
  uniqueTypesFromEachModule: Map<
    XyFlowNode['id'],
    TransformedGraphQLModules['name']
  >;
};

export function getUniqueTypesFromEachModule(
  transformedModules: TransformedGraphQLModules[],
): GetUniqueTypesFromEachModuleFnReturn {
  const firstAppearedTypes: GetUniqueTypesFromEachModuleFnReturn['uniqueTypesFromEachModule'] =
    new Map();

  transformedModules.forEach((module) => {
    module.nodes.forEach((node) => {
      if (!firstAppearedTypes.has(node.id)) {
        firstAppearedTypes.set(node.id, module.name);
      }
    });
  });

  return {
    uniqueTypesFromEachModule: firstAppearedTypes,
  };
}

export type MergeNodesAcrossModulesFnReturn = {
  mergedNodesAcrossModules: Map<XyFlowNode['id'], XyFlowNode>;
};

export function mergeNodesAcrossModules(
  transformedModules: TransformedGraphQLModules[],
): MergeNodesAcrossModulesFnReturn {
  const merged: MergeNodesAcrossModulesFnReturn['mergedNodesAcrossModules'] =
    new Map();

  transformedModules.forEach((module) => {
    module.nodes.forEach((node) => {
      const existingNode = merged.get(node.id);

      if (existingNode) {
        const existingFields = existingNode.data.fields || [];
        const newFields = node.data.fields || [];
        existingNode.data.fields = [...existingFields, ...newFields];
      } else {
        merged.set(node.id, node);
      }
    });
  });

  return {
    mergedNodesAcrossModules: merged,
  };
}

export type AttachSnippetsToMergedNodesFnArgs = {
  mergedNodesAcrossModules: MergeNodesAcrossModulesFnReturn['mergedNodesAcrossModules'];
  mergedTypeSnippets: TypeSnippets;
  mergedFieldSnippets: FieldSnippets;
};

export function attachSnippetsToMergedNodes({
  mergedNodesAcrossModules,
  mergedTypeSnippets,
  mergedFieldSnippets,
}: AttachSnippetsToMergedNodesFnArgs) {
  mergedNodesAcrossModules.forEach((node, typeName) => {
    node.data.sourceSnippets = mergedTypeSnippets.get(typeName) || [];

    const fieldSnippetMap = mergedFieldSnippets.get(typeName);
    if (fieldSnippetMap) {
      const originalFields = node.data.fields || [];

      node.data.fields = originalFields.map<NodeField>((field) => ({
        ...field,
        sourceSnippets: fieldSnippetMap.get(field.name) || [],
      }));
    }
  });
}

export type BuildGroupsForModulesFnArgs = {
  graphModule: GraphQLModule;
  transformedModules: TransformedGraphQLModules[];
  uniqueTypesFromEachModule: GetUniqueTypesFromEachModuleFnReturn['uniqueTypesFromEachModule'];
  mergedNodesAcrossModules: MergeNodesAcrossModulesFnReturn['mergedNodesAcrossModules'];
  dagreLayoutOptions: Required<DagreLayoutOptions>;
};

export type BuildGroupsForModulesFnReturn = {
  graphModuleName: GraphQLModule['name'];
  groupId: string;
  groupNode: XyFlowGroupNode;
  childNodes: XyFlowNode[];
};

export function isXyFlowGroupNode(
  node: XyFlowNode | XyFlowGroupNode,
): node is XyFlowGroupNode {
  return node.type === customGroupNodeType;
}

export function buildGroupsForModules({
  graphModule,
  transformedModules,
  uniqueTypesFromEachModule,
  mergedNodesAcrossModules,
  dagreLayoutOptions,
}: BuildGroupsForModulesFnArgs): BuildGroupsForModulesFnReturn {
  const padding = 16;

  const groupId = `group-${graphModule.name}`;

  const namespace = (typeName: string) => `${graphModule.name}.${typeName}`;

  const ownedTypes = Array.from(uniqueTypesFromEachModule.entries())
    .filter(([_, moduleName]) => moduleName === graphModule.name)
    .map(([type]) => type);

  console.log(ownedTypes);

  const baseChildNodesWithModuleMappedIds = ownedTypes.map((typeName) => {
    const mergedNode = mergedNodesAcrossModules.get(typeName)!;

    return { ...mergedNode, id: namespace(typeName) };
  });

  const internalEdgesWithModuleMappedIds = transformedModules
    .find((tm) => tm.name === graphModule.name)!
    .edges.filter(
      (e) => ownedTypes.includes(e.source) && ownedTypes.includes(e.target),
    )
    .map((e) => ({
      ...e,
      source: namespace(e.source),
      target: namespace(e.target),
    }));

  const { laidoutNodes } = getLayoutedElements({
    nodes: baseChildNodesWithModuleMappedIds,
    edges: internalEdgesWithModuleMappedIds,
  });

  const xs = laidoutNodes.map((n) => n.position.x);
  const ys = laidoutNodes.map((n) => n.position.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs.map((x) => x + dagreLayoutOptions.nodeWidth));
  const maxY = Math.max(...ys.map((y) => y + dagreLayoutOptions.nodeHeight));

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  const childNodes = laidoutNodes
    .filter((n): n is XyFlowNode => !isXyFlowGroupNode(n))
    .map<XyFlowNode>((n) => ({
      ...n,
      position: {
        x: n.position.x - minX + padding,
        y: n.position.y - minY + padding,
      },
      parentId: groupId,
      extent: 'parent',
    }));

  const minGroupWidth = 260;
  const minGroupHeight = 100;
  const groupNode: XyFlowGroupNode = {
    id: groupId,
    type: customGroupNodeType,
    position: { x: 0, y: 0 },
    style: {
      width: Math.max(contentWidth + padding * 2, minGroupWidth),
      height: Math.max(contentHeight + padding * 2, minGroupHeight),
    },
    data: {
      label: graphModule.name,
    },
  };

  return {
    graphModuleName: graphModule.name,
    groupId,
    groupNode,
    childNodes,
  };
}

export type ComputeGroupEdgesFnArgs = {
  transformedModules: TransformedGraphQLModules[];
  uniqueTypesFromEachModule: GetUniqueTypesFromEachModuleFnReturn['uniqueTypesFromEachModule'];
};

export type ComputeGroupEdgesFnReturn = {
  groupEdges: GroupEdge[];
};

export function computeGroupEdges({
  transformedModules,
  uniqueTypesFromEachModule,
}: ComputeGroupEdgesFnArgs): ComputeGroupEdgesFnReturn {
  const uniqueEdges = new Set<string>();

  transformedModules.forEach((transformedModule) => {
    transformedModule.edges.forEach((edge) => {
      const edgeSource = uniqueTypesFromEachModule.get(edge.source);
      const edgeTarget = uniqueTypesFromEachModule.get(edge.target);

      if (edgeSource && edgeTarget) {
        uniqueEdges.add(`group-${edgeSource}->$group-{edgeTarget}`);
      }
    });
  });

  const groupEdges = Array.from(uniqueEdges).map((edgeId) => {
    const [source, target] = edgeId.split('->');

    return {
      id: edgeId,
      source,
      target,
    };
  });

  return {
    groupEdges,
  };
}

export type LayoutModuleGroupsFnArgs = {
  groupNodes: XyFlowGroupNode[];
  groupEdges: ComputeGroupEdgesFnReturn['groupEdges'];
  dagreLayoutOptions: Required<DagreLayoutOptions>;
};

export type LayoutModuleGroupsFnReturn = {
  groupNodePositions: Map<XyFlowGroupNode['id'], XyFlowGroupNode['position']>;
};

export function layoutModuleGroups({
  groupNodes,
  groupEdges,
  dagreLayoutOptions,
}: LayoutModuleGroupsFnArgs): LayoutModuleGroupsFnReturn {
  const { laidoutNodes } = getLayoutedElements({
    nodes: groupNodes,
    edges: groupEdges,
    options: { ...dagreLayoutOptions, nodeSep: 120, rankSep: 160 },
  });

  const groupNodePositions: LayoutModuleGroupsFnReturn['groupNodePositions'] =
    new Map();

  laidoutNodes.forEach((groupNode) => {
    groupNodePositions.set(groupNode.id, {
      x: groupNode.position.x,
      y: groupNode.position.y,
    });
  });

  return {
    groupNodePositions,
  };
}

export type RemapEdgesToNamespaceIdsFnArgs = {
  transformedModules: TransformedGraphQLModules[];
  uniqueTypesFromEachModule: GetUniqueTypesFromEachModuleFnReturn['uniqueTypesFromEachModule'];
};

export type RemapEdgesToNamespaceIdsFnReturn = {
  remappedEdges: XyFlowEdge[];
};

export function remapEdgesToNamespaceIds({
  transformedModules,
  uniqueTypesFromEachModule,
}: RemapEdgesToNamespaceIdsFnArgs): RemapEdgesToNamespaceIdsFnReturn {
  const remappedEdges: XyFlowEdge[] = [];

  transformedModules.forEach((tm) => {
    tm.edges.forEach((e) => {
      const sourceOwner = uniqueTypesFromEachModule.get(e.source);

      const edgeSource = `${sourceOwner}.${e.source}`;

      const ownerModule = uniqueTypesFromEachModule.get(e.target);

      if (ownerModule) {
        const edgeTarget = `${ownerModule}.${e.target}`;

        const hashIndex = e.id.indexOf('#');
        const labelPart = hashIndex >= 0 ? e.id.substring(hashIndex) : '';

        remappedEdges.push({
          ...e,
          id: `${edgeSource}->${edgeTarget}${labelPart}`,
          source: edgeSource,
          target: edgeTarget,
        });
      }
    });
  });

  return {
    remappedEdges,
  };
}

export type ComputeFieldOutgoingFlagsFnReturn = {
  outgoingNodesNames: Map<string, Set<string>>;
};

export function computeFieldOutgoingFlags(edges: XyFlowEdge[]) {
  const outgoingNodesNames: ComputeFieldOutgoingFlagsFnReturn['outgoingNodesNames'] =
    new Map();

  edges.forEach((edge) => {
    const sourceHandle = edge.sourceHandle;

    if (sourceHandle && sourceHandle.startsWith('field-')) {
      const fieldName = sourceHandle.substring('field-'.length);

      if (!outgoingNodesNames.has(edge.source)) {
        outgoingNodesNames.set(edge.source, new Set());
      }

      outgoingNodesNames.get(edge.source)?.add(fieldName);
    }
  });

  return {
    outgoingNodesNames,
  };
}

export function applyOutgoingFlagsToNodes(
  nodes: (XyFlowNode | XyFlowGroupNode)[],
  outgoingNodesNames: ComputeFieldOutgoingFlagsFnReturn['outgoingNodesNames'],
) {
  nodes.forEach((n) => {
    if (!isXyFlowGroupNode(n)) {
      const node = n as XyFlowNode;

      const nodeFields = node.data.fields;
      const nodeFlags = outgoingNodesNames.get(node.id);

      if (nodeFlags && nodeFields?.length) {
        node.data.fields = nodeFields.map((f) => ({
          ...f,
          hasOutgoing: nodeFlags.has(f.name),
        }));
      }
    }
  });
}
