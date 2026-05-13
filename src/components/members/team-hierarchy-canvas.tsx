import dagre from "@dagrejs/dagre";
import { IconUser } from "@tabler/icons-react";
import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import type { MemberItem } from "@/components/members/members-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_DISPLAY_NAMES } from "@/lib/constants";

type MemberNodeData = {
  email: string;
  id: string;
  image: string | null;
  name: string;
  role: string | null;
};

type MemberNodeProps = {
  data: MemberNodeData;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function MemberNode({ data }: MemberNodeProps) {
  const navigate = useNavigate();

  return (
    <button
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-md"
      onClick={() =>
        navigate({
          params: { memberId: data.id },
          to: "/settings/members/$memberId",
        })
      }
      type="button"
    >
      <Avatar className="h-8 w-8 shrink-0">
        {data.image && <AvatarImage alt={data.name} src={data.image} />}
        <AvatarFallback className="text-xs">
          {getInitials(data.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 text-left">
        <div className="truncate font-medium text-sm leading-tight">
          {data.name}
        </div>
        <div className="truncate text-muted-foreground text-xs leading-tight">
          {data.email}
        </div>
        <Badge className="mt-1" variant="outline">
          {ROLE_DISPLAY_NAMES[data.role as keyof typeof ROLE_DISPLAY_NAMES] ??
            data.role ??
            "—"}
        </Badge>
      </div>
    </button>
  );
}

const nodeTypes = { member: MemberNode };

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

function buildTree(members: MemberItem[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ nodesep: 50, rankdir: "TB", ranksep: 70 });

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const nodes: Node<MemberNodeData>[] = [];
  const edges: Edge[] = [];

  for (const m of members) {
    g.setNode(m.id, { height: NODE_HEIGHT, width: NODE_WIDTH });
    nodes.push({
      data: {
        email: m.email,
        id: m.id,
        image: m.image,
        name: m.name,
        role: m.role,
      },
      id: m.id,
      position: { x: 0, y: 0 },
      type: "member",
    });
  }

  for (const m of members) {
    if (m.supervisorId && memberMap.has(m.supervisorId)) {
      g.setEdge(m.supervisorId, m.id);
      edges.push({
        id: `${m.supervisorId}-${m.id}`,
        source: m.supervisorId,
        style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.5 },
        target: m.id,
        type: "smoothstep",
      });
    }
  }

  dagre.layout(g);

  for (const node of nodes) {
    const pos = g.node(node.id);
    node.position = {
      x: pos.x - NODE_WIDTH / 2,
      y: pos.y - NODE_HEIGHT / 2,
    };
  }

  return { edges, nodes };
}

type TeamHierarchyCanvasProps = {
  members: MemberItem[];
};

export function TeamHierarchyCanvas({ members }: TeamHierarchyCanvasProps) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildTree(members),
    [members],
  );

  const [nodes] = useNodesState(layoutNodes);
  const [edges] = useEdgesState(layoutEdges);

  if (members.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border bg-card text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <IconUser className="h-10 w-10" />
          <p>No team members to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] overflow-hidden rounded-lg border bg-card">
      <ReactFlow
        edges={edges}
        fitView
        minZoom={0.1}
        nodes={nodes}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground) / 0.15)" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          maskColor="rgb(0 0 0 / 0.6)"
          nodeColor="hsl(var(--muted-foreground))"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
