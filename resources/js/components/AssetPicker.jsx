import { useRef, useState } from 'react';
import { useAssets, useUploadAsset } from '../api/hooks';
import { Button, EmptyState, Modal, Spinner } from './ui';

const CATEGORY_LABELS = {
    background: 'Backgrounds',
    music: 'Music',
    sfx: 'Sound effects',
    video: 'Video',
};

export default function AssetPicker({ gameId, category, open, onClose, onPick }) {
    const { data: assets, isLoading } = useAssets(open ? gameId : null, category);
    const upload = useUploadAsset(gameId);
    const fileRef = useRef(null);

    const onFile = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            upload.mutate({ file, category }, { onSuccess: (asset) => onPick(asset.path) });
        }
        e.target.value = '';
    };

    const isImage = category === 'background';

    return (
        <Modal open={open} onClose={onClose} title={`Pick from ${CATEGORY_LABELS[category] ?? category}`} wide>
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-violet-300/60">Stored in your game folder — pick one or upload new.</p>
                <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
                    {upload.isPending ? 'Uploading…' : '⇧ Upload'}
                </Button>
                <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
            </div>

            {isLoading ? (
                <Spinner />
            ) : (assets ?? []).length === 0 ? (
                <EmptyState icon="🗂️" title="Nothing here yet" subtitle="Upload a file to use it in your scenes." />
            ) : (
                <div className={isImage ? 'grid grid-cols-3 gap-3' : 'space-y-1.5'}>
                    {assets.map((asset) =>
                        isImage ? (
                            <button
                                key={asset.path}
                                onClick={() => onPick(asset.path)}
                                className="glass card-lift group cursor-pointer overflow-hidden rounded-xl text-left"
                            >
                                <div className="h-28 w-full overflow-hidden bg-ink-900">
                                    <img src={asset.url} alt={asset.name} className="size-full object-cover transition group-hover:scale-105" />
                                </div>
                                <div className="truncate px-3 py-2 text-xs text-violet-100">{asset.name}</div>
                            </button>
                        ) : (
                            <button
                                key={asset.path}
                                onClick={() => onPick(asset.path)}
                                className="glass flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left transition hover:border-fuchsia-400/40"
                            >
                                <span>{category === 'video' ? '🎥' : '🎵'}</span>
                                <span className="flex-1 truncate text-sm text-violet-100">{asset.name}</span>
                                <span className="text-xs text-violet-300/40">{(asset.size / 1024).toFixed(0)} KB</span>
                            </button>
                        ),
                    )}
                </div>
            )}
        </Modal>
    );
}

export function AssetField({ gameId, category, value, onChange, placeholder }) {
    const [picking, setPicking] = useState(false);

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setPicking(true)}
                className="glass min-w-0 flex-1 cursor-pointer truncate rounded-xl px-3.5 py-2.5 text-left text-sm transition hover:border-fuchsia-400/40"
            >
                {value ? (
                    <span className="text-violet-100">{value.split('/').pop()}</span>
                ) : (
                    <span className="text-violet-300/40">{placeholder ?? 'Choose asset…'}</span>
                )}
            </button>
            {value && (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="cursor-pointer rounded-lg px-2 py-1 text-xs text-violet-300/50 hover:bg-white/10 hover:text-white"
                >
                    ✕
                </button>
            )}
            <AssetPicker
                gameId={gameId}
                category={category}
                open={picking}
                onClose={() => setPicking(false)}
                onPick={(path) => { onChange(path); setPicking(false); }}
            />
        </div>
    );
}
