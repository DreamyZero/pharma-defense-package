import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import * as d3 from 'd3';
import { authStore } from '../../stores/auth.store';
import { graphStore, GraphNode, GraphEdge } from '../../stores/graph.store';
import './GraphPage.css';

const NODE_COLORS: Record<string, string> = {
  Drug: 'var(--node-drug)',
  Substance: 'var(--node-substance)',
  Group: 'var(--node-group)',
  Indication: 'var(--node-indication)',
  Contraindication: 'var(--node-contraindication)',
  Synonym: 'var(--node-synonym)',
};

const EDGE_COLORS: Record<string, string> = {
  CONTAINS: '#64748b',
  INTERACTS_WITH_HIGH: '#c0392b',
  INTERACTS_WITH_MEDIUM: '#d97706',
  INTERACTS_WITH_LOW: '#059669',
  INTERACTS_WITH: '#64748b',
  BELONGS_TO: '#7c3aed',
  HAS_INDICATION: '#059669',
  HAS_CONTRAINDICATION: '#c0392b',
  ANALOG_OF: '#6366f1',
  HAS_SYNONYM: '#0d9488',
};

function getEdgeColor(edge: GraphEdge): string {
  if (edge.type === 'INTERACTS_WITH') {
    const s = edge.severity?.toUpperCase();
    return EDGE_COLORS[`INTERACTS_WITH_${s}`] || EDGE_COLORS.INTERACTS_WITH;
  }
  return EDGE_COLORS[edge.type] || '#94a3b8';
}

const LEGEND = [
  { type: 'Drug', label: 'Препарат' },
  { type: 'Substance', label: 'Вещество' },
  { type: 'Group', label: 'Фарм. группа' },
  { type: 'Indication', label: 'Показание' },
  { type: 'Contraindication', label: 'Противопок.' },
  { type: 'Synonym', label: 'Синоним' },
];

const GRAPH_HEIGHT = 560;

function layoutNodesInitial(nodes: any[], width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const spread = Math.min(width, height) * 0.32;
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    node.x = cx + spread * Math.cos(angle);
    node.y = cy + spread * Math.sin(angle);
  });
}

function fitGraphToView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  height: number,
) {
  const bounds = group.node()?.getBBox();
  if (!bounds?.width || !bounds?.height) return;

  const padding = 56;
  const scale = Math.min(
    2.5,
    Math.max(
      0.35,
      Math.min((width - padding) / bounds.width, (height - padding) / bounds.height),
    ),
  );
  const tx = width / 2 - scale * (bounds.x + bounds.width / 2);
  const ty = height / 2 - scale * (bounds.y + bounds.height / 2);

  svg
    .transition()
    .duration(450)
    .call(zoom.transform as any, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

const GraphPage: React.FC = observer(() => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [interactionInput, setInteractionInput] = useState('');
  const [interactionList, setInteractionList] = useState<string[]>([]);
  const [drugSearchInput, setDrugSearchInput] = useState('');
  const [limitVal, setLimitVal] = useState(30);

  useEffect(() => {
    graphStore.loadFullGraph(limitVal);
  }, [limitVal]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (graphStore.isLoading) return;

    const { nodes, edges } = graphStore;
    if (nodes.length === 0) return;

    const W = containerRef.current.clientWidth || 800;
    const H = containerRef.current.clientHeight || GRAPH_HEIGHT;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    const defs = svg.append('defs');
    Object.entries(EDGE_COLORS).forEach(([key, color]) => {
      defs
        .append('marker')
        .attr('id', `arrow-${key}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
        .attr('opacity', 0.8);
    });

    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom as any);

    const simNodes: any[] = nodes.map((n) => ({ ...n }));
    layoutNodesInitial(simNodes, W, H);
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    const simEdges: any[] = edges
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
      .map((e) => ({ ...e, source: nodeById.get(e.source), target: nodeById.get(e.target) }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink(simEdges)
          .id((d: any) => d.id)
          .distance((d: any) => (d.type === 'INTERACTS_WITH' ? 90 : 55))
          .strength(0.85),
      )
      .force('charge', d3.forceManyBody().strength(-85).distanceMax(220))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.18))
      .force('collision', d3.forceCollide((d: any) => (d.type === 'Drug' ? 34 : 24)));

    const link = g
      .append('g')
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', (d: any) => getEdgeColor(d))
      .attr('stroke-width', (d: any) => (d.type === 'INTERACTS_WITH' ? 2 : 1.5))
      .attr('stroke-opacity', 0.65)
      .attr('marker-end', (d: any) => {
        if (d.type === 'INTERACTS_WITH') {
          const s = d.severity?.toUpperCase();
          const key = `INTERACTS_WITH_${s}`;
          return `url(#arrow-${EDGE_COLORS[key] ? key : 'INTERACTS_WITH'})`;
        }
        return `url(#arrow-${d.type})`;
      });

    const node = g
      .append('g')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any,
      );

    node
      .append('circle')
      .attr('r', (d: any) => (d.type === 'Drug' ? 16 : 11))
      .attr('fill', (d: any) => NODE_COLORS[d.type] || '#64748b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', (d: any) => (d.highlight ? 1 : 0.88));

    node
      .append('text')
      .text((d: any) => (d.label.length > 14 ? d.label.slice(0, 13) + '\u2026' : d.label))
      .attr('x', 0)
      .attr('y', (d: any) => (d.type === 'Drug' ? 28 : 20))
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none');

    node.on('mouseenter', (_: any, d: any) => setHoveredNode(d));
    node.on('mouseleave', () => setHoveredNode(null));

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    simulation.on('end', () => fitGraphToView(svg, zoom, g, W, H));

    return () => {
      simulation.stop();
    };
  }, [graphStore.nodes, graphStore.edges, graphStore.isLoading]);

  const handleInteractionLoad = () => {
    if (interactionList.length >= 2) {
      graphStore.loadInteractionGraph(interactionList);
    }
  };

  return (
    <div className="graph-page">
      <div className="graph-page__toolbar">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Graph Neo4j</h1>
        <div className="graph-page__controls">
          <button
            className="btn btn-ghost"
            onClick={() => graphStore.loadFullGraph(limitVal)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Перезагрузить
          </button>
          {authStore.isAdmin && (
            <button
              className="btn btn-primary"
              disabled={graphStore.isSyncing}
              onClick={() => graphStore.syncFromPostgres()}
            >
              {graphStore.isSyncing ? (
                'Синхронизация…'
              ) : (
                <>
                  <span className="graph-btn-label--long">Синхронизировать</span>
                  <span className="graph-btn-label--short">Синхро</span>
                </>
              )}
            </button>
          )}
          <div className="graph-limit-ctrl">
            <label htmlFor="limit" className="text-sm text-muted">Узлов:</label>
            <select
              id="limit"
              className="input"
              style={{ width: 72 }}
              value={limitVal}
              onChange={(e) => setLimitVal(Number(e.target.value))}
            >
              {[30, 60, 100, 200].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {graphStore.error && (
        <div className="graph-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {graphStore.error}
        </div>
      )}

      <div className="graph-layout">
        <div className="graph-canvas-wrap" ref={containerRef}>
          {graphStore.isLoading ? (
            <div className="graph-loading">
              <div className="spinner" style={{ width: 32, height: 32 }} />
              <span>Загрузка графа…</span>
            </div>
          ) : (
            <svg ref={svgRef} className="graph-svg" />
          )}
          {hoveredNode && (
            <div className="graph-tooltip">
              <strong>{hoveredNode.label}</strong>
              <span className="badge badge-neutral" style={{ marginTop: 4 }}>{hoveredNode.type}</span>
              {hoveredNode.atcCode && <span className="mono">{hoveredNode.atcCode}</span>}
            </div>
          )}
        </div>

        <aside className="graph-sidebar">
          <div className="graph-legend">
            <h3 className="section-title" style={{ fontSize: 'var(--text-sm)' }}>Легенда</h3>
            {LEGEND.map((item) => (
              <div key={item.type} className="legend-item">
                <span className="legend-dot" style={{ background: NODE_COLORS[item.type] }} />
                <span>{item.label}</span>
              </div>
            ))}
            <div className="legend-divider" />
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#c0392b' }} />
              <span>Взаим. — высокий риск</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#d97706' }} />
              <span>Взаим. — средний</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#059669' }} />
              <span>Взаим. — низкий</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#6366f1' }} />
              <span>Аналог</span>
            </div>
          </div>

          <div className="graph-filter">
            <h3 className="section-title" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--sp-6)' }}>Препарат по названию</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-3)' }}>
              ID, slug или часть названия из каталога
            </p>
            <div className="graph-filter__row">
              <input
                className="input"
                placeholder="Например: аспирин"
                value={drugSearchInput}
                onChange={(e) => setDrugSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && drugSearchInput.trim()) {
                    graphStore.loadDrugGraph(drugSearchInput.trim());
                  }
                }}
              />
              <button
                className="btn btn-primary"
                style={{ padding: '0 var(--sp-3)' }}
                disabled={!drugSearchInput.trim()}
                onClick={() => graphStore.loadDrugGraph(drugSearchInput.trim())}
              >
                Найти
              </button>
            </div>

            <h3 className="section-title" style={{ fontSize: 'var(--text-sm)' }}>Граф взаимодействий</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-3)' }}>
              Добавьте 2+ препарата и постройте граф
            </p>
            <div className="graph-filter__row graph-filter__row--compact">
              <input
                className="input"
                placeholder="Название препарата"
                value={interactionInput}
                onChange={(e) => setInteractionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && interactionInput.trim()) {
                    setInteractionList((prev) => [...prev, interactionInput.trim()]);
                    setInteractionInput('');
                  }
                }}
              />
              <button
                className="btn btn-ghost"
                style={{ padding: '0 var(--sp-3)' }}
                onClick={() => {
                  if (interactionInput.trim()) {
                    setInteractionList((prev) => [...prev, interactionInput.trim()]);
                    setInteractionInput('');
                  }
                }}
              >+</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              {interactionList.map((item, i) => (
                <span key={i} className="tag" style={{ cursor: 'pointer' }} onClick={() => setInteractionList((prev) => prev.filter((_, j) => j !== i))}>
                  {item} ×
                </span>
              ))}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={interactionList.length < 2}
              onClick={handleInteractionLoad}
            >
              Построить граф
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 'var(--sp-2)' }}
              onClick={() => {
                setInteractionList([]);
                graphStore.loadFullGraph(limitVal);
              }}
            >
              Сброс
            </button>
          </div>

          <div className="graph-stats">
            <div className="stat-pill"><span>{graphStore.nodes.length}</span> узлов</div>
            <div className="stat-pill"><span>{graphStore.edges.length}</span> ребер</div>
          </div>
        </aside>
      </div>
    </div>
  );
});

export default GraphPage;
