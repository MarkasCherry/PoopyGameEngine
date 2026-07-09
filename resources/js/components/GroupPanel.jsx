import { useEffect, useState } from 'react';
import { fileUrl } from '../api/hooks';
import { ancestorBackground } from '../lib/resolve';
import AssetPicker, { AssetField } from './AssetPicker';
import { Button, Select } from './ui';

export default function GroupPanel({ gameId, scene, scenes, mapData, onSelect, onCreate, onRename, onSetBackground, onSetAudio }) {
    const [picking, setPicking] = useState(false);

    const children = scenes
        .filter((s) => s.parent_id === scene.id)
        .sort((a, b) => a.position - b.position);

    const backgrounds = Object.fromEntries((mapData?.scenes ?? []).map((s) => [s.id, s.background]));
    const inherited = ancestorBackground(
        scene.parent_id != null ? scenes.find((s) => s.id === scene.parent_id) : null,
        scenes,
    );
    const ownBackground = scene.background?.asset_path ?? null;

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
            <header className="animate-rise flex items-start justify-between gap-4">
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-amber-200 uppercase">📁 Group</span>
                    </div>
                    <EditableTitle value={scene.title} onRename={onRename} />
                    <p className="mt-1 max-w-lg text-xs text-violet-300/50">
                        A group is a folder — chapters, episodes, acts. It holds scenes (and other groups),
                        and its settings cascade to everything inside.
                    </p>
                </div>
            </header>

            <section className="glass animate-rise max-w-2xl rounded-2xl p-5">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-amber-300/70 uppercase">Group defaults</h2>
                <p className="mt-0.5 mb-4 text-xs text-violet-300/50">
                    Every scene inside starts with this background, unless it sets its own.
                </p>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setPicking(true)}
                        className="group relative h-28 w-48 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/15 bg-ink-900 transition hover:border-amber-300/50"
                        title="Choose default background"
                    >
                        {ownBackground ? (
                            <img src={fileUrl(gameId, ownBackground)} alt="" className="size-full object-cover transition group-hover:scale-105" />
                        ) : inherited ? (
                            <>
                                <img src={fileUrl(gameId, inherited)} alt="" className="size-full object-cover opacity-40" />
                                <span className="absolute inset-x-0 bottom-1 text-center text-[9px] font-bold text-white/70">inherited from parent group</span>
                            </>
                        ) : (
                            <span className="flex size-full flex-col items-center justify-center gap-1 text-violet-300/50">
                                <span className="text-2xl">🖼</span>
                                <span className="text-[10px] font-semibold">Set default background</span>
                            </span>
                        )}
                    </button>
                    <div className="space-y-2">
                        <Button variant="ghost" className="!py-1.5 text-xs" onClick={() => setPicking(true)}>
                            {ownBackground ? 'Change background' : 'Choose background'}
                        </Button>
                        {ownBackground && (
                            <Button variant="subtle" className="!py-1.5 text-xs" onClick={() => onSetBackground(null)}>
                                ✕ Remove (inherit{inherited ? ' from parent' : ' nothing'})
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                    <h3 className="text-[10px] font-bold tracking-[0.2em] text-amber-300/70 uppercase">🎵 Background music</h3>
                    <p className="mt-0.5 mb-3 text-xs text-violet-300/50">
                        Plays through every scene inside. A scene or sub-group with its own music overrides
                        it, then this track resumes.
                    </p>
                    <GroupMusic gameId={gameId} audio={scene.audio} onSetAudio={onSetAudio} />
                </div>
            </section>

            <section className="animate-rise">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[10px] font-bold tracking-[0.2em] text-violet-300/70 uppercase">
                        Inside this group · {children.length}
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => onCreate(scene.id, null, false)}>🎬 Add scene</Button>
                        <Button variant="ghost" className="!px-2.5 !py-1 text-xs !text-amber-200/90" onClick={() => onCreate(scene.id, null, true)}>📁 Add group</Button>
                    </div>
                </div>

                {children.length === 0 ? (
                    <div className="glass flex max-w-2xl flex-col items-center gap-2 rounded-2xl border-dashed p-10 text-center">
                        <span className="text-3xl opacity-60">📂</span>
                        <p className="text-sm font-semibold text-white">This group is empty</p>
                        <p className="text-xs text-violet-300/50">Add scenes here, or drag existing ones in via their ⋯ menu → Move to.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                        {children.map((child, i) => (
                            <button
                                key={child.id}
                                onClick={() => onSelect(child.id)}
                                className="glass card-lift animate-rise cursor-pointer overflow-hidden rounded-2xl text-left"
                                style={{ animationDelay: `${i * 40}ms` }}
                            >
                                <div className="relative h-24 bg-ink-900">
                                    {backgrounds[child.id] ? (
                                        <img src={fileUrl(gameId, backgrounds[child.id])} alt="" className="size-full object-cover" />
                                    ) : (
                                        <div className="stage-empty flex size-full items-center justify-center text-2xl opacity-70">
                                            {child.is_group ? '📁' : '🎬'}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
                                </div>
                                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                    <span className="truncate text-xs font-bold text-white">{child.title}</span>
                                    <span className="text-[9px] whitespace-nowrap text-violet-300/50">
                                        {child.is_group ? 'group' : child.type}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <AssetPicker
                gameId={gameId}
                category="background"
                open={picking}
                onClose={() => setPicking(false)}
                onPick={(path) => { onSetBackground(path); setPicking(false); }}
            />
        </div>
    );
}

function EditableTitle({ value, onRename }) {
    const [text, setText] = useState(value);

    useEffect(() => setText(value), [value]);

    return (
        <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => (text.trim() && text.trim() !== value ? onRename(text.trim()) : setText(value))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            title="Click to rename"
            className="-mx-2 w-full max-w-md rounded-lg border border-transparent bg-transparent px-2 text-2xl font-bold tracking-tight text-white outline-none transition hover:border-white/15 focus:border-amber-300/50 focus:bg-white/5"
        />
    );
}

function GroupMusic({ gameId, audio, onSetAudio }) {
    const [volume, setVolume] = useState(audio?.volume ?? 1);

    useEffect(() => setVolume(audio?.volume ?? 1), [audio?.volume]);

    return (
        <div className="max-w-sm space-y-2.5">
            <Select
                value={audio ? audio.action : ''}
                onChange={(e) => {
                    const action = e.target.value;
                    onSetAudio(action === ''
                        ? null
                        : { action, asset_path: audio?.asset_path ?? null, loop: audio?.loop ?? true, volume: audio?.volume ?? 1 });
                }}
            >
                <option value="">Inherit from parent group</option>
                <option value="play">Play a track</option>
                <option value="stop">Silence</option>
            </Select>
            {audio?.action === 'play' && (
                <>
                    <AssetField
                        gameId={gameId}
                        category="music"
                        value={audio.asset_path}
                        onChange={(path) => onSetAudio({ ...audio, asset_path: path })}
                    />
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-semibold text-violet-300/60 uppercase">Volume</span>
                        <input
                            type="range" min="0" max="1" step="0.05"
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            onPointerUp={() => onSetAudio({ ...audio, volume })}
                            className="flex-1 accent-amber-400"
                        />
                    </div>
                </>
            )}
        </div>
    );
}
