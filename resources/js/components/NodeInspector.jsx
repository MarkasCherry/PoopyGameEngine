import { useEffect, useMemo, useState } from 'react';
import { Field, IconButton, Input, Select, TextArea, Toggle } from './ui';
import { AssetField } from './AssetPicker';
import { ColorInput, Button } from './ui';
import { buildTree } from './SceneTree';

const MIN_WIDTH = 300;
const MAX_WIDTH = 1120;

function useInspectorWidth() {
    const [width, setWidth] = useState(() => {
        const stored = Number(localStorage.getItem('nf.inspector-width'));
        return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : 320;
    });

    useEffect(() => localStorage.setItem('nf.inspector-width', String(width)), [width]);

    const startResize = (e) => {
        e.preventDefault();
        const onMove = (ev) => setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX)));
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return { width, startResize };
}

export default function NodeInspector({ gameId, node, draft, status, retry, patchData, patchNode, characters, scenes, onDelete }) {
    const { width, startResize } = useInspectorWidth();

    return (
        <aside className="glass-deep relative flex shrink-0 flex-col border-l border-white/5" style={{ width }}>
            <div
                onPointerDown={startResize}
                title="Drag to resize"
                className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize transition hover:bg-fuchsia-400/30"
            />

            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <h3 className="text-sm font-bold text-white capitalize">{node.type}</h3>
                <SaveStatus status={status} retry={retry} />
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
                <Section title="Scene">
                    <Field label="Name">
                        <Input
                            value={draft.title ?? ''}
                            onChange={(e) => patchNode({ title: e.target.value })}
                            placeholder={node.title}
                        />
                    </Field>
                </Section>

                {node.type === 'dialogue' && <DialogueExtras draft={draft} patchData={patchData} characters={characters} />}
                {node.type === 'choice' && <ChoiceTargets draft={draft} patchData={patchData} scenes={scenes} />}
                {node.type === 'video' && (
                    <Section title="Playback">
                        <div className="flex gap-5">
                            <Toggle checked={draft.data.loop ?? false} onChange={(loop) => patchData({ loop })} label="Loop" />
                            <Toggle checked={draft.data.skippable ?? true} onChange={(skippable) => patchData({ skippable })} label="Skippable" />
                        </div>
                    </Section>
                )}

                {draft.background && (
                    <Section title="Background transition">
                        <Select
                            value={draft.background.transition ?? 'fade'}
                            onChange={(e) => patchNode({ background: { ...draft.background, transition: e.target.value } })}
                        >
                            <option value="fade">Fade</option>
                            <option value="cut">Cut</option>
                            <option value="slide">Slide</option>
                        </Select>
                    </Section>
                )}

                <Section title="Background music" subtitle="Plays during this scene only. Otherwise the group's music continues.">
                    <Select
                        value={draft.audio ? draft.audio.action : ''}
                        onChange={(e) => {
                            const action = e.target.value;
                            patchNode({
                                audio: action === ''
                                    ? null
                                    : { action, asset_path: draft.audio?.asset_path ?? null, loop: draft.audio?.loop ?? true, volume: draft.audio?.volume ?? 1 },
                            });
                        }}
                    >
                        <option value="">Inherit from group</option>
                        <option value="play">Play a track</option>
                        <option value="stop">Silence</option>
                    </Select>
                    {draft.audio?.action === 'play' && (
                        <>
                            <AssetField
                                gameId={gameId}
                                category="music"
                                value={draft.audio.asset_path}
                                onChange={(path) => patchNode({ audio: { ...draft.audio, asset_path: path } })}
                            />
                            <div className="flex items-center justify-between gap-3">
                                <Toggle checked={draft.audio.loop ?? true} onChange={(loop) => patchNode({ audio: { ...draft.audio, loop } })} label="Loop" />
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={draft.audio.volume ?? 1}
                                    onChange={(e) => patchNode({ audio: { ...draft.audio, volume: Number(e.target.value) } })}
                                    className="flex-1 accent-fuchsia-500"
                                    title="Volume"
                                />
                            </div>
                        </>
                    )}
                </Section>

                <Section title="Effects" subtitle="Fire when this scene starts.">
                    <EffectsEditor gameId={gameId} effects={draft.effects ?? []} onChange={(effects) => patchNode({ effects })} />
                </Section>

                <Section title="Flow">
                    <Toggle checked={draft.auto_advance} onChange={(auto_advance) => patchNode({ auto_advance })} label="Auto-advance" />
                    {draft.auto_advance && (
                        <Field label="Delay (ms)">
                            <Input
                                type="number" min="0"
                                value={draft.auto_advance_delay_ms ?? ''}
                                onChange={(e) => patchNode({ auto_advance_delay_ms: e.target.value === '' ? null : Number(e.target.value) })}
                                placeholder="0"
                            />
                        </Field>
                    )}
                </Section>

                <Button variant="danger" className="w-full !py-1.5 text-xs" onClick={onDelete}>Delete this scene</Button>
            </div>
        </aside>
    );
}

function SaveStatus({ status, retry }) {
    if (status === 'error') {
        return (
            <button onClick={retry} className="cursor-pointer rounded-lg bg-rose-500/20 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/30">
                ⚠ Retry save
            </button>
        );
    }

    return (
        <span className={`text-[10px] font-bold tracking-wide uppercase ${status === 'saved' ? 'text-emerald-300/80' : 'text-violet-300/50'}`}>
            {status === 'saved' ? '✓ Saved' : status === 'saving' ? 'Saving…' : 'Editing…'}
        </span>
    );
}

function Section({ title, subtitle, children }) {
    return (
        <section className="space-y-2.5">
            <div>
                <h4 className="text-[10px] font-bold tracking-[0.18em] text-fuchsia-300/70 uppercase">{title}</h4>
                {subtitle && <p className="mt-0.5 text-[11px] text-violet-300/40">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

function DialogueExtras({ draft, patchData, characters }) {
    const character = characters.find((c) => c.id === draft.data.character_id);

    return (
        <Section title="Dialogue" subtitle="Mirrors the preview — edit in either place.">
            <Field label="Speaker">
                <Select
                    value={draft.data.character_id ?? ''}
                    onChange={(e) => patchData({ character_id: e.target.value === '' ? null : Number(e.target.value), appearance_id: null })}
                >
                    <option value="">📜 Narrator / anonymous</option>
                    {characters.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </Select>
            </Field>
            {!draft.data.character_id && (
                <>
                    <Field label="Anonymous speaker name" hint="Empty = plain narration.">
                        <Input
                            value={draft.data.speaker_name ?? ''}
                            onChange={(e) => patchData({ speaker_name: e.target.value || null })}
                            placeholder="???"
                        />
                    </Field>
                    {draft.data.speaker_name && (
                        <Field label="Speaker color">
                            <ColorInput
                                value={draft.data.speaker_color}
                                onChange={(speaker_color) => patchData({ speaker_color })}
                            />
                        </Field>
                    )}
                </>
            )}
            {character && (
                <Field label="Appearance" hint="Overrides cascade over character defaults.">
                    <Select
                        value={draft.data.appearance_id ?? ''}
                        onChange={(e) => patchData({ appearance_id: e.target.value === '' ? null : Number(e.target.value) })}
                    >
                        <option value="">Character default</option>
                        {character.appearances.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}{a.scope === 'scene' ? ' (scene)' : ''}</option>
                        ))}
                    </Select>
                </Field>
            )}
            <Field label="Text">
                <TextArea
                    value={draft.data.text ?? ''}
                    onChange={(e) => patchData({ text: e.target.value })}
                    placeholder="Type the line exactly as the player will read it…"
                    rows={4}
                />
            </Field>
            <Field label="Name tag position">
                <div className="grid grid-cols-3 gap-1">
                    {['left', 'center', 'right'].map((pos) => (
                        <button
                            key={pos}
                            onClick={() => patchData({ speaker_position: pos })}
                            className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold capitalize transition ${
                                (draft.data.speaker_position ?? 'center') === pos
                                    ? 'border-fuchsia-400/50 bg-fuchsia-500/20 text-white'
                                    : 'border-white/10 text-violet-300/60 hover:border-white/25'
                            }`}
                        >
                            {pos}
                        </button>
                    ))}
                </div>
            </Field>
        </Section>
    );
}

function ChoiceTargets({ draft, patchData, scenes }) {
    const options = draft.data.options ?? [];
    const flat = useMemo(() => {
        const byParent = buildTree(scenes);
        const rows = [];
        const walk = (parentId, depth) => {
            for (const scene of byParent.get(parentId) ?? []) {
                rows.push({ scene, depth });
                walk(scene.id, depth + 1);
            }
        };
        walk(null, 0);
        return rows;
    }, [scenes]);

    const update = (i, patch) => patchData({ options: options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

    return (
        <Section title="Choice" subtitle="Mirrors the preview — edit in either place.">
            <Field label="Prompt">
                <Input
                    value={draft.data.prompt ?? ''}
                    onChange={(e) => patchData({ prompt: e.target.value || null })}
                    placeholder="Prompt shown to the player (optional)…"
                />
            </Field>
            {options.map((option, i) => (
                <div key={option.id ?? i} className="glass space-y-1.5 rounded-xl p-2.5">
                    <Input
                        value={option.text ?? ''}
                        onChange={(e) => update(i, { text: e.target.value })}
                        placeholder={`Option ${i + 1}…`}
                    />
                    <Select
                        value={option.target_scene_id ?? ''}
                        onChange={(e) => update(i, { target_scene_id: e.target.value === '' ? null : Number(e.target.value) })}
                    >
                        <option value="">→ Continue to next scene in order</option>
                        {flat.map(({ scene, depth }) => (
                            <option key={scene.id} value={scene.id}>
                                {' '.repeat(depth * 3)}→ {scene.title}
                            </option>
                        ))}
                    </Select>
                </div>
            ))}
            {options.length === 0 && <p className="text-xs text-violet-300/50">Add options in the preview first.</p>}
        </Section>
    );
}

const EFFECT_DEFAULTS = {
    sfx: { type: 'sfx', asset_path: null, options: { volume: 1 } },
    screen_flash: { type: 'screen_flash', options: { color: '#ffffff', duration_ms: 250 } },
    screen_shake: { type: 'screen_shake', options: { intensity: 0.5, duration_ms: 400 } },
};

function EffectsEditor({ gameId, effects, onChange }) {
    const update = (index, patch) => onChange(effects.map((fx, i) => (i === index ? { ...fx, ...patch } : fx)));
    const updateOptions = (index, patch) => update(index, { options: { ...effects[index].options, ...patch } });

    return (
        <div className="space-y-2">
            {effects.map((fx, i) => (
                <div key={i} className="glass space-y-2 rounded-xl p-2.5">
                    <div className="flex items-center gap-2">
                        <Select value={fx.type} onChange={(e) => onChange(effects.map((f, j) => (j === i ? structuredClone(EFFECT_DEFAULTS[e.target.value]) : f)))}>
                            <option value="sfx">🔊 Sound effect</option>
                            <option value="screen_flash">⚡ Screen flash</option>
                            <option value="screen_shake">〰️ Screen shake</option>
                        </Select>
                        <IconButton onClick={() => onChange(effects.filter((_, j) => j !== i))} title="Remove effect">✕</IconButton>
                    </div>
                    {fx.type === 'sfx' && (
                        <AssetField gameId={gameId} category="sfx" value={fx.asset_path} onChange={(asset_path) => update(i, { asset_path })} />
                    )}
                    {fx.type === 'screen_flash' && (
                        <div className="flex items-center gap-2">
                            <ColorInput value={fx.options?.color ?? '#ffffff'} onChange={(color) => updateOptions(i, { color })} allowEmpty={false} />
                            <Input type="number" min="0" value={fx.options?.duration_ms ?? 250} onChange={(e) => updateOptions(i, { duration_ms: Number(e.target.value) })} title="Duration (ms)" />
                        </div>
                    )}
                    {fx.type === 'screen_shake' && (
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min="0.1" max="1" step="0.1"
                                value={fx.options?.intensity ?? 0.5}
                                onChange={(e) => updateOptions(i, { intensity: Number(e.target.value) })}
                                className="flex-1 accent-fuchsia-500"
                                title="Intensity"
                            />
                            <Input type="number" min="0" value={fx.options?.duration_ms ?? 400} onChange={(e) => updateOptions(i, { duration_ms: Number(e.target.value) })} title="Duration (ms)" />
                        </div>
                    )}
                </div>
            ))}
            <Button variant="ghost" className="w-full !py-1.5 text-xs" onClick={() => onChange([...effects, structuredClone(EFFECT_DEFAULTS.sfx)])}>
                + Add effect
            </Button>
        </div>
    );
}
