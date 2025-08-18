import { type NodeProps, NodeResizer, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

import type { XyFlowGroupNode } from '@/types';

export type GraphQLGroupNodeProps = NodeProps<XyFlowGroupNode>;

export function GraphQLGroupNode({
  id,
  data,
  selected,
}: GraphQLGroupNodeProps) {
  const { setNodes } = useReactFlow();

  const isCollapsed = !!data.collapsed;

  const toggle = useCallback(() => {
    setNodes((nodes) => {
      const parent = nodes.find((n) => n.id === id);

      if (!parent) {
        return nodes;
      }

      const nextCollapsed = !parent.data?.collapsed;
      const COLLAPSED_HEADER_HEIGHT = 60;

      // Prefer the numeric node.height if present; it's what NodeResizer sets.
      const currentHeight = parent.height ?? parent.style?.height;

      return nodes.map((n) => {
        if (n.id !== id) {
          // hide/show children when collapsed
          if (n.parentId === id) {
            return { ...n, hidden: nextCollapsed };
          }

          return n;
        }

        const expandedHeight =
          (n.data._expandedHeight as number) ?? currentHeight;

        if (nextCollapsed) {
          // remember current expanded height, collapse to header height
          return {
            ...n,
            data: {
              ...n.data,
              collapsed: true,
              _expandedHeight: expandedHeight,
            },
            height: COLLAPSED_HEADER_HEIGHT,
            // ensure style.height doesn't fight with the controlled height
            style: { ...n.style, height: undefined },
          };
        }

        // expand back to the remembered height
        return {
          ...n,
          data: { ...n.data, collapsed: false },
          height: expandedHeight,
          style: { ...n.style, height: undefined },
        };
      });
    });
  }, [id, setNodes]);

  return (
    <div className="relative w-full h-full rounded-md border border-gray-300 bg-slate-50/80">
      <NodeResizer
        isVisible={selected && !isCollapsed}
        minWidth={220}
        minHeight={120}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        lineStyle={{ borderColor: 'border-gray-300' }}
      />
      <div className="sticky top-0 z-10 px-3 py-1.5 text-sm font-semibold text-slate-800 bg-slate-200/80 rounded-t-md border-b border-slate-300 flex items-center justify-between">
        <span>{data.label}</span>
        <button
          type="button"
          onClick={toggle}
          className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50"
          aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
        >
          <span className="text-slate-600" aria-hidden>
            {isCollapsed ? '▶' : '▼'}
          </span>
          <span className="text-slate-700">
            {isCollapsed ? 'Expand' : 'Collapse'}
          </span>
        </button>
      </div>
    </div>
  );
}
