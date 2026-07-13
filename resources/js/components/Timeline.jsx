import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fileUrl } from '../api/hooks';
import { resolveSpeaker } from '../lib/resolve';
import { IconButton } from './ui';

const KINDS = [
    { type: 'dialogue', label: 'Dialogue', icon: '💬', defaults: { text: '' } },
    { type: 'choice', label: 'Choice', icon: '🔀', defaults: { options: [{ text: '' }] } },
    { type: 'video', label: 'Video', icon: '🎥', defaults: { asset_path: null, skippable: true } },
];

export { KINDS as SCENE_KINDS };

const GAP = 4;
const PAD = 18;

// Blocks are sized roughly by how long they take to play — dialogue by text
// length, choice by option count, video gets a fixed generous width — so the
// timeline reads a bit like a real edit's clip lengths instead of uniform cards.
function estimateWidth(scene) {
    if (scene.is_group) return 150;
    if (scene.type === 'dialogue') {
        return Math.max(110, Math.min(260, 92 + (scene.data?.text ?? '').length * 1.6));
    }
    if (scene.type === 'choice') {
        const options = scene.data?.options ?? [];
        const chars = (scene.data?.prompt ?? '').length + options.reduce((n, o) => n + (o.text?.length ?? 0), 0);
        return Math.max(160, Math.min(260, 130 + chars * 1.1));
    }
    if (scene.type === 'video') return 210;
    return 130;
}

function sceneCues(scene) {
    const cues = [];
    if (scene.background) {
        cues.push({
            kind: 'bg',
            icon: '⧉',
            title: 'Background',
            detail: `${scene.background.transition ?? 'fade'} → ${scene.background.asset_path?.split('/').pop() ?? '—'}`,
            section: 'background',
        });
    }
    if (scene.audio) {
        cues.push(scene.audio.action === 'stop'
            ? { kind: 'audio', icon: '⏻', title: 'Music stops', detail: 'Silences the track from here.', section: 'audio' }
            : { kind: 'audio', icon: '♪', title: 'Music starts', detail: scene.audio.asset_path?.split('/').pop() ?? '—', section: 'audio' });
    }
    if ((scene.effects ?? []).length > 0) {
        cues.push({
            kind: 'fx',
            icon: '⚡',
            title: 'Effects',
            detail: `${scene.effects.length} fired on entry`,
            section: 'effects',
        });
    }
    return cues;
}

export default function Timeline({
    gameId, groupTitle, scenes, backgrounds, music, characters,
    selectedId, onSelect, onReorder, onAdd, onDelete, onFocusSection,
}) {
    const [order, setOrder] = useState(scenes.map((s) => s.id));
    const [zoom, setZoom] = useState(100);
    const [openCue, setOpenCue] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => setOrder(scenes.map((s) => s.id)), [scenes]);

    const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));
    const ordered = order.map((id) => byId[id]).filter(Boolean);
    const selectedIndex = ordered.findIndex((s) => s.id === selectedId);

    const widths = useMemo(
        () => ordered.map((s) => Math.round(estimateWidth(s) * (zoom / 100))),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [ordered.map((s) => s.id).join(','), zoom],
    );
    const lefts = useMemo(() => {
        const arr = [];
        let x = 0;
        for (const w of widths) { arr.push(x); x += w + GAP; }
        return arr;
    }, [widths]);
    const totalWidth = widths.length ? lefts[lefts.length - 1] + widths[widths.length - 1] : 0;
    const seamX = (i) => (i < ordered.length ? lefts[i] : totalWidth);

    // Continuous music regions: consecutive scenes resolving to the same
    // track become one spanning bar, mirroring how audio clips span several
    // video clips underneath them in a real editor.
    const scoreSpans = useMemo(() => {
        const spans = [];
        let i = 0;
        while (i < ordered.length) {
            const path = music?.[ordered[i].id]?.asset_path ?? null;
            if (!path) { i++; continue; }
            let j = i;
            while (j + 1 < ordered.length && (music?.[ordered[j + 1].id]?.asset_path ?? null) === path) j++;
            spans.push({ from: i, to: j, label: path.split('/').pop() });
            i = j + 1;
        }
        return spans;
    }, [ordered, music]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const onDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const next = arrayMove(order, order.indexOf(active.id), order.indexOf(over.id));
        setOrder(next);
        onReorder(next);
    };

    const jump = (sceneId, section) => {
        onSelect(sceneId);
        onFocusSection?.(sceneId, section);
        setOpenCue(null);
    };

    const dragState = useRef(null);
    const onFlagDown = (e) => {
        e.stopPropagation();
        dragState.current = { rect: scrollRef.current.getBoundingClientRect() };
        e.target.setPointerCapture(e.pointerId);
    };
    const onFlagMove = (e) => {
        if (!dragState.current) return;
        const { rect } = dragState.current;
        dragState.current.x = e.clientX - rect.left + scrollRef.current.scrollLeft;
    };
    const onFlagUp = () => {
        if (!dragState.current) return;
        const x = dragState.current.x ?? seamX(Math.max(selectedIndex, 0));
        dragState.current = null;
        let closest = ordered[0]?.id, closestDist = Infinity;
        ordered.forEach((s, i) => {
            const d = Math.abs(seamX(i) - x);
            if (d < closestDist) { closestDist = d; closest = s.id; }
        });
        if (closest != null) onSelect(closest);
    };

    return (
        <div className="glass flex h-52 shrink-0 flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2">
                <span className="truncate text-xs font-bold text-white">{groupTitle}</span>
                <span className="font-mono text-[10px] text-violet-300/40">
                    {ordered.length ? `${Math.max(selectedIndex, 0) + 1} / ${ordered.length}` : '0 / 0'}
                </span>

                <div className="flex gap-1">
                    {KINDS.map((kind) => (
                        <button
                            key={kind.type}
                            onClick={() => onAdd(kind)}
                            title={`Add ${kind.label.toLowerCase()} scene`}
                            className="cursor-pointer rounded-lg px-2 py-1 text-[10px] font-semibold text-violet-100 transition hover:bg-white/10"
                        >
                            {kind.icon} {kind.label}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <label className="text-[9px] font-bold tracking-[0.1em] text-violet-300/40 uppercase">Zoom</label>
                    <input
                        type="range" min="70" max="160" value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-24 accent-fuchsia-500"
                    />
                </div>
            </div>

            {ordered.length === 0 ? (
                <p className="flex flex-1 items-center justify-center px-2 text-center text-[11px] text-violet-300/50">
                    Empty — add a dialogue, choice or video scene above.
                </p>
            ) : (
                <div ref={scrollRef} className="relative flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="relative h-full" style={{ width: totalWidth + PAD * 2, paddingLeft: PAD, paddingRight: PAD, paddingTop: 10 }}>
                        <LaneLabel top={0}>Story</LaneLabel>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                            <SortableContext items={order} strategy={horizontalListSortingStrategy}>
                                <div className="flex h-20 items-stretch" style={{ gap: GAP }}>
                                    {ordered.map((scene, i) => (
                                        <TimelineBlock
                                            key={scene.id}
                                            gameId={gameId}
                                            scene={scene}
                                            index={i}
                                            width={widths[i]}
                                            background={backgrounds[scene.id]}
                                            characters={characters}
                                            active={scene.id === selectedId}
                                            onSelect={() => onSelect(scene.id)}
                                            onDelete={() => onDelete(scene.id)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        <LaneLabel top={98}>Score</LaneLabel>
                        <div className="relative mt-2 h-5">
                            {scoreSpans.map((s, i) => {
                                const left = seamX(s.from);
                                const width = seamX(s.to + 1) - left;
                                return (
                                    <div
                                        key={i}
                                        className="absolute top-0 flex h-full items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 px-2.5 text-[9px] font-bold whitespace-nowrap"
                                        style={{ left, width, color: 'var(--color-on-accent)' }}
                                        title={s.label}
                                    >
                                        ♪ {s.label}
                                    </div>
                                );
                            })}
                        </div>

                        <LaneLabel top={124}>Cues</LaneLabel>
                        <div className="relative mt-1 h-5">
                            {ordered.map((scene, i) => {
                                const cues = sceneCues(scene);
                                if (!cues.length) return null;
                                const x = seamX(i);
                                return cues.map((cue, ci) => (
                                    <CuePin
                                        key={`${scene.id}-${cue.kind}`}
                                        x={x + (ci - (cues.length - 1) / 2) * 17}
                                        cue={cue}
                                        open={openCue === `${scene.id}-${cue.kind}`}
                                        onToggle={() => setOpenCue((v) => (v === `${scene.id}-${cue.kind}` ? null : `${scene.id}-${cue.kind}`))}
                                        onJump={() => jump(scene.id, cue.section)}
                                    />
                                ));
                            })}
                        </div>

                        {selectedIndex >= 0 && (
                            <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-fuchsia-500" style={{ left: seamX(selectedIndex) }}>
                                <div
                                    className="pointer-events-auto absolute -top-0.5 -left-2 h-3.5 w-4 cursor-ew-resize rounded-sm bg-fuchsia-500"
                                    title="Drag to scrub"
                                    onPointerDown={onFlagDown}
                                    onPointerMove={onFlagMove}
                                    onPointerUp={onFlagUp}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function LaneLabel({ top, children }) {
    return (
        <span className="pointer-events-none absolute left-0.5 text-[9px] font-bold tracking-[0.14em] text-violet-300/40 uppercase" style={{ top }}>
            {children}
        </span>
    );
}

function CuePin({ x, cue, open, onToggle, onJump }) {
    return (
        <div className="absolute top-0" style={{ left: x, transform: 'translateX(-50%)' }}>
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                title={cue.title}
                className={`flex size-4.5 cursor-pointer items-center justify-center rounded-md text-[9px] transition ${
                    cue.kind === 'fx'
                        ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-white/10 text-violet-200 hover:bg-white/20'
                }`}
            >
                {cue.icon}
            </button>
            {open && (
                <div className="glass-deep animate-pop absolute bottom-full z-30 mb-2 w-48 -translate-x-1/2 rounded-xl p-2.5 text-left" style={{ left: '50%' }}>
                    <p className="text-xs font-bold text-white">{cue.title}</p>
                    <p className="mt-0.5 text-[11px] text-violet-300/60">{cue.detail}</p>
                    <button
                        onClick={onJump}
                        className="mt-2 cursor-pointer text-[10px] font-semibold text-fuchsia-300 hover:text-fuchsia-200"
                    >
                        ↓ Edit in inspector
                    </button>
                </div>
            )}
        </div>
    );
}

function TimelineBlock({ gameId, scene, index, width, background, characters, active, onSelect, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });

    const summary = (() => {
        if (scene.is_group) {
            return { title: scene.title, color: '#fbbf24', text: 'Group — open to see inside', icon: '📁' };
        }
        if (scene.type === 'dialogue') {
            const speaker = resolveSpeaker(characters, scene.data ?? {});
            return { title: speaker.name ?? 'Narrator', color: speaker.color, text: scene.data?.text || '…', icon: '💬' };
        }
        if (scene.type === 'choice') {
            return { title: 'Choice', color: '#fcd34d', text: (scene.data?.options ?? []).map((o) => o.text || '…').join(' / '), icon: '🔀' };
        }
        return { title: 'Video', color: '#67e8f9', text: scene.data?.asset_path?.split('/').pop() ?? 'No file', icon: '🎥' };
    })();

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={{
                width,
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                borderLeft: `3px solid ${summary.color}`,
            }}
            onClick={onSelect}
            className={`group relative shrink-0 cursor-pointer touch-none overflow-hidden rounded-lg border border-white/10 p-2 transition ${
                active ? '-translate-y-0.5 bg-fuchsia-500/10 shadow-[0_0_0_2px_var(--color-accent),0_10px_22px_rgba(0,0,0,0.4)]' : 'glass hover:border-white/20'
            }`}
        >
            {background && (
                <img
                    src={fileUrl(gameId, background)}
                    alt=""
                    className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
                />
            )}
            <div className="relative flex h-full flex-col justify-end">
                <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="text-xs">{summary.icon}</span>
                    <span className="truncate text-[11px] font-bold" style={{ color: summary.color }}>{summary.title}</span>
                    <span className="ml-auto font-mono text-[9px] text-violet-300/40">{index + 1}</span>
                </div>
                <p className="line-clamp-2 min-h-4 text-[10px] leading-snug text-violet-100/75">{summary.text}</p>
                <div className="mt-0.5 flex items-center gap-1">
                    {scene.auto_advance && <span className="text-[8px] text-fuchsia-300/70" title="Auto-advance">⏱</span>}
                    {scene.type === 'dialogue' && (scene.data?.sprites ?? []).length > 0 && (
                        <span className="text-[8px] text-violet-300/50">👥{scene.data.sprites.length}</span>
                    )}
                    <IconButton
                        className="ml-auto !size-5 text-[10px] opacity-0 group-hover:opacity-100 hover:!bg-rose-500/25 hover:!text-rose-200"
                        title="Delete scene"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    >
                        ✕
                    </IconButton>
                </div>
            </div>
        </div>
    );
}
