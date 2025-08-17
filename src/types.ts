import type { Edge, Node } from '@xyflow/react';
import { Location, type NameNode, Source } from 'graphql/index';

export type GraphQLModule = {
  name: string;
  sdl: string;
};

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

export type GroupEdge = {
  id: string;
  source: string;
  target: string;
};
