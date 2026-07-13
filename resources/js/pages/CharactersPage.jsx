import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    useCharacters, useCreateAppearance, useCreateCharacter, useDeleteAppearance,
    useDeleteCharacter, useScenes, useUpdateAppearance, useUpdateCharacter,
} from '../api/hooks';
import { Badge, Button, ColorInput, EmptyState, Field, IconButton, Input, Modal, Select, Spinner } from '../components/ui';

export default function CharactersPage() {
    const { gameId } = useParams();
    const { data: characters, isLoading } = useCharacters(gameId);
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const editing = characters?.find((c) => c.id === editingId);

    return (
        <div className="px-8 py-8">
            <header className="animate-rise mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-gradient text-3xl font-bold tracking-tight">Characters</h1>
                    <p className="text-sm text-violet-300/50">The cast of your story — each with named appearances.</p>
                </div>
                <Button onClick={() => setCreating(true)}>✦ New character</Button>
            </header>

            {isLoading ? (
                <Spinner />
            ) : characters?.length === 0 ? (
                <EmptyState
                    icon="🎭"
                    title="Nobody here yet"
                    subtitle="Characters carry a default name and text color, plus appearances that override them."
                    action={<Button onClick={() => setCreating(true)}>Create the first character</Button>}
                />
            ) : (
                <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
                    {characters.map((character, i) => (
                        <CharacterCard key={character.id} character={character} index={i} onEdit={() => setEditingId(character.id)} />
                    ))}
                </div>
            )}

            <CharacterFormModal gameId={gameId} open={creating} onClose={() => setCreating(false)} />
            {editing && <CharacterEditorModal gameId={gameId} character={editing} onClose={() => setEditingId(null)} />}
        </div>
    );
}

function CharacterCard({ character, index, onEdit }) {
    const defaultAppearance = character.appearances.find((a) => a.is_default) ?? character.appearances[0];

    return (
        <button
            onClick={onEdit}
            className="glass card-lift animate-rise group cursor-pointer overflow-hidden rounded-2xl text-left"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="relative flex h-44 items-end justify-center overflow-hidden bg-gradient-to-b from-ink-800 to-ink-900">
                {defaultAppearance?.image_url ? (
                    <img
                        src={defaultAppearance.image_url}
                        alt={character.name}
                        className="h-full object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition group-hover:scale-105"
                    />
                ) : (
                    <span className="pb-10 text-6xl opacity-40">👤</span>
                )}
                <div
                    className="absolute inset-x-0 bottom-0 h-16 opacity-60"
                    style={{ background: `linear-gradient(to top, ${character.text_color ?? '#5865f2'}33, transparent)` }}
                />
            </div>
            <div className="p-4">
                <div className="mb-1 flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: character.text_color ?? '#5865f2', boxShadow: `0 0 8px ${character.text_color ?? '#5865f2'}` }} />
                    <h2 className="truncate font-bold text-white">{character.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                    {character.type && <Badge tone="cyan">{character.type}</Badge>}
                    <Badge>{character.appearances.length} looks</Badge>
                </div>
            </div>
        </button>
    );
}

function CharacterFormModal({ gameId, open, onClose }) {
    const createCharacter = useCreateCharacter(gameId);
    const [form, setForm] = useState({ name: '', type: '', display_name: '', text_color: '#aeb6fb' });
    const [image, setImage] = useState(null);
    const patch = (p) => setForm((f) => ({ ...f, ...p }));

    const submit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', form.name);
        if (form.type) formData.append('type', form.type);
        if (form.display_name) formData.append('display_name', form.display_name);
        if (form.text_color) formData.append('text_color', form.text_color);
        if (image) formData.append('image', image);

        createCharacter.mutate(formData, {
            onSuccess: () => {
                setForm({ name: '', type: '', display_name: '', text_color: '#aeb6fb' });
                setImage(null);
                onClose();
            },
        });
    };

    return (
        <Modal open={open} onClose={onClose} title="New character">
            <form onSubmit={submit} className="space-y-4">
                <Field label="Name">
                    <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Aria" autoFocus required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Type" hint="e.g. protagonist, npc">
                        <Input value={form.type} onChange={(e) => patch({ type: e.target.value })} placeholder="protagonist" />
                    </Field>
                    <Field label="Display name" hint="Shown in dialogue if set">
                        <Input value={form.display_name} onChange={(e) => patch({ display_name: e.target.value })} placeholder={form.name || '—'} />
                    </Field>
                </div>
                <Field label="Default text color">
                    <ColorInput value={form.text_color} onChange={(text_color) => patch({ text_color })} allowEmpty={false} />
                </Field>
                <Field label="Default appearance image" hint="Optional — you can add more looks after creating.">
                    <ImageDrop image={image} onChange={setImage} />
                </Field>
                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={createCharacter.isPending || !form.name.trim()}>Create character</Button>
                </div>
            </form>
        </Modal>
    );
}

function ImageDrop({ image, onChange, currentUrl }) {
    const preview = image ? URL.createObjectURL(image) : currentUrl;

    return (
        <label className="glass flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-dashed p-3 transition hover:border-fuchsia-400/50">
            {preview ? (
                <img src={preview} alt="" className="max-h-40 rounded-lg object-contain" />
            ) : (
                <>
                    <span className="text-2xl">🖼️</span>
                    <span className="text-xs text-violet-300/60">Click to choose an image</span>
                </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
    );
}

function CharacterEditorModal({ gameId, character, onClose }) {
    const updateCharacter = useUpdateCharacter(gameId);
    const deleteCharacter = useDeleteCharacter(gameId);
    const [form, setForm] = useState({
        name: character.name,
        type: character.type ?? '',
        display_name: character.display_name ?? '',
        text_color: character.text_color,
    });
    const patch = (p) => setForm((f) => ({ ...f, ...p }));

    const saveDefaults = () => {
        updateCharacter.mutate({
            characterId: character.id,
            name: form.name,
            type: form.type || null,
            display_name: form.display_name || null,
            text_color: form.text_color || null,
        });
    };

    return (
        <Modal open onClose={onClose} title={`Edit ${character.name}`} wide>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-[0.18em] text-fuchsia-300/70 uppercase">Defaults</h3>
                    <Field label="Name">
                        <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
                    </Field>
                    <Field label="Type">
                        <Input value={form.type} onChange={(e) => patch({ type: e.target.value })} placeholder="npc" />
                    </Field>
                    <Field label="Display name" hint="Appearances can override this per look.">
                        <Input value={form.display_name} onChange={(e) => patch({ display_name: e.target.value })} placeholder={form.name} />
                    </Field>
                    <Field label="Text color">
                        <ColorInput value={form.text_color} onChange={(text_color) => patch({ text_color })} />
                    </Field>
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (confirm(`Delete ${character.name} and all appearances?`)) {
                                    deleteCharacter.mutate(character.id, { onSuccess: onClose });
                                }
                            }}
                        >
                            Delete
                        </Button>
                        <Button onClick={saveDefaults} disabled={updateCharacter.isPending}>
                            {updateCharacter.isPending ? 'Saving…' : 'Save defaults'}
                        </Button>
                    </div>
                </div>

                <AppearancesPanel gameId={gameId} character={character} />
            </div>
        </Modal>
    );
}

function AppearancesPanel({ gameId, character }) {
    const [editing, setEditing] = useState(null);
    const [adding, setAdding] = useState(false);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-[0.18em] text-fuchsia-300/70 uppercase">Appearances</h3>
                <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => setAdding(true)}>+ Add look</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {character.appearances.map((appearance) => (
                    <button
                        key={appearance.id}
                        onClick={() => setEditing(appearance)}
                        className="glass card-lift group cursor-pointer overflow-hidden rounded-xl text-left"
                    >
                        <div className="flex h-24 items-center justify-center overflow-hidden bg-ink-900/60">
                            {appearance.image_url ? (
                                <img src={appearance.image_url} alt={appearance.name} className="h-full object-contain" />
                            ) : (
                                <span className="text-3xl opacity-30">👤</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                            <span className="truncate text-xs font-semibold text-white">{appearance.name}</span>
                            {appearance.is_default ? (
                                <Badge tone="fuchsia">default</Badge>
                            ) : appearance.scope === 'scene' ? (
                                <Badge tone="amber">scene</Badge>
                            ) : (
                                <Badge>global</Badge>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {(adding || editing) && (
                <AppearanceFormModal
                    gameId={gameId}
                    character={character}
                    appearance={editing}
                    onClose={() => { setAdding(false); setEditing(null); }}
                />
            )}
        </div>
    );
}

function AppearanceFormModal({ gameId, character, appearance, onClose }) {
    const { data: scenes } = useScenes(gameId);
    const createAppearance = useCreateAppearance(gameId);
    const updateAppearance = useUpdateAppearance(gameId);
    const deleteAppearance = useDeleteAppearance(gameId);

    const [form, setForm] = useState({
        name: appearance?.name ?? '',
        scope: appearance?.scope ?? 'global',
        scene_id: appearance?.scene_id ?? '',
        display_name: appearance?.display_name ?? '',
        text_color: appearance?.text_color ?? null,
    });
    const [image, setImage] = useState(null);
    const patch = (p) => setForm((f) => ({ ...f, ...p }));

    const submit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('scope', form.scope);
        if (form.scope === 'scene' && form.scene_id) formData.append('scene_id', form.scene_id);
        if (form.display_name) formData.append('display_name', form.display_name);
        if (form.text_color) formData.append('text_color', form.text_color);
        if (image) formData.append('image', image);

        const mutation = appearance
            ? updateAppearance.mutateAsync({ appearanceId: appearance.id, formData })
            : createAppearance.mutateAsync({ characterId: character.id, formData });

        mutation.then(onClose).catch(() => {});
    };

    return (
        <Modal open onClose={onClose} title={appearance ? `Edit look: ${appearance.name}` : `New look for ${character.name}`}>
            <form onSubmit={submit} className="space-y-4">
                <Field label="Name" hint='e.g. "Happy", "Wounded", "Masquerade"'>
                    <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} autoFocus required />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Scope" hint="Scene-bound looks only surface in one scene.">
                        <Select value={form.scope} onChange={(e) => patch({ scope: e.target.value })} disabled={appearance?.is_default}>
                            <option value="global">Global — reusable everywhere</option>
                            <option value="scene">Scene-bound</option>
                        </Select>
                    </Field>
                    {form.scope === 'scene' && (
                        <Field label="Scene">
                            <Select value={form.scene_id} onChange={(e) => patch({ scene_id: e.target.value })} required>
                                <option value="">Choose…</option>
                                {(scenes ?? []).map((s) => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </Select>
                        </Field>
                    )}
                </div>

                <Field label="Display name override" hint={`Empty = inherit "${character.display_name || character.name}"`}>
                    <Input value={form.display_name} onChange={(e) => patch({ display_name: e.target.value })} placeholder="inherit" />
                </Field>
                <Field label="Text color override" hint="Empty = inherit character default">
                    <ColorInput value={form.text_color} onChange={(text_color) => patch({ text_color })} />
                </Field>
                <Field label="Image">
                    <ImageDrop image={image} onChange={setImage} currentUrl={appearance?.image_url} />
                </Field>

                <div className="flex items-center justify-between pt-1">
                    {appearance && !appearance.is_default ? (
                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => {
                                if (confirm(`Delete look "${appearance.name}"?`)) {
                                    deleteAppearance.mutate(appearance.id, { onSuccess: onClose });
                                }
                            }}
                        >
                            Delete
                        </Button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={createAppearance.isPending || updateAppearance.isPending || !form.name.trim()}>
                            {appearance ? 'Save look' : 'Create look'}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
