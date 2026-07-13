import { useEffect, useRef, useState } from 'react';
import { fileUrl } from '../api/hooks';
import { resolveAppearance, resolveSpeaker } from '../lib/resolve';
import AssetPicker from './AssetPicker';
import { IconButton } from './ui';

export default function Stage({ gameId, draft, node, characters, resolvedBackground, patchData, patchNode }) {
    const stageRef = useRef(null);
    const [selectedSprite, setSelectedSprite] = useState(null);
    const [pickingBackground, setPickingBackground] = useState(false);
    const [addingCharacter, setAddingCharacter] = useState(false);

    useEffect(() => setSelectedSprite(null), [node.id]);

    const backgroundPath = draft.background?.asset_path ?? resolvedBackground;
    const sprites = draft.data.sprites ?? [];

    const updateSprite = (index, patch) =>
        patchData({ sprites: sprites.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

    const addSprite = (characterId) => {
        const slots = [0.5, 0.22, 0.78, 0.35, 0.65];
        patchData({
            sprites: [...sprites, {
                character_id: characterId,
                appearance_id: null,
                x: slots[sprites.length % slots.length],
                y: 0,
                scale: 0.85,
                flip: false,
            }],
        });
        setSelectedSprite(sprites.length);
        setAddingCharacter(false);
    };

    return (
        <div className="relative">
            <div
                ref={stageRef}
                className="stage-frame relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_80px_rgba(3,1,12,0.8)]"
                onPointerDown={(e) => {
                    if (e.target === e.currentTarget || e.target.dataset.stagebg !== undefined) setSelectedSprite(null);
                }}
            >
                {backgroundPath ? (
                    <img
                        data-stagebg
                        src={fileUrl(gameId, backgroundPath)}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                        draggable={false}
                    />
                ) : (
                    <div data-stagebg className="stage-empty absolute inset-0" />
                )}

                {node.type === 'dialogue' && (
                    <>
                        {sprites.map((sprite, i) => (
                            <StageSprite
                                key={i}
                                sprite={sprite}
                                characters={characters}
                                stageRef={stageRef}
                                selected={selectedSprite === i}
                                onSelect={() => setSelectedSprite(i)}
                                onChange={(patch) => updateSprite(i, patch)}
                                onRemove={() => {
                                    patchData({ sprites: sprites.filter((_, j) => j !== i) });
                                    setSelectedSprite(null);
                                }}
                            />
                        ))}
                        <DialogueOverlay draft={draft} characters={characters} patchData={patchData} />
                    </>
                )}

                {node.type === 'choice' && (
                    <ChoiceOverlay gameId={gameId} draft={draft} patchData={patchData} />
                )}

                {node.type === 'video' && (
                    <VideoOverlay gameId={gameId} draft={draft} patchData={patchData} />
                )}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <div className="pointer-events-auto flex gap-1.5">
                    {node.type === 'dialogue' && (
                        <div className="relative">
                            <StageButton onClick={() => setAddingCharacter((v) => !v)} title="Put a character on stage">
                                🎭 Add character
                            </StageButton>
                            {addingCharacter && (
                                <div className="glass-deep animate-pop absolute top-10 left-0 z-30 w-52 rounded-xl p-1.5">
                                    {characters.length === 0 && (
                                        <p className="px-3 py-2 text-xs text-violet-300/60">No characters yet — create one in the Characters tab.</p>
                                    )}
                                    {characters.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => addSprite(c.id)}
                                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                                        >
                                            <span className="size-2 rounded-full" style={{ background: c.text_color ?? '#5865f2' }} />
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="pointer-events-auto flex gap-1.5">
                    <StageButton onClick={() => setPickingBackground(true)} title="Change background from this node on">
                        🖼 {draft.background ? 'Background set here' : backgroundPath ? 'Inherited background' : 'Set background'}
                    </StageButton>
                    {draft.background && (
                        <StageButton onClick={() => patchNode({ background: null })} title="Remove background change">✕</StageButton>
                    )}
                </div>
            </div>

            <AssetPicker
                gameId={gameId}
                category="background"
                open={pickingBackground}
                onClose={() => setPickingBackground(false)}
                onPick={(path) => {
                    patchNode({ background: { asset_path: path, transition: draft.background?.transition ?? 'fade' } });
                    setPickingBackground(false);
                }}
            />
        </div>
    );
}

function StageButton({ children, ...props }) {
    return (
        <button
            className="glass cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition hover:border-fuchsia-300/40 hover:bg-white/15"
            {...props}
        >
            {children}
        </button>
    );
}

function StageSprite({ sprite, characters, stageRef, selected, onSelect, onChange, onRemove }) {
    const resolved = resolveAppearance(characters, sprite.character_id, sprite.appearance_id);
    const dragState = useRef(null);

    const x = sprite.x ?? 0.5;
    const y = sprite.y ?? 0;
    const scale = sprite.scale ?? 0.85;

    const startDrag = (e, mode) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect();
        const rect = stageRef.current.getBoundingClientRect();
        dragState.current = { mode, rect, startX: e.clientX, startY: e.clientY, x, y, scale };
        e.target.setPointerCapture(e.pointerId);
    };

    const onMove = (e) => {
        const s = dragState.current;
        if (!s) return;

        const dx = (e.clientX - s.startX) / s.rect.width;
        const dy = (e.clientY - s.startY) / s.rect.height;

        if (s.mode === 'move') {
            onChange({
                x: Math.min(1.4, Math.max(-0.4, s.x + dx)),
                y: Math.min(0.9, Math.max(-0.4, s.y - dy)),
            });
        } else {
            onChange({ scale: Math.min(3.5, Math.max(0.1, s.scale - dy * 1.5)) });
        }
    };

    const endDrag = () => (dragState.current = null);

    return (
        <div
            className="absolute"
            style={{
                left: `${x * 100}%`,
                bottom: `${y * 100}%`,
                height: `${scale * 100}%`,
                transform: 'translateX(-50%)',
                zIndex: selected ? 20 : 10,
            }}
        >
            <div
                className={`group relative h-full cursor-grab touch-none active:cursor-grabbing ${selected ? '' : 'hover:brightness-110'}`}
                onPointerDown={(e) => startDrag(e, 'move')}
                onPointerMove={onMove}
                onPointerUp={endDrag}
                onWheel={(e) => {
                    if (!selected) return;
                    e.preventDefault();
                    onChange({ scale: Math.min(3.5, Math.max(0.1, scale * (1 - e.deltaY * 0.001))) });
                }}
            >
                {resolved.image ? (
                    <img
                        src={resolved.image}
                        alt={resolved.name}
                        draggable={false}
                        className="h-full w-auto max-w-none select-none"
                        style={{
                            transform: sprite.flip ? 'scaleX(-1)' : undefined,
                            filter: selected
                                ? 'drop-shadow(0 0 14px rgba(88,101,242,0.65)) drop-shadow(0 8px 24px rgba(0,0,0,0.5))'
                                : 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
                        }}
                    />
                ) : (
                    <div
                        className={`flex h-full w-24 items-end justify-center rounded-t-full border border-white/15 bg-gradient-to-b from-white/15 to-white/5 pb-4 text-xs font-bold ${selected ? 'ring-2 ring-fuchsia-400' : ''}`}
                        style={{ color: resolved.color ?? '#fff' }}
                    >
                        {resolved.name ?? '?'}
                    </div>
                )}
            </div>

            {selected && (
                <>
                    <div className="glass-deep animate-pop absolute -top-11 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl px-1.5 py-1 whitespace-nowrap">
                        <select
                            className="max-w-32 cursor-pointer rounded-md bg-transparent px-1 py-0.5 text-xs text-white outline-none [&>option]:bg-ink-900"
                            value={sprite.appearance_id ?? ''}
                            onChange={(e) => onChange({ appearance_id: e.target.value === '' ? null : Number(e.target.value) })}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <option value="">Default look</option>
                            {(resolved.character?.appearances ?? []).map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <IconButton title="Flip horizontally" className="!size-6 text-xs" onClick={() => onChange({ flip: !sprite.flip })}>⇋</IconButton>
                        <IconButton title="Remove from stage" className="!size-6 text-xs hover:!bg-rose-500/25 hover:!text-rose-200" onClick={onRemove}>✕</IconButton>
                    </div>
                    <div
                        className="absolute -top-2 -right-2 z-30 size-4 cursor-ns-resize touch-none rounded-full border-2 border-white bg-fuchsia-500 shadow-[0_0_10px_rgba(88,101,242,0.8)]"
                        title="Drag to resize"
                        onPointerDown={(e) => startDrag(e, 'resize')}
                        onPointerMove={onMove}
                        onPointerUp={endDrag}
                    />
                </>
            )}
        </div>
    );
}

function DialogueOverlay({ draft, characters, patchData }) {
    const speaker = resolveSpeaker(characters, draft.data);
    const [pickingSpeaker, setPickingSpeaker] = useState(false);
    const position = draft.data.speaker_position ?? 'center';
    const align = { left: 'items-start', center: 'items-center', right: 'items-end' }[position];

    return (
        <div className={`absolute inset-x-0 bottom-0 z-30 flex flex-col ${align} gap-0 p-4 pt-10`}
            style={{ background: 'linear-gradient(to top, rgba(6,4,16,0.92) 20%, rgba(6,4,16,0.55) 65%, transparent)' }}
        >
            <div className="relative -mb-3 ml-0 self-auto">
                <button
                    onClick={() => setPickingSpeaker((v) => !v)}
                    className="glass-deep relative z-10 cursor-pointer rounded-t-xl rounded-b-none border-b-0 px-4 py-1.5 text-sm font-bold tracking-wide transition hover:brightness-125"
                    style={{ color: speaker.color }}
                    title="Change speaker"
                >
                    {speaker.name ?? 'Narrator'}
                    <span className="ml-1.5 text-[9px] text-white/40">▾</span>
                </button>
                {pickingSpeaker && (
                    <div className="glass-deep animate-pop absolute bottom-full z-40 mb-1 w-56 rounded-xl p-1.5">
                        <button
                            onClick={() => { patchData({ character_id: null, appearance_id: null }); setPickingSpeaker(false); }}
                            className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-violet-200 transition hover:bg-white/10"
                        >
                            📜 Narrator / anonymous
                        </button>
                        {characters.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => { patchData({ character_id: c.id, appearance_id: null }); setPickingSpeaker(false); }}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                            >
                                <span className="size-2 rounded-full" style={{ background: c.text_color ?? '#5865f2' }} />
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-deep w-full rounded-2xl px-5 py-4">
                <textarea
                    value={draft.data.text ?? ''}
                    onChange={(e) => patchData({ text: e.target.value })}
                    placeholder="Type the line exactly as the player will read it…"
                    rows={Math.max(2, (draft.data.text ?? '').split('\n').length)}
                    className="w-full resize-none bg-transparent text-base leading-relaxed text-white/95 placeholder:text-white/25 outline-none"
                />
                {!draft.data.character_id && (
                    <div className="mt-1 flex items-center gap-2 border-t border-white/10 pt-2">
                        <input
                            value={draft.data.speaker_name ?? ''}
                            onChange={(e) => patchData({ speaker_name: e.target.value || null })}
                            placeholder="Anonymous speaker name (empty = narration)"
                            className="flex-1 bg-transparent text-xs text-violet-200 placeholder:text-white/25 outline-none"
                        />
                        <label className="relative size-5 shrink-0 cursor-pointer overflow-hidden rounded-md border border-white/20" title="Speaker color">
                            <span className="absolute inset-0" style={{ background: draft.data.speaker_color ?? '#aeb6fb' }} />
                            <input
                                type="color"
                                value={draft.data.speaker_color ?? '#aeb6fb'}
                                onChange={(e) => patchData({ speaker_color: e.target.value })}
                                className="absolute -inset-2 cursor-pointer opacity-0"
                            />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}

function ChoiceOverlay({ draft, patchData }) {
    const options = draft.data.options ?? [];
    const update = (i, patch) => patchData({ options: options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ink-950/45 p-8 backdrop-blur-[2px]">
            <input
                value={draft.data.prompt ?? ''}
                onChange={(e) => patchData({ prompt: e.target.value || null })}
                placeholder="Prompt shown to the player (optional)…"
                className="mb-2 w-full max-w-xl bg-transparent text-center text-xl font-bold text-white drop-shadow placeholder:text-white/30 outline-none"
            />
            {options.map((option, i) => (
                <div key={option.id ?? i} className="group flex w-full max-w-md items-center gap-2">
                    <div className="glass flex-1 rounded-xl px-4 py-2.5 transition group-hover:border-amber-300/40">
                        <input
                            value={option.text ?? ''}
                            onChange={(e) => update(i, { text: e.target.value })}
                            placeholder={`Option ${i + 1}…`}
                            className="w-full bg-transparent text-center text-sm font-semibold text-amber-100 placeholder:text-white/25 outline-none"
                        />
                    </div>
                    <IconButton
                        title="Remove option"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => patchData({ options: options.filter((_, j) => j !== i) })}
                    >
                        ✕
                    </IconButton>
                </div>
            ))}
            <button
                onClick={() => patchData({ options: [...options, { text: '' }] })}
                className="mt-1 cursor-pointer rounded-xl border border-dashed border-white/25 px-5 py-2 text-sm text-white/60 transition hover:border-amber-300/50 hover:text-amber-100"
            >
                + Add option
            </button>
            <p className="mt-2 text-[11px] text-white/35">Where each option leads is set in the panel on the right →</p>
        </div>
    );
}

function VideoOverlay({ gameId, draft, patchData }) {
    const [picking, setPicking] = useState(false);

    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-ink-950/60">
            {draft.data.asset_path ? (
                <video
                    key={draft.data.asset_path}
                    src={fileUrl(gameId, draft.data.asset_path)}
                    controls
                    muted
                    className="max-h-[70%] max-w-[80%] rounded-xl shadow-2xl"
                />
            ) : (
                <div className="text-6xl opacity-40">🎥</div>
            )}
            <StageButton onClick={() => setPicking(true)}>
                {draft.data.asset_path ? draft.data.asset_path.split('/').pop() : 'Choose video file…'}
            </StageButton>
            <AssetPicker
                gameId={gameId}
                category="video"
                open={picking}
                onClose={() => setPicking(false)}
                onPick={(path) => { patchData({ asset_path: path }); setPicking(false); }}
            />
        </div>
    );
}
