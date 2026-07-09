import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fileUrl } from '../api/hooks';
import { nodeIcon, resolveSpeaker } from '../lib/resolve';
import { IconButton } from './ui';

const KINDS = [
    { type: 'dialogue', label: 'Dialogue', icon: '💬', defaults: { text: '' } },
    { type: 'choice', label: 'Choice', icon: '🔀', defaults: { options: [{ text: '' }] } },
    { type: 'video', label: 'Video', icon: '🎥', defaults: { asset_path: null, skippable: true } },
];

export { KINDS as SCENE_KINDS };

export default function Timeline({ gameId, groupTitle, scenes, backgrounds, characters, selectedId, onSelect, onReorder, onAdd, onDelete }) {
    const [order, setOrder] = useState(scenes.map((s) => s.id));

    useEffect(() => setOrder(scenes.map((s) => s.id)), [scenes]);

    const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));

    // A plain click must select; only an actual movement starts a drag.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const onDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const next = arrayMove(order, order.indexOf(active.id), order.indexOf(over.id));
        setOrder(next);
        onReorder(next);
    };

    return (
        <div className="flex h-full w-60 shrink-0 flex-col border-r border-white/5">
            <div className="px-3 pt-4 pb-2">
                <div className="mb-0.5 truncate text-xs font-bold text-white">{groupTitle}</div>
                <div className="text-[9px] font-bold tracking-[0.2em] text-violet-300/50 uppercase">
                    Plays top to bottom · {order.length}
                </div>
            </div>

            <div className="flex gap-1 px-3 pb-2">
                {KINDS.map((kind) => (
                    <button
                        key={kind.type}
                        onClick={() => onAdd(kind)}
                        title={`Add ${kind.label.toLowerCase()} scene`}
                        className="glass flex-1 cursor-pointer rounded-lg px-1 py-1.5 text-[10px] font-semibold text-violet-100 transition hover:border-fuchsia-300/50 hover:bg-white/10"
                    >
                        {kind.icon} {kind.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pt-1 pb-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={order} strategy={verticalListSortingStrategy}>
                        {order.map((id, i) =>
                            byId[id] ? (
                                <TimelineCard
                                    key={id}
                                    gameId={gameId}
                                    scene={byId[id]}
                                    index={i}
                                    background={backgrounds[id]}
                                    characters={characters}
                                    active={id === selectedId}
                                    onSelect={() => onSelect(id)}
                                    onDelete={() => onDelete(id)}
                                />
                            ) : null,
                        )}
                    </SortableContext>
                </DndContext>

                {order.length === 0 && (
                    <p className="px-2 py-8 text-center text-[11px] text-violet-300/50">
                        Empty — add a dialogue, choice or video scene above.
                    </p>
                )}
            </div>
        </div>
    );
}

function TimelineCard({ gameId, scene, index, background, characters, active, onSelect, onDelete }) {
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
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            onClick={onSelect}
            className={`group relative w-full cursor-pointer touch-none overflow-hidden rounded-xl border p-2.5 transition ${
                active
                    ? 'border-fuchsia-400/60 bg-gradient-to-b from-violet-600/30 to-fuchsia-600/10 shadow-[0_0_20px_rgba(217,70,239,0.3)]'
                    : 'glass border-white/10 hover:border-violet-300/30'
            }`}
        >
            {background && (
                <img
                    src={fileUrl(gameId, background)}
                    alt=""
                    className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
                />
            )}
            <div className="relative">
                <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="text-xs">{summary.icon ?? nodeIcon(scene.type)}</span>
                    <span className="truncate text-[11px] font-bold" style={{ color: summary.color }}>{summary.title}</span>
                    <span className="ml-auto text-[9px] font-bold text-violet-300/40">{index + 1}</span>
                </div>
                <p className="line-clamp-2 min-h-4 text-[10px] leading-snug text-violet-100/75">{summary.text}</p>
                <div className="mt-1 flex items-center gap-1">
                    {scene.background && <Dot title="Sets background" className="bg-cyan-400" />}
                    {scene.audio && <Dot title="Sets music" className="bg-violet-400" />}
                    {(scene.effects ?? []).length > 0 && <Dot title="Effects" className="bg-amber-400" />}
                    {scene.auto_advance && <Dot title="Auto-advance" className="bg-fuchsia-400" />}
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

function Dot({ className = '', ...props }) {
    return <span className={`size-1.5 rounded-full ${className}`} {...props} />;
}
