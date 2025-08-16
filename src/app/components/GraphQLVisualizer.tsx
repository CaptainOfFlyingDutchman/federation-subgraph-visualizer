'use client';

import type { XyFlowNodesAndEdges } from '@/types';
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
import { customNodeType } from '@/parser/utils';
import { GraphQLNode } from '@/app/components/GraphQLNode';

export type GraphQLVisualizerProps = XyFlowNodesAndEdges;

const nodeTypes: NodeTypes = {
  [customNodeType]: GraphQLNode,
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
    </div>
  );
}
