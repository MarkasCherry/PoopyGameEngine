import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Self-contained visual-novel runtime.
 * Consumes only the exported game document (engine schema 2.1) and an asset
 * resolver — no editor imports, so it can ship as a standalone build later.
 */
export default function Engine({ game, resolveAsset, onExit }) {
    const [phase, setPhase] = useState('menu');

    const startSceneId = game.start_scene_id;

    return (
        <div className="fixed inset-0 z-50 bg-black select-none">
            {phase === 'menu' && (
                <MenuScreen game={game} resolveAsset={resolveAsset} onStart={() => setPhase('playing')} onExit={onExit} canStart={!!startSceneId} />
            )}
            {phase === 'playing' && (
                <Player game={game} resolveAsset={resolveAsset} onFinished={() => setPhase('end')} onExit={onExit} />
            )}
            {phase === 'end' && (
                <EndScreen game={game} onMenu={() => setPhase('menu')} onExit={onExit} />
            )}
        </div>
    );
}

function MenuScreen({ game, resolveAsset, onStart, onExit, canStart }) {
    const startScene = game.scenes.find((s) => s.id === game.start_scene_id);
    const backdrop = startScene?.resolved_background
        ?? game.scenes.map((s) => s.resolved_background).find(Boolean);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onExit();
            if ((e.key === 'Enter' || e.key === ' ') && canStart) onStart();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onStart, onExit, canStart]);

    return (
        <div className="relative flex size-full flex-col items-center justify-center overflow-hidden">
            {backdrop && (
                <img src={resolveAsset(backdrop)} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-md" draggable={false} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />

            <div className="relative flex flex-col items-center gap-10 px-8 text-center">
                <h1
                    className="text-5xl font-bold text-white uppercase drop-shadow-[0_0_40px_rgba(217,70,239,0.5)] md:text-7xl"
                    style={{ animation: 'engine-title 1.4s cubic-bezier(0.22,1,0.36,1) both' }}
                >
                    {game.game.title}
                </h1>
                {game.game.description && (
                    <p className="max-w-xl text-sm text-white/50" style={{ animation: 'engine-bg-fade 1s 0.6s both' }}>
                        {game.game.description}
                    </p>
                )}
                <div style={{ animation: 'engine-bg-fade 1s 0.9s both' }}>
                    {canStart ? (
                        <button
                            onClick={onStart}
                            className="btn-glow cursor-pointer rounded-2xl px-12 py-4 text-lg font-bold tracking-widest text-white uppercase"
                        >
                            ▶ Start game
                        </button>
                    ) : (
                        <p className="text-sm text-white/40">This game has no playable scenes yet.</p>
                    )}
                </div>
            </div>

            <ExitButton onExit={onExit} />
        </div>
    );
}

function EndScreen({ game, onMenu, onExit }) {
    return (
        <div className="relative flex size-full flex-col items-center justify-center gap-10 bg-black">
            <h1 className="text-4xl font-bold tracking-[0.3em] text-white/90 uppercase" style={{ animation: 'engine-title 1.6s both' }}>
                The End
            </h1>
            <p className="text-sm text-white/40" style={{ animation: 'engine-bg-fade 1s 0.8s both' }}>{game.game.title}</p>
            <div className="flex gap-3" style={{ animation: 'engine-bg-fade 1s 1.2s both' }}>
                <button onClick={onMenu} className="btn-glow cursor-pointer rounded-xl px-6 py-2.5 text-sm font-bold text-white">Back to menu</button>
                <button onClick={onExit} className="glass cursor-pointer rounded-xl px-6 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10">Exit</button>
            </div>
        </div>
    );
}

function ExitButton({ onExit }) {
    return (
        <button
            onClick={onExit}
            title="Exit (Esc)"
            className="absolute top-4 right-4 z-50 flex size-9 cursor-pointer items-center justify-center rounded-xl bg-black/40 text-white/40 opacity-40 backdrop-blur transition hover:bg-black/70 hover:text-white hover:opacity-100"
        >
            ✕
        </button>
    );
}

function Player({ game, resolveAsset, onFinished, onExit }) {
    const playable = useMemo(() => game.scenes.filter((s) => !s.is_group && s.type), [game]);
    const parentById = useMemo(() => new Map(game.scenes.map((s) => [s.id, s.parent_id])), [game]);
    const charactersById = useMemo(() => new Map(game.characters.map((c) => [c.id, c])), [game]);

    const startIndex = Math.max(0, playable.findIndex((s) => s.id === game.start_scene_id));
    const [cursor, setCursor] = useState(startIndex);
    const [typedDone, setTypedDone] = useState(false);
    const [revealAll, setRevealAll] = useState(false);
    const [flashes, setFlashes] = useState([]);
    const [shake, setShake] = useState(null);

    const musicRef = useRef({ path: null, audio: null });

    const node = playable[cursor] ?? null;

    const resolveCharacter = useCallback((characterId, appearanceId) => {
        const character = charactersById.get(characterId);
        if (!character) return null;
        const appearance =
            character.appearances.find((a) => a.id === appearanceId) ??
            character.appearances.find((a) => a.id === character.default_appearance_id) ??
            character.appearances[0];
        return {
            name: appearance?.resolved.display_name ?? character.display_name,
            color: appearance?.resolved.text_color ?? character.text_color ?? '#e9e6f7',
            image: appearance?.resolved.image ?? null,
        };
    }, [charactersById]);

    const background = useMemo(() => {
        if (!node?.resolved_background) return null;

        return {
            path: node.resolved_background,
            transition: node.background?.transition ?? 'fade',
        };
    }, [node]);

    const jumpTo = useCallback((sceneId) => {
        const isInside = (candidate) => {
            let current = candidate.id;
            while (current != null) {
                if (current === sceneId) return true;
                current = parentById.get(current) ?? null;
            }
            return false;
        };

        const index = playable.findIndex((s) => isInside(s));

        if (index >= 0) setCursor(index);
        else queueMicrotask(onFinished);
    }, [playable, parentById, onFinished]);

    const advance = useCallback(() => {
        setCursor((current) => {
            if (current + 1 < playable.length) return current + 1;
            queueMicrotask(onFinished);
            return current;
        });
    }, [playable, onFinished]);

    useEffect(() => {
        setTypedDone(false);
        setRevealAll(false);
    }, [cursor]);

    useEffect(() => {
        if (!node) return;

        // Music channel: resolved_music is the track that should be playing
        // while this scene is on screen — switch only when the path changes.
        const music = node.resolved_music ?? null;
        const channel = musicRef.current;
        if (!music) {
            channel.audio?.pause();
            musicRef.current = { path: null, audio: null };
        } else if (music.asset_path !== channel.path) {
            channel.audio?.pause();
            const track = new Audio(resolveAsset(music.asset_path));
            track.loop = music.loop ?? true;
            track.volume = music.volume ?? 1;
            track.play().catch(() => {});
            musicRef.current = { path: music.asset_path, audio: track };
        } else if (channel.audio) {
            channel.audio.loop = music.loop ?? true;
            channel.audio.volume = music.volume ?? 1;
        }

        for (const fx of node.components?.effects ?? []) {
            if (fx.type === 'sfx' && fx.asset_path) {
                const sound = new Audio(resolveAsset(fx.asset_path));
                sound.volume = fx.options?.volume ?? 1;
                sound.play().catch(() => {});
            }
            if (fx.type === 'screen_flash') {
                const id = Math.random();
                setFlashes((f) => [...f, { id, color: fx.options?.color ?? '#ffffff', duration: fx.options?.duration_ms ?? 250 }]);
                setTimeout(() => setFlashes((f) => f.filter((x) => x.id !== id)), (fx.options?.duration_ms ?? 250) + 50);
            }
            if (fx.type === 'screen_shake') {
                setShake({ intensity: fx.options?.intensity ?? 0.5, duration: fx.options?.duration_ms ?? 400, key: Math.random() });
                setTimeout(() => setShake(null), (fx.options?.duration_ms ?? 400) + 50);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cursor]);

    useEffect(() => () => musicRef.current.audio?.pause(), []);

    useEffect(() => {
        if (!node?.auto_advance) return;
        if (node.type !== 'dialogue' || !typedDone) return;
        const timer = setTimeout(advance, node.auto_advance_delay_ms ?? 0);
        return () => clearTimeout(timer);
    }, [node, typedDone, advance]);

    const onInteract = useCallback(() => {
        if (!node) return;
        if (node.type === 'dialogue') {
            if (!typedDone) setRevealAll(true);
            else advance();
        }
        if (node.type === 'video' && node.data.skippable) advance();
    }, [node, typedDone, advance]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onExit();
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onInteract();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onInteract, onExit]);

    if (!node) return null;

    return (
        <div
            className="relative size-full cursor-pointer overflow-hidden"
            style={shake ? { animation: `engine-shake ${shake.duration}ms ease-in-out`, '--shake': `${shake.intensity * 22}px` } : undefined}
            onClick={onInteract}
        >
            <BackgroundLayer background={background} resolveAsset={resolveAsset} />

            {node.type === 'dialogue' && (
                <>
                    <SpriteLayer sprites={node.data.sprites ?? []} resolveCharacter={resolveCharacter} resolveAsset={resolveAsset} />
                    <DialogueBox
                        node={node}
                        resolveCharacter={resolveCharacter}
                        revealAll={revealAll}
                        onTyped={() => setTypedDone(true)}
                    />
                </>
            )}

            {node.type === 'choice' && (
                <ChoicePanel node={node} onPick={(option) => (option.target_scene_id ? jumpTo(option.target_scene_id) : advance())} />
            )}

            {node.type === 'video' && (
                <VideoPlayer key={node.id} node={node} resolveAsset={resolveAsset} onEnded={advance} />
            )}

            {flashes.map((flash) => (
                <div
                    key={flash.id}
                    className="pointer-events-none absolute inset-0 z-40"
                    style={{ background: flash.color, animation: `engine-flash ${flash.duration}ms ease-out both` }}
                />
            ))}

            <ExitButton onExit={onExit} />
        </div>
    );
}

function BackgroundLayer({ background, resolveAsset }) {
    if (!background) return <div className="absolute inset-0 bg-black" />;

    const animation = background.transition === 'cut'
        ? undefined
        : background.transition === 'slide'
            ? 'engine-bg-slide 0.7s cubic-bezier(0.22,1,0.36,1) both'
            : 'engine-bg-fade 0.6s ease both';

    return (
        <div className="absolute inset-0 bg-black">
            <img
                key={background.path}
                src={resolveAsset(background.path)}
                alt=""
                className="absolute inset-0 size-full object-cover"
                style={{ animation }}
                draggable={false}
            />
        </div>
    );
}

function SpriteLayer({ sprites, resolveCharacter, resolveAsset }) {
    return sprites.map((sprite, i) => {
        const resolved = resolveCharacter(sprite.character_id, sprite.appearance_id);
        if (!resolved?.image) return null;

        return (
            <div
                key={sprite.character_id}
                className="absolute transition-all duration-500 ease-out"
                style={{
                    left: `${(sprite.x ?? 0.5) * 100}%`,
                    bottom: `${(sprite.y ?? 0) * 100}%`,
                    height: `${(sprite.scale ?? 0.85) * 100}%`,
                    transform: 'translateX(-50%)',
                    zIndex: 5 + i,
                }}
            >
                <img
                    src={resolveAsset(resolved.image)}
                    alt={resolved.name}
                    draggable={false}
                    className="h-full w-auto max-w-none"
                    style={{
                        transform: sprite.flip ? 'scaleX(-1)' : undefined,
                        filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.55))',
                        animation: 'engine-sprite-in 0.45s ease-out both',
                    }}
                />
            </div>
        );
    });
}

function DialogueBox({ node, resolveCharacter, revealAll, onTyped }) {
    const text = node.data.text ?? '';
    const [count, setCount] = useState(0);

    const speaker = node.data.character_id
        ? resolveCharacter(node.data.character_id, node.data.appearance_id)
        : node.data.speaker_name
            ? { name: node.data.speaker_name, color: node.data.speaker_color ?? '#e9e6f7' }
            : null;

    useEffect(() => {
        setCount(0);
    }, [text]);

    useEffect(() => {
        if (revealAll || count >= text.length) {
            if (count < text.length) setCount(text.length);
            onTyped();
            return;
        }
        const timer = setTimeout(() => setCount((c) => c + 1), 18);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, revealAll, text]);

    const align = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' }[node.data.speaker_position ?? 'center'];
    const done = count >= text.length;

    return (
        <div className={`absolute inset-x-0 bottom-0 z-30 flex flex-col ${align} px-[6%] pb-[4%]`}>
            <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-[220%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            {speaker?.name && (
                <div
                    className="relative z-10 -mb-3 rounded-t-xl border border-b-0 border-white/15 bg-black/70 px-5 py-1.5 text-base font-bold tracking-wide backdrop-blur"
                    style={{ color: speaker.color }}
                >
                    {speaker.name}
                </div>
            )}
            <div className="relative z-10 w-full rounded-2xl border border-white/12 bg-black/65 px-7 py-5 shadow-2xl backdrop-blur-md">
                <p className="min-h-14 text-lg leading-relaxed text-white/95">
                    {text.slice(0, count)}
                    {done && !node.auto_advance && (
                        <span className="ml-2 inline-block text-fuchsia-300" style={{ animation: 'engine-caret 1.1s infinite' }}>▾</span>
                    )}
                </p>
            </div>
        </div>
    );
}

function ChoicePanel({ node, onPick }) {
    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/50 px-8 backdrop-blur-[3px]">
            {node.data.prompt && (
                <h2 className="mb-3 text-2xl font-bold text-white drop-shadow" style={{ animation: 'engine-bg-fade 0.4s both' }}>
                    {node.data.prompt}
                </h2>
            )}
            {node.data.options.map((option, i) => (
                <button
                    key={option.id}
                    onClick={(e) => { e.stopPropagation(); onPick(option); }}
                    className="w-full max-w-md cursor-pointer rounded-2xl border border-white/15 bg-white/8 px-8 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:scale-[1.02] hover:border-fuchsia-300/60 hover:bg-fuchsia-500/20 hover:shadow-[0_0_30px_rgba(217,70,239,0.35)]"
                    style={{ animation: `engine-bg-fade 0.4s ${0.12 * (i + 1)}s both` }}
                >
                    {option.text}
                </button>
            ))}
        </div>
    );
}

function VideoPlayer({ node, resolveAsset, onEnded }) {
    const missing = !node.data.asset_path;

    useEffect(() => {
        if (missing) onEnded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [missing]);

    if (missing) return null;

    return (
        <video
            src={resolveAsset(node.data.asset_path)}
            autoPlay
            loop={node.data.loop ?? false}
            onEnded={node.data.loop ? undefined : onEnded}
            className="absolute inset-0 z-20 size-full bg-black object-contain"
        />
    );
}
