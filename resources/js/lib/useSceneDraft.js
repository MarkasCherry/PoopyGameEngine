import { useEffect, useRef, useState } from 'react';
import { useUpdateScene } from '../api/hooks';

const snapshot = (scene) => ({
    title: scene.title,
    data: scene.data ?? {},
    background: scene.background,
    audio: scene.audio,
    effects: scene.effects ?? [],
    auto_advance: scene.auto_advance,
    auto_advance_delay_ms: scene.auto_advance_delay_ms,
});

// A blank title is a mid-rename state, not a save request — the API requires one.
const toPayload = ({ title, ...rest }) => (title?.trim() ? { title, ...rest } : rest);

export function useSceneDraft(scene, gameId) {
    const updateScene = useUpdateScene(gameId);
    const [draft, setDraft] = useState(scene ? snapshot(scene) : null);
    const [status, setStatus] = useState('saved');
    const timer = useRef(null);
    const pending = useRef(null);
    const sceneId = scene?.id;

    useEffect(() => {
        clearTimeout(timer.current);

        if (pending.current) {
            const { id, payload } = pending.current;
            pending.current = null;
            updateScene.mutate({ sceneId: id, ...toPayload(payload) });
        }

        setDraft(scene ? snapshot(scene) : null);
        setStatus('saved');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneId]);

    const flush = (payload) => {
        pending.current = null;
        setStatus('saving');
        updateScene.mutate(
            { sceneId, ...toPayload(payload) },
            {
                onSuccess: () => setStatus((s) => (s === 'saving' ? 'saved' : s)),
                onError: () => setStatus('error'),
            },
        );
    };

    const apply = (next) => {
        setDraft(next);
        setStatus('dirty');
        pending.current = { id: sceneId, payload: next };
        clearTimeout(timer.current);
        timer.current = setTimeout(() => flush(next), 650);
    };

    return {
        draft,
        status,
        patchData: (patch) => apply({ ...draft, data: { ...draft.data, ...patch } }),
        patchNode: (patch) => apply({ ...draft, ...patch }),
        retry: () => draft && flush(draft),
    };
}
