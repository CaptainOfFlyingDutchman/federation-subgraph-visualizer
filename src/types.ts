import type { Edge, Node } from '@xyflow/react';
import type { EdgeData, NodeData } from '@/parser/graphqlToReactFlow';

export type GraphQLModule = {
  name: string;
  sdl: string;
};

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
