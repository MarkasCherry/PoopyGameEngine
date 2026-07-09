import { useMemo, useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fileUrl } from '../api/hooks';
import { Button, IconButton } from './ui';

export function buildTree(scenes) {
    const byParent = new Map();

    for (const scene of scenes) {
        const key = scene.parent_id ?? null;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(scene);
    }

    for (const children of byParent.values()) {
        children.sort((a, b) => a.position - b.position);
    }

    return byParent;
}

export default function SceneTree({
    gameId, scenes, mapData, selectedId,
    onSelect, onCreate, onRename, onMove, onReorder, onDuplicate, onDelete,
}) {
    const [collapsed, setCollapsed] = useState(() => new Set());
    const byParent = useMemo(() => buildTree(scenes), [scenes]);

    const backgrounds = useMemo(
        () => Object.fromEntries((mapData?.scenes ?? []).map((s) => [s.id, s.background])),
        [mapData],
    );

    const visible = useMemo(() => {
        const rows = [];
        const walk = (parentId, depth) => {
            for (const scene of byParent.get(parentId) ?? []) {
                rows.push({ scene, depth });
                if (!collapsed.has(scene.id)) walk(scene.id, depth + 1);
            }
        };
        walk(null, 0);
        return rows;
    }, [byParent, collapsed]);

    const onDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const a = scenes.find((s) => s.id === active.id);
        const b = scenes.find((s) => s.id === over.id);
        if (!a || !b || a.parent_id !== b.parent_id) return;

        const siblings = (byParent.get(a.parent_id ?? null) ?? []).map((s) => s.id);
        onReorder(arrayMove(siblings, siblings.indexOf(a.id), siblings.indexOf(b.id)));
    };

    return (
        <div className="flex h-full w-72 shrink-0 flex-col border-r border-white/5">
            <div className="flex items-center justify-between p-4 pb-2">
                <h2 className="text-xs font-bold tracking-[0.2em] text-violet-300/70 uppercase">Story</h2>
                <div className="flex gap-1.5">
                    <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => onCreate(null, null, false)}>🎬 Scene</Button>
                    <Button
                        variant="ghost"
                        className="!px-2 !py-1 text-xs !text-amber-200/90 hover:!border-amber-300/40"
                        onClick={() => onCreate(null, null, true)}
                        title="A folder that holds scenes — chapters, episodes, acts"
                    >
                        📁 Group
                    </Button>
                </div>
            </div>

            <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
                <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={visible.map((r) => r.scene.id)} strategy={verticalListSortingStrategy}>
                        {visible.map(({ scene, depth }) => (
                            <TreeRow
                                key={scene.id}
                                gameId={gameId}
                                scene={scene}
                                depth={depth}
                                background={backgrounds[scene.id]}
                                hasChildren={(byParent.get(scene.id) ?? []).length > 0}
                                isCollapsed={collapsed.has(scene.id)}
                                active={scene.id === selectedId}
                                scenes={scenes}
                                byParent={byParent}
                                onToggle={() => setCollapsed((prev) => {
                                    const next = new Set(prev);
                                    next.has(scene.id) ? next.delete(scene.id) : next.add(scene.id);
                                    return next;
                                })}
                                onSelect={() => onSelect(scene.id)}
                                onCreate={onCreate}
                                onRename={onRename}
                                onMove={onMove}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
                {visible.length === 0 && (
                    <p className="px-3 py-8 text-center text-xs text-violet-300/50">
                        No scenes yet. 🎬 Scenes hold the story beats; 📁 Groups are folders for
                        organizing them into chapters or episodes.
                    </p>
                )}
            </div>
        </div>
    );
}

function TreeRow({
    gameId, scene, depth, background, hasChildren, isCollapsed, active, scenes, byParent,
    onToggle, onSelect, onCreate, onRename, onMove, onDuplicate, onDelete,
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
    const [menuOpen, setMenuOpen] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [title, setTitle] = useState(scene.title);

    const descendants = useMemo(() => {
        const ids = new Set([scene.id]);
        const walk = (id) => (byParent.get(id) ?? []).forEach((c) => { ids.add(c.id); walk(c.id); });
        walk(scene.id);
        return ids;
    }, [byParent, scene.id]);

    const moveTargets = scenes.filter((s) => s.is_group && !descendants.has(s.id) && s.id !== scene.parent_id);
    const isGroup = scene.is_group;
    const childrenCount = (byParent.get(scene.id) ?? []).length;

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1, paddingLeft: depth * 16 }}
            className="relative"
        >
            {depth > 0 && (
                <span
                    className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/10"
                    style={{ left: depth * 16 - 8 }}
                />
            )}
            <div
                onClick={onSelect}
                className={`group flex cursor-pointer items-center gap-1.5 rounded-xl border py-1.5 pr-1 pl-1.5 transition ${
                    active
                        ? isGroup
                            ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/10 shadow-[0_4px_20px_rgba(251,191,36,0.15)]'
                            : 'border-fuchsia-400/40 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/15 shadow-[0_4px_20px_rgba(139,92,246,0.25)]'
                        : isGroup
                            ? 'border-amber-300/15 bg-amber-400/[0.04] hover:border-amber-300/30 hover:bg-amber-400/10'
                            : 'border-transparent hover:border-white/10 hover:bg-white/5'
                }`}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); hasChildren && onToggle(); }}
                    className={`w-4 shrink-0 cursor-pointer text-[9px] transition ${
                        isGroup ? 'text-amber-300/70 hover:text-amber-200' : 'text-violet-300/50 hover:text-white'
                    } ${hasChildren ? '' : 'opacity-0'}`}
                >
                    {isCollapsed ? '▶' : '▼'}
                </button>

                <span {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="cursor-grab text-[10px] text-violet-300/25 group-hover:text-violet-300/60 active:cursor-grabbing">⋮⋮</span>

                <span className={`relative h-7 w-11 shrink-0 overflow-hidden rounded-md border bg-ink-900 ${isGroup ? 'border-amber-300/25' : 'border-white/10'}`}>
                    {background ? (
                        <img src={fileUrl(gameId, background)} alt="" className="size-full object-cover" />
                    ) : (
                        <span className="flex size-full items-center justify-center text-[11px] opacity-60">{isGroup ? (isCollapsed ? '📁' : '📂') : '🎬'}</span>
                    )}
                    {isGroup && background && (
                        <span className="absolute right-0 bottom-0 rounded-tl bg-ink-950/80 px-0.5 text-[8px]">📁</span>
                    )}
                </span>

                {renaming ? (
                    <form
                        className="min-w-0 flex-1"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={(e) => { e.preventDefault(); onRename(scene.id, title); setRenaming(false); }}
                    >
                        <input
                            className="w-full rounded-md bg-ink-900 px-1.5 py-0.5 text-xs text-white ring-1 ring-fuchsia-400/50 outline-none"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => { onRename(scene.id, title); setRenaming(false); }}
                            autoFocus
                        />
                    </form>
                ) : (
                    <span
                        className={`min-w-0 flex-1 truncate text-xs font-semibold ${isGroup ? 'text-amber-100' : 'text-white'}`}
                        onDoubleClick={(e) => { e.stopPropagation(); setTitle(scene.title); setRenaming(true); }}
                    >
                        {scene.title}
                    </span>
                )}

                <span className={`text-[9px] whitespace-nowrap ${isGroup ? 'text-amber-300/50' : 'text-violet-300/40'}`}>
                    {isGroup ? `${childrenCount} ${childrenCount === 1 ? 'scene' : 'scenes'}` : { dialogue: '💬', choice: '🔀', video: '🎥' }[scene.type] ?? ''}
                </span>

                <IconButton
                    className="!size-6 text-xs opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                    title="Scene actions"
                >
                    ⋯
                </IconButton>
            </div>

            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="glass-deep animate-pop absolute top-9 right-0 z-40 w-52 rounded-xl p-1.5">
                        <MenuItem onClick={() => { setTitle(scene.title); setRenaming(true); setMenuOpen(false); }}>✎ Rename</MenuItem>
                        {isGroup && (
                            <>
                                <MenuItem onClick={() => { onCreate(scene.id, null, false); setMenuOpen(false); }}>🎬 Add scene inside</MenuItem>
                                <MenuItem onClick={() => { onCreate(scene.id, null, true); setMenuOpen(false); }}>📁 Add group inside</MenuItem>
                            </>
                        )}
                        <MenuItem onClick={() => { onDuplicate(scene.id); setMenuOpen(false); }}>⧉ Duplicate (with content)</MenuItem>
                        {(scene.parent_id !== null || moveTargets.length > 0) && (
                            <>
                                <div className="my-1 border-t border-white/10" />
                                <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold tracking-wider text-violet-300/50 uppercase">Move to</p>
                                {scene.parent_id !== null && (
                                    <MenuItem onClick={() => { onMove(scene.id, null); setMenuOpen(false); }}>⤒ Top level</MenuItem>
                                )}
                                {moveTargets.map((target) => (
                                    <MenuItem key={target.id} onClick={() => { onMove(scene.id, target.id); setMenuOpen(false); }}>
                                        📁 {target.title}
                                    </MenuItem>
                                ))}
                            </>
                        )}
                        <div className="my-1 border-t border-white/10" />
                        <MenuItem
                            danger
                            onClick={() => {
                                setMenuOpen(false);
                                if (confirm(`Delete "${scene.title}"${hasChildren ? ' and everything inside it' : ''}?`)) onDelete(scene.id);
                            }}
                        >
                            🗑 Delete
                        </MenuItem>
                    </div>
                </>
            )}
        </div>
    );
}

function MenuItem({ danger = false, className = '', ...props }) {
    return (
        <button
            className={`w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-xs font-medium transition ${
                danger ? 'text-rose-300 hover:bg-rose-500/15' : 'text-violet-100 hover:bg-white/10'
            } ${className}`}
            {...props}
        />
    );
}
