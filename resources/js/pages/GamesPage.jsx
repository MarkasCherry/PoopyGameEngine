import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateGame, useDeleteGame, useGames } from '../api/hooks';
import { Badge, Button, EmptyState, Field, Input, Modal, Spinner, TextArea } from '../components/ui';

export default function GamesPage() {
    const { data: games, isLoading } = useGames();
    const [creating, setCreating] = useState(false);

    return (
        <div className="mx-auto max-w-6xl px-8 py-12">
            <header className="animate-rise mb-10 flex items-end justify-between">
                <div>
                    <div className="mb-1 text-sm font-semibold tracking-[0.25em] text-fuchsia-300/70 uppercase">Novel Forge</div>
                    <h1 className="text-gradient text-4xl font-bold tracking-tight">Your Stories</h1>
                </div>
                <Button onClick={() => setCreating(true)}>✦ New Game</Button>
            </header>

            {isLoading ? (
                <Spinner />
            ) : games?.length === 0 ? (
                <EmptyState
                    icon="🎭"
                    title="No games yet"
                    subtitle="Every great visual novel starts with an empty page. Create your first game to begin."
                    action={<Button onClick={() => setCreating(true)}>Create your first game</Button>}
                />
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {games?.map((game, i) => (
                        <GameCard key={game.id} game={game} index={i} />
                    ))}
                </div>
            )}

            <CreateGameModal open={creating} onClose={() => setCreating(false)} />
        </div>
    );
}

function GameCard({ game, index }) {
    const deleteGame = useDeleteGame();

    return (
        <Link
            to={`/games/${game.id}`}
            className="glass card-lift animate-rise group relative block overflow-hidden rounded-2xl p-6"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className="relative">
                <h2 className="mb-1 text-xl font-bold text-white">{game.title}</h2>
                <p className="mb-4 line-clamp-2 min-h-10 text-sm text-violet-300/60">
                    {game.description || 'No description yet.'}
                </p>
                <div className="flex items-center gap-2">
                    <Badge>{game.scenes_count} scenes</Badge>
                    <Badge tone="fuchsia">{game.characters_count} characters</Badge>
                    <button
                        className="ml-auto cursor-pointer rounded-lg px-2 py-1 text-xs text-violet-300/40 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-300"
                        onClick={(e) => {
                            e.preventDefault();
                            if (confirm(`Delete "${game.title}" and all of its content?`)) {
                                deleteGame.mutate(game.id);
                            }
                        }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </Link>
    );
}

function CreateGameModal({ open, onClose }) {
    const createGame = useCreateGame();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const submit = (e) => {
        e.preventDefault();
        createGame.mutate(
            { title, description: description || null },
            {
                onSuccess: () => {
                    setTitle('');
                    setDescription('');
                    onClose();
                },
            },
        );
    };

    return (
        <Modal open={open} onClose={onClose} title="Create a new game">
            <form onSubmit={submit} className="space-y-4">
                <Field label="Title">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Midnight Chronicles" autoFocus required />
                </Field>
                <Field label="Description" hint="Optional — a short synopsis of your story.">
                    <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A tale of..." />
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={createGame.isPending || !title.trim()}>Create game</Button>
                </div>
            </form>
        </Modal>
    );
}
