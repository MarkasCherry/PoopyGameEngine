import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    useCharacters, useCreateScene, useDeleteScene, useDuplicateScene,
    useGameMap, useReorderScenes, useScenes, useUpdateScene,
} from '../api/hooks';
import { useSceneDraft } from '../lib/useSceneDraft';
import SceneTree from '../components/SceneTree';
import Stage from '../components/Stage';
import Timeline from '../components/Timeline';
import NodeInspector from '../components/NodeInspector';
import GroupPanel from '../components/GroupPanel';
import { EmptyState, Spinner } from '../components/ui';

export default function ScenesPage() {
    const { gameId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: scenes, isLoading } = useScenes(gameId);
    const { data: mapData } = useGameMap(gameId);
    const { data: characters } = useCharacters(gameId);

    const createScene = useCreateScene(gameId);
    const updateScene = useUpdateScene(gameId);
    const deleteScene = useDeleteScene(gameId);
    const duplicateScene = useDuplicateScene(gameId);
    const reorderScenes = useReorderScenes(gameId);

    const selectedSceneId = Number(searchParams.get('scene')) || null;
    const selectScene = (id) => setSearchParams(id ? { scene: String(id) } : {}, { replace: true });

    useEffect(() => {
        if (scenes?.length && !scenes.some((s) => s.id === selectedSceneId)) {
            selectScene(scenes[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenes, selectedSceneId]);

    const selected = scenes?.find((s) => s.id === selectedSceneId) ?? null;
    const groupId = selected ? (selected.is_group ? selected.id : selected.parent_id) : null;
    const group = groupId !== null ? scenes?.find((s) => s.id === groupId) : null;

    const siblings = (scenes ?? [])
        .filter((s) => (s.parent_id ?? null) === (groupId ?? null))
        .sort((a, b) => a.position - b.position);

    const backgrounds = Object.fromEntries((mapData?.scenes ?? []).map((s) => [s.id, s.background]));

    if (isLoading) return <Spinner />;

    const defaultTitle = (parentId, isGroup) => {
        const parent = scenes?.find((s) => s.id === parentId);
        const base = parent?.title ?? (isGroup ? 'Chapter' : 'Scene');
        const count = (scenes ?? []).filter((s) => (s.parent_id ?? null) === (parentId ?? null)).length;
        return `${base} ${count + 1}`;
    };

    const createHandler = (parentId, title, isGroup = false, extra = {}) =>
        createScene.mutate(
            { title: title ?? defaultTitle(parentId, isGroup), parent_id: parentId, is_group: isGroup, ...extra },
            { onSuccess: (scene) => selectScene(scene.id) },
        );

    const removeScene = (sceneId) => {
        const target = scenes?.find((s) => s.id === sceneId);
        if (!confirm(`Delete "${target?.title ?? 'this scene'}"?`)) return;
        deleteScene.mutate(sceneId, { onSuccess: () => selectedSceneId === sceneId && selectScene(null) });
    };

    return (
        <div className="flex h-full">
            <SceneTree
                gameId={gameId}
                scenes={scenes ?? []}
                mapData={mapData}
                selectedId={selectedSceneId}
                onSelect={selectScene}
                onCreate={createHandler}
                onRename={(sceneId, title) => title.trim() && updateScene.mutate({ sceneId, title })}
                onMove={(sceneId, parentId) => updateScene.mutate({ sceneId, parent_id: parentId })}
                onReorder={(ids) => reorderScenes.mutate(ids)}
                onDuplicate={(sceneId) => duplicateScene.mutate(sceneId, { onSuccess: (scene) => selectScene(scene.id) })}
                onDelete={removeScene}
            />

            {selected && (
                <Timeline
                    gameId={gameId}
                    groupTitle={group?.title ?? 'Top level'}
                    scenes={siblings}
                    backgrounds={backgrounds}
                    characters={characters ?? []}
                    selectedId={selectedSceneId}
                    onSelect={selectScene}
                    onReorder={(ids) => reorderScenes.mutate(ids)}
                    onAdd={(kind) =>
                        createHandler(groupId, null, false, { type: kind.type, data: kind.defaults })}
                    onDelete={removeScene}
                />
            )}

            {selected?.is_group ? (
                <GroupPanel
                    key={selected.id}
                    gameId={gameId}
                    scene={selected}
                    scenes={scenes ?? []}
                    mapData={mapData}
                    onSelect={selectScene}
                    onCreate={createHandler}
                    onRename={(title) => updateScene.mutate({ sceneId: selected.id, title })}
                    onSetBackground={(path) =>
                        updateScene.mutate({
                            sceneId: selected.id,
                            background: path ? { asset_path: path, transition: 'fade' } : null,
                        })}
                    onSetAudio={(audio) => updateScene.mutate({ sceneId: selected.id, audio })}
                />
            ) : selected ? (
                <SceneStudio
                    key={selected.id}
                    gameId={gameId}
                    scene={selected}
                    scenes={scenes ?? []}
                    characters={characters ?? []}
                    backgrounds={backgrounds}
                    onDelete={() => removeScene(selected.id)}
                />
            ) : (
                <div className="flex-1">
                    <EmptyState
                        icon="✨"
                        title="Create your first scene"
                        subtitle="Scenes are single story moments — one line, one choice, one video. Group them into chapters and episodes."
                    />
                </div>
            )}
        </div>
    );
}

function SceneStudio({ gameId, scene, scenes, characters, backgrounds, onDelete }) {
    const { draft, status, patchData, patchNode, retry } = useSceneDraft(scene, gameId);

    if (!draft) return null;

    return (
        <>
            <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
                <header className="flex items-center justify-between px-1">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-white">{draft.title || scene.title}</h1>
                        <p className="text-[11px] text-violet-300/45">
                            Live preview — what you see is what the player gets.
                        </p>
                    </div>
                </header>

                <Stage
                    gameId={gameId}
                    draft={draft}
                    node={scene}
                    characters={characters}
                    resolvedBackground={backgrounds[scene.id] ?? null}
                    patchData={patchData}
                    patchNode={patchNode}
                />
            </div>

            <NodeInspector
                gameId={gameId}
                node={scene}
                draft={draft}
                status={status}
                retry={retry}
                patchData={patchData}
                patchNode={patchNode}
                characters={characters}
                scenes={scenes}
                onDelete={onDelete}
            />
        </>
    );
}
