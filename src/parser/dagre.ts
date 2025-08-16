import type { XyFlowEdge, XyFlowNode } from '@/types';
import dagre from 'dagre';

export type DagreLayoutOptions = {
  nodeWidth?: number;
  nodeHeight?: number;
  rankDir?: 'LR' | 'TB';
  rankSep?: number;
  nodeSep?: number;
  edgeSep?: number;
};

const defaultDagreLayoutOptions: DagreLayoutOptions = {
  nodeWidth: 200,
  nodeHeight: 60,
  rankDir: 'LR',
  rankSep: 80,
  nodeSep: 50,
  edgeSep: 10,
};

export type GetLayoutedElementsFnArgs = {
  nodes: XyFlowNode[];
  edges: XyFlowEdge[];
  options?: DagreLayoutOptions;
};

export function getLayoutedElements({
  nodes,
  edges,
  options = {},
}: GetLayoutedElementsFnArgs) {
  const dagreLayoutOptions: DagreLayoutOptions = {
    ...defaultDagreLayoutOptions,
    ...options,
  };

  const g = new dagre.graphlib.Graph({ multigraph: true, compound: false });
  g.setGraph({
    rankdir: dagreLayoutOptions.rankDir,
    ranksep: dagreLayoutOptions.rankSep,
    nodesep: dagreLayoutOptions.nodeSep,
    edgesep: dagreLayoutOptions.edgeSep,
  } satisfies dagre.GraphLabel);
  g.setDefaultEdgeLabel(() => ({}));

  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      g.setEdge(edge.source, edge.target);
    }
  });

  nodes.forEach((node) => {
    const { width, height } = node.measured ?? {
      width: dagreLayoutOptions.nodeWidth,
      height: dagreLayoutOptions.nodeHeight,
    };

    g.setNode(node.id, {
      width,
      height,
    });
  });

  dagre.layout(g);

  nodes.map((node) => {
    const dagreNode = g.node(node.id) as dagre.Node;

    const { width, height } = node.measured ?? {
      width: dagreLayoutOptions.nodeWidth,
      height: dagreLayoutOptions.nodeHeight,
    };

    const x = dagreNode.x - width! / 2;
    const y = dagreNode.y - height! / 2;

    return {
      ...node,
      position: { x, y },
    };
  });
}
