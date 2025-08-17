'use client';

import type { XyFlowGroupNode, XyFlowNode, XyFlowNodesAndEdges } from '@/types';
import {
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { customGroupNodeType, customNodeType } from '@/parser/utils';
import { GraphQLNode } from '@/components/xyflow/GraphQLNode';
import { SourceDrawer } from '@/components/sourceViewer/SourceDrawer';
import { GraphQLGroupNode } from '@/components/xyflow/GraphQLGroupNode';

export type GraphQLVisualizerProps = {
  nodes: (XyFlowNode | XyFlowGroupNode)[];
  edges: XyFlowNodesAndEdges['edges'];
};

const nodeTypes: NodeTypes = {
  [customNodeType]: GraphQLNode,
  [customGroupNodeType]: GraphQLGroupNode,
};

export function GraphQLVisualizer({ nodes, edges }: GraphQLVisualizerProps) {
  const [graphNodes, setGraphNodes, onNodesChange] = useNodesState(nodes);
  const [graphEdges, setGraphEdges, onEdgesChange] = useEdgesState(edges);

  return (
    <div className="w-screen, h-screen flex flex-col">
      <div className="flex-1">
        <ReactFlow
          nodeTypes={nodeTypes}
          nodes={graphNodes}
          edges={graphEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>

      <SourceDrawer />
    </div>
  );
}
