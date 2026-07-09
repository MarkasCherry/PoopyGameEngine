import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { fileUrl } from '../api/hooks';
import Engine from '../engine/Engine';

function collectAssetPaths(game) {
    const paths = new Set();

    for (const scene of game.scenes) {
        if (scene.resolved_background) paths.add(scene.resolved_background);
        if (scene.background?.asset_path) paths.add(scene.background.asset_path);
    }

    for (const character of game.characters) {
        for (const appearance of character.appearances) {
            if (appearance.resolved.image) paths.add(appearance.resolved.image);
        }
    }

    return [...paths];
}

export default function PlayPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();

    const { data: game, isLoading, isError } = useQuery({
        queryKey: ['games', gameId, 'play'],
        queryFn: () => api.get(`/games/${gameId}/export`),
        staleTime: 0,
        gcTime: 0,
    });

    const [loaded, setLoaded] = useState(0);
    const [total, setTotal] = useState(null);

    useEffect(() => {
        if (!game) return;

        const paths = collectAssetPaths(game);
        setTotal(paths.length);
        setLoaded(0);

        if (paths.length === 0) return;

        let alive = true;
        paths.forEach((path) => {
            const img = new Image();
            const done = () => alive && setLoaded((n) => n + 1);
            img.onload = done;
            img.onerror = done;
            img.src = fileUrl(gameId, path);
        });

        return () => { alive = false; };
    }, [game, gameId]);

    const exit = () => navigate(`/games/${gameId}/scenes`);
    const ready = game && total !== null && loaded >= total;

    if (isError) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black">
                <p className="text-sm text-rose-300">Could not load the game build.</p>
                <button onClick={exit} className="glass cursor-pointer rounded-xl px-5 py-2 text-sm text-white">← Back to editor</button>
            </div>
        );
    }

    if (isLoading || !ready) {
        const progress = total ? Math.round((loaded / total) * 100) : 0;

        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black">
                <h1 className="text-xl font-bold tracking-[0.3em] text-white/80 uppercase">{game?.game.title ?? 'Loading'}</h1>
                <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${total ? progress : 20}%` }}
                    />
                </div>
                <p className="text-[11px] tracking-widest text-white/35 uppercase">
                    {total ? `Loading assets ${loaded}/${total}` : 'Building game…'}
                </p>
            </div>
        );
    }

    return <Engine game={game} resolveAsset={(path) => fileUrl(gameId, path)} onExit={exit} />;
}
