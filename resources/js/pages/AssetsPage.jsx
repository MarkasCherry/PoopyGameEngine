import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAssets, useDeleteAsset, useUploadAsset } from '../api/hooks';
import { Badge, Button, EmptyState, IconButton, Spinner } from '../components/ui';

const CATEGORIES = [
    { key: 'background', label: 'Backgrounds', icon: '🖼️' },
    { key: 'music', label: 'Music', icon: '🎵' },
    { key: 'sfx', label: 'SFX', icon: '🔊' },
    { key: 'video', label: 'Video', icon: '🎥' },
];

export default function AssetsPage() {
    const { gameId } = useParams();
    const [category, setCategory] = useState('background');
    const { data: assets, isLoading } = useAssets(gameId, category);
    const upload = useUploadAsset(gameId);
    const deleteAsset = useDeleteAsset(gameId);
    const fileRef = useRef(null);

    const onFiles = (e) => {
        [...(e.target.files ?? [])].forEach((file) => upload.mutate({ file, category }));
        e.target.value = '';
    };

    const isImage = category === 'background';

    return (
        <div className="px-8 py-8">
            <header className="animate-rise mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-gradient text-3xl font-bold tracking-tight">Assets</h1>
                    <p className="text-sm text-violet-300/50">Everything lives inside this game's own folder.</p>
                </div>
                <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
                    {upload.isPending ? 'Uploading…' : '⇧ Upload files'}
                </Button>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={onFiles} />
            </header>

            <div className="mb-6 flex gap-2">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => setCategory(c.key)}
                        className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition ${
                            category === c.key
                                ? 'btn-glow text-white'
                                : 'glass text-violet-300/70 hover:text-white'
                        }`}
                    >
                        {c.icon} {c.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <Spinner />
            ) : (assets ?? []).length === 0 ? (
                <EmptyState
                    icon="🗂️"
                    title={`No ${CATEGORIES.find((c) => c.key === category)?.label.toLowerCase()} yet`}
                    subtitle="Upload files here, or directly from any picker inside the scene editor."
                />
            ) : isImage ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {assets.map((asset, i) => (
                        <div key={asset.path} className="glass card-lift animate-rise group overflow-hidden rounded-2xl" style={{ animationDelay: `${i * 40}ms` }}>
                            <div className="h-36 overflow-hidden bg-ink-900">
                                <img src={asset.url} alt={asset.name} className="size-full object-cover transition group-hover:scale-105" />
                            </div>
                            <div className="flex items-center justify-between px-3 py-2">
                                <span className="truncate text-xs text-violet-100">{asset.name}</span>
                                <IconButton
                                    title="Delete asset"
                                    className="opacity-0 group-hover:opacity-100 hover:!bg-rose-500/20 hover:!text-rose-300"
                                    onClick={() => confirm(`Delete ${asset.name}?`) && deleteAsset.mutate(asset.path)}
                                >
                                    🗑
                                </IconButton>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="max-w-2xl space-y-2">
                    {assets.map((asset, i) => (
                        <div key={asset.path} className="glass animate-rise group flex items-center gap-3 rounded-xl px-4 py-3" style={{ animationDelay: `${i * 30}ms` }}>
                            <span className="text-lg">{category === 'video' ? '🎥' : '🎵'}</span>
                            <span className="flex-1 truncate text-sm text-violet-100">{asset.name}</span>
                            <Badge>{(asset.size / 1024).toFixed(0)} KB</Badge>
                            {(category === 'music' || category === 'sfx') && (
                                <audio controls src={asset.url} className="h-8" />
                            )}
                            <IconButton
                                title="Delete asset"
                                className="hover:!bg-rose-500/20 hover:!text-rose-300"
                                onClick={() => confirm(`Delete ${asset.name}?`) && deleteAsset.mutate(asset.path)}
                            >
                                🗑
                            </IconButton>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
