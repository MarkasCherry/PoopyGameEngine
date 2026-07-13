import { useEffect } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useAssets, useCharacters, useExportGame, useGame } from '../api/hooks';

const NAV = [
    { to: 'scenes', label: 'Story' },
    { to: 'map', label: 'Map' },
    { to: 'characters', label: 'Cast' },
    { to: 'assets', label: 'Assets' },
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
        <div className="flex h-screen flex-col">
            <header className="flex h-14 shrink-0 items-center gap-5 border-b border-white/5 px-4">
                <Link to="/" className="group flex items-center gap-2 text-violet-300/60 transition hover:text-white" title="All games">
                    <span className="transition group-hover:-translate-x-0.5">←</span>
                </Link>

                <div className="min-w-0 leading-tight">
                    <h1 className="truncate text-sm font-bold text-white" title={game?.title}>{game?.title ?? '…'}</h1>
                    <p className="truncate text-[10px] text-violet-300/40">games/{game?.slug}/game.json</p>
                </div>

                <nav className="mx-auto flex gap-0.5 rounded-xl bg-ink-900 p-1">
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                                    isActive ? 'bg-ink-800 text-white' : 'text-violet-300/60 hover:text-white'
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        onClick={() => exportGame.mutate()}
                        disabled={exportGame.isPending}
                        className="glass cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:border-white/20 disabled:opacity-50"
                    >
                        {exportGame.isPending ? 'Exporting…' : exportGame.isSuccess ? '✓ Exported' : 'Export game.json'}
                    </button>
                    <Link
                        to={`/games/${gameId}/play`}
                        className="btn-glow flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
                    >
                        ▷ Play
                    </Link>
                </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
