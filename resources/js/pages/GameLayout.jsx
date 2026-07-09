import { useEffect } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useAssets, useCharacters, useExportGame, useGame } from '../api/hooks';

const NAV = [
    { to: 'scenes', label: 'Studio', icon: '🎬' },
    { to: 'map', label: 'Story Map', icon: '🗺️' },
    { to: 'characters', label: 'Characters', icon: '🎭' },
    { to: 'assets', label: 'Assets', icon: '🗂️' },
];

function usePreloadImages(gameId) {
    const { data: characters } = useCharacters(gameId);
    const { data: assets } = useAssets(gameId, 'background');

    useEffect(() => {
        const urls = [
            ...(characters ?? []).flatMap((c) => c.appearances.map((a) => a.image_url)),
            ...(assets ?? []).map((a) => a.url),
        ].filter(Boolean);

        urls.forEach((url) => {
            const img = new Image();
            img.src = url;
        });
    }, [characters, assets]);
}

export default function GameLayout() {
    const { gameId } = useParams();
    const { data: game } = useGame(gameId);
    const exportGame = useExportGame(gameId);

    usePreloadImages(gameId);

    return (
        <div className="flex h-screen">
            <aside className="glass-deep z-10 flex w-60 shrink-0 flex-col border-r border-white/5 p-4">
                <Link to="/" className="group mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-violet-300/70 transition hover:bg-white/5 hover:text-white">
                    <span className="transition group-hover:-translate-x-0.5">←</span> All games
                </Link>
                <div className="mb-6 px-3">
                    <h1 className="text-gradient truncate text-xl font-bold tracking-tight" title={game?.title}>
                        {game?.title ?? '…'}
                    </h1>
                </div>
                <nav className="flex flex-col gap-1">
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                    isActive
                                        ? 'bg-gradient-to-r from-violet-600/40 to-fuchsia-600/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_16px_rgba(139,92,246,0.25)]'
                                        : 'text-violet-300/70 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="mt-auto space-y-2">
                    <Link
                        to={`/games/${gameId}/play`}
                        className="btn-glow flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white"
                    >
                        ▶ Play game
                    </Link>
                    <button
                        onClick={() => exportGame.mutate()}
                        disabled={exportGame.isPending}
                        className="glass w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:opacity-50"
                    >
                        {exportGame.isPending ? 'Exporting…' : exportGame.isSuccess ? '✓ game.json written' : '⇩ Export game.json'}
                    </button>
                    <div className="px-2 text-center text-[10px] text-violet-300/30">
                        games/{game?.slug}/game.json
                    </div>
                </div>
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
