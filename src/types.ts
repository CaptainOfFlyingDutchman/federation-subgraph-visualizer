import type { Edge, Node } from '@xyflow/react';
import type {
  EdgeData,
  FieldSnippets,
  NodeData,
  TypeSnippets,
} from '@/parser/graphqlToReactFlow';
import { customGroupNodeType } from '@/parser/utils';

export type GraphQLModule = {
  name: string;
  sdl: string;
};

export function isXyFlowGroupNode(
  node: XyFlowNode | XyFlowGroupNode,
): node is XyFlowGroupNode {
  return node.type === customGroupNodeType;
}

export type XyFlowGroupNode = Node<Pick<NodeData, 'label'>>;
export type XyFlowNode = Node<NodeData>;
export type XyFlowEdge = Edge<EdgeData>;

export type XyFlowNodesAndEdges = {
  nodes: XyFlowNode[];
  edges: XyFlowEdge[];
};

export type TitleBackgroundColor =
  | 'bg-blue-600'
  | 'bg-gray-500'
  | 'bg-green-600'
  | 'bg-orange-500'
  | 'bg-orange-700'
  | 'bg-purple-600'
  | 'bg-slate-700';

export type BuildReactFlowFromDocumentFnReturn = XyFlowNodesAndEdges & {
  typeSnippets: TypeSnippets;
  fieldSnippets: FieldSnippets;
};

export type TransformedGraphQLModules = GraphQLModule &
  BuildReactFlowFromDocumentFnReturn;
