import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fileUrl, useCharacters, useGameMap, useScenes } from '../api/hooks';
import { nodeIcon, resolveAppearance } from '../lib/resolve';
import { EmptyState, Spinner } from '../components/ui';

const CARD_W = 230;
const CARD_H = 104;

/**
 * The map mirrors the engine exactly: play order is the depth-first walk of
 * the tree, dialogue/video flow to the next playable scene, choices flow
 * where their options point (null target = continue in order), and the game
 * ends after the last playable scene.
 */
function buildFlow(scenes) {
    const byId = new Map(scenes.map((s) => [s.id, s]));
    const byParent = new Map();

    for (const scene of scenes) {
        const key = scene.parent_id ?? null;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(scene);
    }
    for (const children of byParent.values()) children.sort((a, b) => a.position - b.position);

    const flat = [];
    const walk = (parentId) => {
        for (const scene of byParent.get(parentId) ?? []) {
            flat.push(scene);
            walk(scene.id);
        }
    };
    walk(null);

    const playable = flat.filter((s) => !s.is_group && s.type);
    const sceneKey = (scene) => (scene.is_group ? `g${scene.id}` : `s${scene.id}`);
    const edges = [];

    edges.push({ from: 'start', to: playable[0] ? `s${playable[0].id}` : 'end', kind: 'seq' });

    playable.forEach((scene, i) => {
        const nextKey = playable[i + 1] ? `s${playable[i + 1].id}` : 'end';
        const options = scene.type === 'choice' ? (scene.data?.options ?? []) : null;

        if (options?.length) {
            options.forEach((option, oi) => {
                const target = option.target_scene_id ? byId.get(option.target_scene_id) : null;
                edges.push({
                    from: `s${scene.id}`,
                    to: option.target_scene_id ? (target ? sceneKey(target) : 'end') : nextKey,
                    label: option.text || `Option ${oi + 1}`,
                    kind: 'choice',
                });
            });
        } else {
            edges.push({ from: `s${scene.id}`, to: nextKey, kind: 'seq' });
        }
    });

    return { byParent, playable, edges };
}

export default function MapPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { data: scenes, isLoading } = useScenes(gameId);
    const { data: mapData } = useGameMap(gameId);
    const { data: characters } = useCharacters(gameId);

    const [view, setView] = useState({ x: 40, y: 0, k: 1 });
    const viewRef = useRef(view);
    viewRef.current = view;
    const panState = useRef(null);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const nodeEls = useRef(new Map());
    const [rects, setRects] = useState({});

    const { byParent, playable, edges } = useMemo(
        () => buildFlow(scenes ?? []),
        [scenes],
    );

    const backgrounds = useMemo(
        () => Object.fromEntries((mapData?.scenes ?? []).map((s) => [s.id, s.background])),
        [mapData],
    );

    const register = useCallback((key) => (el) => {
        if (el) nodeEls.current.set(key, el);
        else nodeEls.current.delete(key);
    }, []);

    // Boxes lay themselves out in normal document flow; edges are drawn from
    // measured positions (in untransformed content coordinates).
    const measure = useCallback(() => {
        const root = contentRef.current;
        if (!root) return;
        const origin = root.getBoundingClientRect();
        const k = viewRef.current.k;
        const next = {};
        for (const [key, el] of nodeEls.current) {
            const r = el.getBoundingClientRect();
            next[key] = { x: (r.left - origin.left) / k, y: (r.top - origin.top) / k, w: r.width / k, h: r.height / k };
        }
        setRects(next);
    }, []);

    useLayoutEffect(() => {
        measure();
        const observer = new ResizeObserver(measure);
        if (contentRef.current) observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, [measure, scenes]);

    if (isLoading) return <Spinner />;

    if (!playable.length) {
        return (
            <EmptyState
                icon="🗺️"
                title="Nothing to map yet"
                subtitle="Add scenes and connect them with choices — the story flowchart will grow here."
            />
        );
    }

    const maxRight = Math.max(0, ...Object.values(rects).map((r) => r.x + r.w));

    const onWheel = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.0012);

        setView((v) => {
            const k = Math.min(2.5, Math.max(0.2, v.k * factor));
            const scale = k / v.k;
            return { k, x: mx - (mx - v.x) * scale, y: my - (my - v.y) * scale };
        });
    };

    const startPan = (e) => {
        if (e.target.closest('[data-scene-card]')) return;
        panState.current = { startX: e.clientX, startY: e.clientY, x: view.x, y: view.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPan = (e) => {
        const p = panState.current;
        if (!p) return;
        setView((v) => ({ ...v, x: p.x + e.clientX - p.startX, y: p.y + e.clientY - p.startY }));
    };

    return (
        <div
            ref={containerRef}
            className="map-grid relative h-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
            onWheel={onWheel}
            onPointerDown={startPan}
            onPointerMove={onPan}
            onPointerUp={() => (panState.current = null)}
        >
            <div className="pointer-events-none absolute top-4 left-5 z-20">
                <h1 className="text-gradient text-2xl font-bold tracking-tight">Story Map</h1>
                <p className="text-xs text-violet-300/50">
                    The exact flow the player travels · boxes are groups · scroll to zoom · click a scene to direct it
                </p>
            </div>

            <div
                className="absolute origin-top-left"
                style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
            >
                <FlowEdges edges={edges} rects={rects} busX={maxRight + 48} />

                <div ref={contentRef} className="inline-flex flex-col items-start gap-9 px-14 py-20">
                    <div
                        ref={register('start')}
                        className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-6 py-2.5 text-sm font-bold tracking-widest text-emerald-200 uppercase shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                    >
                        ▶ Start game
                    </div>

                    {(byParent.get(null) ?? []).map((scene) => (
                        <FlowNode
                            key={scene.id}
                            gameId={gameId}
                            scene={scene}
                            byParent={byParent}
                            backgrounds={backgrounds}
                            characters={characters ?? []}
                            register={register}
                            onOpen={(id) => navigate(`/games/${gameId}/scenes?scene=${id}`)}
                        />
                    ))}

                    <div
                        ref={register('end')}
                        className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-sm font-bold tracking-widest text-white/85 uppercase shadow-[0_0_24px_rgba(255,255,255,0.12)]"
                    >
                        🏁 Game finished
                    </div>
                </div>
            </div>

            <div className="absolute right-4 bottom-4 z-20 flex gap-1.5">
                <MapButton onClick={() => setView((v) => ({ ...v, k: Math.min(2.5, v.k * 1.25) }))}>＋</MapButton>
                <MapButton onClick={() => setView((v) => ({ ...v, k: Math.max(0.2, v.k / 1.25) }))}>－</MapButton>
                <MapButton onClick={() => setView({ x: 40, y: 0, k: 1 })}>⤢ Reset</MapButton>
            </div>
        </div>
    );
}

function FlowNode({ gameId, scene, byParent, backgrounds, characters, register, onOpen }) {
    if (scene.is_group) {
        const children = byParent.get(scene.id) ?? [];

        return (
            <div
                ref={register(`g${scene.id}`)}
                className="rounded-3xl border border-dashed border-amber-300/35 bg-amber-400/[0.04] p-5 pt-3.5"
            >
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm">📁</span>
                    <span className="text-sm font-bold text-amber-100">{scene.title}</span>
                    <span className="text-[10px] font-semibold text-amber-200/40">
                        · {children.length ? `${children.length} inside` : 'empty'}
                    </span>
                </div>

                <div className="flex flex-col items-start gap-7">
                    {children.map((child) => (
                        <FlowNode
                            key={child.id}
                            gameId={gameId}
                            scene={child}
                            byParent={byParent}
                            backgrounds={backgrounds}
                            characters={characters}
                            register={register}
                            onOpen={onOpen}
                        />
                    ))}
                    {children.length === 0 && (
                        <p className="px-2 py-4 text-xs text-amber-200/40">Nothing inside yet.</p>
                    )}
                </div>
            </div>
        );
    }

    const speakers = scene.type === 'dialogue' && scene.data?.character_id ? [scene.data.character_id] : [];

    return (
        <button
            ref={register(`s${scene.id}`)}
            data-scene-card
            onClick={() => onOpen(scene.id)}
            className="glass card-lift relative cursor-pointer overflow-hidden rounded-2xl text-left"
            style={{ width: CARD_W, height: CARD_H }}
        >
            <div className="absolute inset-0">
                {backgrounds[scene.id] ? (
                    <img src={fileUrl(gameId, backgrounds[scene.id])} alt="" className="size-full object-cover opacity-45" draggable={false} />
                ) : (
                    <div className="stage-empty size-full opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/30 to-transparent" />
            </div>
            <div className="relative flex h-full flex-col justify-end p-3">
                <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="truncate text-sm leading-tight font-bold text-white">{scene.title}</h3>
                        <span className="text-[10px] text-violet-300/60 capitalize">{nodeIcon(scene.type)} {scene.type}</span>
                    </div>
                    <div className="flex -space-x-2">
                        {speakers.map((characterId) => {
                            const resolved = resolveAppearance(characters, characterId, null);
                            return resolved.image ? (
                                <img
                                    key={characterId}
                                    src={resolved.image}
                                    alt={resolved.name}
                                    title={resolved.name}
                                    className="size-7 rounded-full border border-white/25 bg-ink-900 object-cover object-top"
                                />
                            ) : (
                                <span
                                    key={characterId}
                                    title={resolved.name}
                                    className="flex size-7 items-center justify-center rounded-full border border-white/25 bg-ink-800 text-[9px] font-bold"
                                    style={{ color: resolved.color }}
                                >
                                    {(resolved.name ?? '?').slice(0, 2)}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </button>
    );
}

function FlowEdges({ edges, rects, busX }) {
    // Choice branches ride a vertical "bus" to the right of everything so
    // they never cut through the boxes; each gets its own lane.
    let lane = 0;

    return (
        <svg className="pointer-events-none absolute z-10 overflow-visible" width="1" height="1">
            <defs>
                <marker id="arrow-seq" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="#a78bfa" />
                </marker>
                <marker id="arrow-choice" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="#fbbf24" />
                </marker>
            </defs>

            {edges.map((edge, i) => {
                const a = rects[edge.from];
                const b = rects[edge.to];
                if (!a || !b) return null;

                if (edge.kind === 'seq') {
                    const x1 = a.x + a.w / 2;
                    const y1 = a.y + a.h;
                    const x2 = b.x + b.w / 2;
                    const y2 = b.y;
                    const bend = Math.max(18, (y2 - y1) / 2);
                    const path = `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;

                    return (
                        <path key={i} d={path} fill="none" stroke="rgba(167,139,250,0.55)" strokeWidth="2" markerEnd="url(#arrow-seq)" />
                    );
                }

                const laneX = busX + (lane++ % 6) * 26;
                const x1 = a.x + a.w;
                const y1 = a.y + a.h / 2;
                const x2 = b.x + b.w;
                const y2 = b.y + b.h / 2;
                const path = `M ${x1} ${y1} C ${laneX} ${y1}, ${laneX} ${y2}, ${x2} ${y2}`;
                const label = edge.label.length > 22 ? `${edge.label.slice(0, 22)}…` : edge.label;

                return (
                    <g key={i}>
                        <path d={path} fill="none" stroke="rgba(251,191,36,0.6)" strokeWidth="2" strokeDasharray="1 0" markerEnd="url(#arrow-choice)" />
                        <text
                            x={laneX + 8}
                            y={(y1 + y2) / 2 + 4}
                            textAnchor="start"
                            className="fill-amber-100/90 text-[11px] font-semibold"
                            style={{ paintOrder: 'stroke', stroke: 'rgba(10,8,19,0.9)', strokeWidth: 4 }}
                        >
                            {label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

function MapButton({ children, ...props }) {
    return (
        <button className="glass-deep cursor-pointer rounded-xl px-3 py-2 text-sm font-bold text-white transition hover:border-fuchsia-300/40" {...props}>
            {children}
        </button>
    );
}
