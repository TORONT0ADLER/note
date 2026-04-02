<template>
  <div class="lg:min-w-0 lg:flex-1">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-highlighted">Граф заметок</p>
          <p class="text-xs text-muted">
            Узлы: {{ nodes.length }} · Связи: {{ edges.length }}
          </p>
        </div>
      </template>

      <div class="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div class="space-y-3 rounded-lg border border-default bg-muted/20 p-3">
          <USelect v-model="mode" :items="modeItems" size="sm" class="w-full" />

          <UInput
            v-model="searchQuery"
            size="sm"
            icon="i-lucide-search"
            placeholder="Поиск заметки"
          />

          <USelect
            v-model="labelsMode"
            :items="labelsModeItems"
            size="sm"
            class="w-full"
          />

          <div class="space-y-1">
            <p class="text-xs text-muted">
              Отталкивание: {{ repulsionStrength }}
            </p>
            <USlider
              v-model="repulsionStrength"
              :min="200"
              :max="3000"
              :step="50"
            />
          </div>

          <div class="space-y-1">
            <p class="text-xs text-muted">
              Притяжение: {{ linkStrength.toFixed(2) }}
            </p>
            <USlider
              v-model="linkStrength"
              :min="0.01"
              :max="0.25"
              :step="0.01"
            />
          </div>

          <div class="space-y-1">
            <p class="text-xs text-muted">
              Сила связей: {{ edgeRigidity.toFixed(2) }}
            </p>
            <USlider v-model="edgeRigidity" :min="0.2" :max="3" :step="0.05" />
          </div>

          <div class="space-y-1">
            <p class="text-xs text-muted">
              Размер узлов: {{ nodeSize.toFixed(1) }}
            </p>
            <USlider v-model="nodeSize" :min="3" :max="12" :step="0.5" />
          </div>

          <div class="space-y-1">
            <p class="text-xs text-muted">
              Размер шрифта: {{ labelFontSize.toFixed(0) }}
            </p>
            <USlider v-model="labelFontSize" :min="4" :max="20" :step="1" />
          </div>

          <USwitch
            v-model="showDirection"
            size="sm"
            label="Показывать направление связей"
          />
        </div>

        <div
          ref="viewportRef"
          class="relative overflow-hidden rounded-lg border border-default bg-muted/20"
          @pointerdown="onViewportPointerDown"
          @wheel.prevent="onWheel"
        >
          <svg
            class="h-[62vh] min-h-[340px] w-full select-none"
            role="img"
            aria-label="Граф связей заметок"
          >
            <defs>
              <marker
                id="graph-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L8,3 z" fill="context-stroke" />
              </marker>
            </defs>

            <g :transform="`translate(${panX} ${panY}) scale(${zoom})`">
              <line
                v-for="edge in positionedEdges"
                :key="edge.id"
                :x1="edge.x1"
                :y1="edge.y1"
                :x2="edge.x2"
                :y2="edge.y2"
                :class="edge.className"
                :marker-end="showDirection ? 'url(#graph-arrow)' : undefined"
                stroke-width="1"
              />

              <g
                v-for="node in positionedNodes"
                :key="node.id"
                :transform="`translate(${node.x} ${node.y})`"
              >
                <circle
                  :r="node.radius"
                  :class="node.className"
                  @pointerdown.stop="onNodePointerDown($event, node.id)"
                  @pointerenter="hoveredNodeId = node.id"
                  @pointerleave="hoveredNodeId = null"
                  @click.stop="onNodeClick(node.id)"
                />

                <text
                  v-if="node.showLabel"
                  x="0"
                  y="-12"
                  text-anchor="middle"
                  class="pointer-events-none select-none fill-current text-toned/95"
                  :style="{ fontSize: `${labelFontSize}px` }"
                >
                  {{ node.label }}
                </text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
type GraphNode = {
  id: string;
  label: string;
  folderId: string | null;
  isPlaceholder: boolean;
  incomingCount: number;
  outgoingCount: number;
};

type GraphEdge = {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  type: "internal_link";
};

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
};

const props = defineProps<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeNodeId: string | null;
  activeOutgoing: string[];
  activeIncoming: string[];
}>();

const emit = defineEmits<{
  (e: "node-click", id: string): void;
}>();

const mode = defineModel<"global" | "local">("mode", { default: "global" });
const searchQuery = defineModel<string>("searchQuery", { default: "" });
const labelsMode = defineModel<"all" | "active" | "hover">("labelsMode", {
  default: "active",
});
const repulsionStrength = defineModel<number>("repulsionStrength", {
  default: 1400,
});
const linkStrength = defineModel<number>("linkStrength", { default: 0.05 });
const edgeRigidity = defineModel<number>("edgeRigidity", { default: 1 });
const nodeSize = defineModel<number>("nodeSize", { default: 5 });
const labelFontSize = defineModel<number>("labelFontSize", { default: 10 });
const showDirection = defineModel<boolean>("showDirection", { default: false });

const modeItems = [
  { label: "Глобальный", value: "global" },
  { label: "Локальный", value: "local" },
];

const labelsModeItems = [
  { label: "Подписи: все", value: "all" },
  { label: "Подписи: активные", value: "active" },
  { label: "Подписи: hover", value: "hover" },
];

const viewportRef = ref<HTMLElement | null>(null);
const width = ref(960);
const height = ref(600);
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const hoveredNodeId = ref<string | null>(null);
const draggedNodeId = ref<string | null>(null);
const suppressedClickNodeId = ref<string | null>(null);
const suppressClickUntil = ref(0);
const tickKey = ref(0);
const physicsAlpha = ref(0);
const burstStrength = ref(0);

const panningState = ref<null | {
  startX: number;
  startY: number;
  x: number;
  y: number;
}>(null);
const points = shallowRef<Map<string, Point>>(new Map());
let physicsRaf: number | null = null;
let repulsionPhase = 0;

const hashToUnit = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
};

const getHomePosition = (id: string, index: number) => {
  const seedA = hashToUnit(`${id}:${index}`);
  const seedB = hashToUnit(`${index}:${id}`);
  return {
    x: width.value * (0.2 + seedA * 0.6),
    y: height.value * (0.2 + seedB * 0.6),
  };
};

const ensurePoint = (id: string, index: number): Point => {
  const existing = points.value.get(id);
  const home = getHomePosition(id, index);
  if (existing) {
    existing.homeX = home.x;
    existing.homeY = home.y;
    return existing;
  }

  const cx = width.value / 2;
  const cy = height.value / 2;
  const point: Point = {
    x: cx,
    y: cy,
    vx: (home.x - cx) * 0.08,
    vy: (home.y - cy) * 0.08,
    homeX: home.x,
    homeY: home.y,
  };
  points.value.set(id, point);
  return point;
};

const activeNeighbors = computed(
  () =>
    new Set([...(props.activeOutgoing || []), ...(props.activeIncoming || [])]),
);

const searchMatched = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return new Set<string>();
  return new Set(
    props.nodes
      .filter((node) => node.label.toLowerCase().includes(query))
      .map((node) => node.id),
  );
});

const linkedNeighborsMap = computed(() => {
  const map = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    if (!map.has(from)) map.set(from, new Set());
    map.get(from)!.add(to);
  };
  props.edges.forEach((edge) => {
    add(edge.sourceNoteId, edge.targetNoteId);
    add(edge.targetNoteId, edge.sourceNoteId);
  });
  return map;
});

const hoveredNeighbors = computed(() => {
  if (!hoveredNodeId.value) return new Set<string>();
  return new Set(linkedNeighborsMap.value.get(hoveredNodeId.value) || []);
});

const kickPhysics = (alpha = 1) => {
  physicsAlpha.value = Math.max(physicsAlpha.value, alpha);
  if (physicsRaf !== null) return;

  const step = () => {
    const alphaValue = physicsAlpha.value;
    if (alphaValue <= 0.02 && !draggedNodeId.value) {
      physicsRaf = null;
      return;
    }

    const nodeEntries = props.nodes
      .map((node) => ({ node, point: points.value.get(node.id) }))
      .filter(
        (entry): entry is { node: GraphNode; point: Point } => !!entry.point,
      );

    const count = nodeEntries.length;
    const sampleWindow = Math.min(24, Math.max(1, count - 1));
    const repulsionCompensation = Math.min(
      14,
      Math.max(1, (count - 1) / sampleWindow),
    );
    const minNodeDistance = Math.max(8, nodeSize.value * 2.4);

    for (let i = 0; i < count; i += 1) {
      const a = nodeEntries[i]!.point;
      for (let stepIndex = 1; stepIndex <= sampleWindow; stepIndex += 1) {
        const j = (i + repulsionPhase + stepIndex * 37) % count;
        if (j === i) continue;
        const b = nodeEntries[j]!.point;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSquared = Math.max(16, dx * dx + dy * dy);
        const distance = Math.sqrt(distanceSquared);
        const force =
          (repulsionStrength.value / distanceSquared) *
          0.03 *
          alphaValue *
          repulsionCompensation;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;

        if (distance < minNodeDistance) {
          const overlap = minNodeDistance - distance;
          const collisionPush = overlap * 0.045 * alphaValue;
          a.vx -= (dx / distance) * collisionPush;
          a.vy -= (dy / distance) * collisionPush;
          b.vx += (dx / distance) * collisionPush;
          b.vy += (dy / distance) * collisionPush;
        }
      }
    }

    repulsionPhase = (repulsionPhase + 11) % Math.max(1, count);

    for (const edge of props.edges) {
      const source = points.value.get(edge.sourceNoteId);
      const target = points.value.get(edge.targetNoteId);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const spring =
        linkStrength.value * edgeRigidity.value * 0.16 * alphaValue;
      source.vx += dx * spring;
      source.vy += dy * spring;
      target.vx -= dx * spring;
      target.vy -= dy * spring;
    }

    const cx = width.value / 2;
    const cy = height.value / 2;
    const burst = burstStrength.value;

    for (const [id, point] of points.value) {
      if (draggedNodeId.value === id) continue;
      if (burst > 0.001) {
        point.vx += (point.homeX - point.x) * 0.016 * burst;
        point.vy += (point.homeY - point.y) * 0.016 * burst;
      }
      point.vx += (cx - point.x) * 0.00022;
      point.vy += (cy - point.y) * 0.00022;
      point.vx *= 0.86;
      point.vy *= 0.86;
      point.x += point.vx;
      point.y += point.vy;
    }

    tickKey.value += 1;
    physicsAlpha.value *= 0.965;
    if (burstStrength.value > 0.001) burstStrength.value *= 0.94;
    physicsRaf = requestAnimationFrame(step);
  };

  physicsRaf = requestAnimationFrame(step);
};

watch(
  () => props.nodes,
  (nodes) => {
    const next = new Map<string, Point>();
    nodes.forEach((node, index) =>
      next.set(node.id, ensurePoint(node.id, index)),
    );
    points.value = next;
    burstStrength.value = 1;
    kickPhysics(1);
  },
  { immediate: true, deep: true },
);

watch(
  () => [
    props.edges.length,
    repulsionStrength.value,
    linkStrength.value,
    edgeRigidity.value,
    nodeSize.value,
  ],
  () => kickPhysics(0.9),
);

watch(
  () => [width.value, height.value],
  () => {
    props.nodes.forEach((node, index) => ensurePoint(node.id, index));
    burstStrength.value = Math.max(burstStrength.value, 0.35);
    kickPhysics(0.7);
  },
);

const positionedNodes = computed(() => {
  void tickKey.value;
  return props.nodes.map((node, index) => {
    const point = ensurePoint(node.id, index);
    const isActive = node.id === props.activeNodeId;
    const isNeighbor = activeNeighbors.value.has(node.id);
    const isHovered = hoveredNodeId.value === node.id;
    const isMatched = searchMatched.value.has(node.id);
    const hasHovered = !!hoveredNodeId.value;
    const isNeighborOfHovered = hoveredNeighbors.value.has(node.id);

    let className = "graph-node fill-current text-muted/60";
    if (node.isPlaceholder) className = "graph-node fill-current text-muted/35";
    if (isActive || isNeighbor || isNeighborOfHovered)
      className = "graph-node fill-current text-muted/70";
    if (isHovered || isMatched)
      className = "graph-node fill-current text-primary graph-node--focus";
    if (hasHovered && !isHovered && !isNeighborOfHovered)
      className = "graph-node fill-current text-muted/25";

    const showLabel =
      labelsMode.value === "all" ||
      (labelsMode.value === "active" &&
        (isActive || isNeighbor || isMatched)) ||
      (labelsMode.value === "hover" &&
        (isHovered || isNeighborOfHovered || isMatched));

    return {
      ...node,
      x: point.x,
      y: point.y,
      className,
      radius: isHovered || isMatched ? nodeSize.value + 1 : nodeSize.value,
      isFocused: isHovered || isMatched,
      showLabel,
    };
  });
});

const nodeMap = computed(
  () => new Map(positionedNodes.value.map((node) => [node.id, node])),
);

const positionedEdges = computed(() =>
  props.edges
    .map((edge) => {
      const from = nodeMap.value.get(edge.sourceNoteId);
      const to = nodeMap.value.get(edge.targetNoteId);
      if (!from || !to) return null;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.0001) return null;

      const ux = dx / distance;
      const uy = dy / distance;
      const startOffset = from.radius + 0.8;
      const endOffset = to.radius + (showDirection.value ? 0 : 0.8);

      const active =
        edge.sourceNoteId === props.activeNodeId ||
        edge.targetNoteId === props.activeNodeId;
      const isHoveredEdge =
        edge.sourceNoteId === hoveredNodeId.value ||
        edge.targetNoteId === hoveredNodeId.value;
      const hasHovered = !!hoveredNodeId.value;

      return {
        id: edge.id,
        x1: from.x + ux * startOffset,
        y1: from.y + uy * startOffset,
        x2: to.x - ux * endOffset,
        y2: to.y - uy * endOffset,
        className:
          isHoveredEdge || from.isFocused || to.isFocused
            ? "stroke-current text-primary/45"
            : hasHovered
              ? "stroke-current text-muted/18"
              : active
                ? "stroke-current text-muted/45"
                : "stroke-current text-muted/45",
      };
    })
    .filter((item): item is NonNullable<typeof item> => !!item),
);

const onNodeClick = (id: string) => {
  const now = Date.now();
  if (suppressedClickNodeId.value === id && now < suppressClickUntil.value)
    return;
  emit("node-click", id);
};

const toWorld = (x: number, y: number) => {
  const rect = viewportRef.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: (x - rect.left - panX.value) / zoom.value,
    y: (y - rect.top - panY.value) / zoom.value,
  };
};

const onViewportPointerDown = (event: PointerEvent) => {
  panningState.value = {
    startX: event.clientX,
    startY: event.clientY,
    x: panX.value,
    y: panY.value,
  };
};

const onNodePointerDown = (event: PointerEvent, id: string) => {
  draggedNodeId.value = id;
  const point = points.value.get(id);
  if (!point) return;
  const neighbors = linkedNeighborsMap.value.get(id) || new Set<string>();
  const startClientX = event.clientX;
  const startClientY = event.clientY;

  const world = toWorld(event.clientX, event.clientY);
  const offsetX = point.x - world.x;
  const offsetY = point.y - world.y;
  let moved = false;

  const move = (nextEvent: PointerEvent) => {
    const next = toWorld(nextEvent.clientX, nextEvent.clientY);
    const nextX = next.x + offsetX;
    const nextY = next.y + offsetY;
    const dx = nextX - point.x;
    const dy = nextY - point.y;

    if (!moved) {
      const dragDistance = Math.hypot(
        nextEvent.clientX - startClientX,
        nextEvent.clientY - startClientY,
      );
      if (dragDistance > 2) moved = true;
    }

    point.x = nextX;
    point.y = nextY;
    point.vx = 0;
    point.vy = 0;

    neighbors.forEach((neighborId) => {
      const neighborPoint = points.value.get(neighborId);
      if (!neighborPoint || neighborId === id) return;
      neighborPoint.x += dx * 0.22 * edgeRigidity.value;
      neighborPoint.y += dy * 0.22 * edgeRigidity.value;
      neighborPoint.vx *= 0.6;
      neighborPoint.vy *= 0.6;
    });

    tickKey.value += 1;
  };

  const up = () => {
    if (moved) {
      suppressedClickNodeId.value = id;
      suppressClickUntil.value = Date.now() + 220;
    }
    draggedNodeId.value = null;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    kickPhysics(0.6);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
};

const onWheel = (event: WheelEvent) => {
  const rect = viewportRef.value?.getBoundingClientRect();
  if (!rect) return;
  const cursorX = event.clientX - rect.left;
  const cursorY = event.clientY - rect.top;
  const worldX = (cursorX - panX.value) / zoom.value;
  const worldY = (cursorY - panY.value) / zoom.value;

  const nextZoom = Math.min(
    2.6,
    Math.max(0.35, zoom.value * (event.deltaY > 0 ? 0.92 : 1.08)),
  );
  zoom.value = nextZoom;
  panX.value = cursorX - worldX * nextZoom;
  panY.value = cursorY - worldY * nextZoom;
};

const onPointerMove = (event: PointerEvent) => {
  if (!panningState.value || draggedNodeId.value) return;
  panX.value =
    panningState.value.x + (event.clientX - panningState.value.startX);
  panY.value =
    panningState.value.y + (event.clientY - panningState.value.startY);
};

const onPointerUp = () => {
  panningState.value = null;
};

onMounted(() => {
  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    width.value = Math.max(320, entry.contentRect.width);
    height.value = Math.max(320, entry.contentRect.height);
    kickPhysics(0.5);
  });

  if (viewportRef.value) observer.observe(viewportRef.value);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  onBeforeUnmount(() => {
    observer.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    if (physicsRaf !== null) cancelAnimationFrame(physicsRaf);
  });
});
</script>

<style scoped>
.graph-node {
  stroke: rgb(255 255 255 / 0.25);
  stroke-width: 0.7;
  transition: transform 0.12s ease;
}

.graph-node--focus {
  stroke-width: 1;
}
</style>
