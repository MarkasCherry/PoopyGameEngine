import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

function useInvalidatingMutation(mutationFn, keys) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onSuccess: () => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key })),
    });
}

export const useGames = () =>
    useQuery({ queryKey: ['games'], queryFn: () => api.get('/games') });

export const useGame = (gameId) =>
    useQuery({ queryKey: ['games', gameId], queryFn: () => api.get(`/games/${gameId}`), enabled: !!gameId });

export const useCreateGame = () =>
    useInvalidatingMutation((data) => api.post('/games', data), [['games']]);

export const useUpdateGame = (gameId) =>
    useInvalidatingMutation((data) => api.put(`/games/${gameId}`, data), [['games']]);

export const useDeleteGame = () =>
    useInvalidatingMutation((gameId) => api.delete(`/games/${gameId}`), [['games']]);

const sceneKeys = (gameId) => [['games', gameId, 'scenes'], ['games', gameId, 'map']];

// Put a fresh scene into the cached list immediately — selecting it must not
// wait for (or lose a race against) the invalidation refetch.
function useSceneCreatingMutation(gameId, mutationFn) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onSuccess: (scene) => {
            queryClient.setQueryData(['games', gameId, 'scenes'], (old) => (old ? [...old, scene] : old));
            sceneKeys(gameId).forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        },
    });
}

export const useScenes = (gameId) =>
    useQuery({ queryKey: ['games', gameId, 'scenes'], queryFn: () => api.get(`/games/${gameId}/scenes`), enabled: !!gameId });

export const useCreateScene = (gameId) =>
    useSceneCreatingMutation(gameId, (data) => api.post(`/games/${gameId}/scenes`, data));

export const useUpdateScene = (gameId) =>
    useInvalidatingMutation(
        ({ sceneId, ...data }) => api.put(`/scenes/${sceneId}`, data),
        sceneKeys(gameId),
    );

export const useDeleteScene = (gameId) =>
    useInvalidatingMutation((sceneId) => api.delete(`/scenes/${sceneId}`), sceneKeys(gameId));

export const useDuplicateScene = (gameId) =>
    useSceneCreatingMutation(gameId, (sceneId) => api.post(`/scenes/${sceneId}/duplicate`));

export const useGameMap = (gameId) =>
    useQuery({ queryKey: ['games', gameId, 'map'], queryFn: () => api.get(`/games/${gameId}/map`), enabled: !!gameId });

export const useReorderScenes = (gameId) =>
    useInvalidatingMutation(
        (orderedIds) => api.put(`/games/${gameId}/scenes/reorder`, { ordered_ids: orderedIds }),
        sceneKeys(gameId),
    );

export const useCharacters = (gameId) =>
    useQuery({ queryKey: ['games', gameId, 'characters'], queryFn: () => api.get(`/games/${gameId}/characters`), enabled: !!gameId });

export const useCreateCharacter = (gameId) =>
    useInvalidatingMutation((formData) => api.post(`/games/${gameId}/characters`, formData), [['games', gameId, 'characters']]);

export const useUpdateCharacter = (gameId) =>
    useInvalidatingMutation(
        ({ characterId, ...data }) => api.put(`/characters/${characterId}`, data),
        [['games', gameId, 'characters']],
    );

export const useDeleteCharacter = (gameId) =>
    useInvalidatingMutation((characterId) => api.delete(`/characters/${characterId}`), [['games', gameId, 'characters']]);

export const useCreateAppearance = (gameId) =>
    useInvalidatingMutation(
        ({ characterId, formData }) => api.post(`/characters/${characterId}/appearances`, formData),
        [['games', gameId, 'characters']],
    );

export const useUpdateAppearance = (gameId) =>
    useInvalidatingMutation(
        ({ appearanceId, formData }) => {
            formData.append('_method', 'PUT');
            return api.post(`/appearances/${appearanceId}`, formData);
        },
        [['games', gameId, 'characters']],
    );

export const useDeleteAppearance = (gameId) =>
    useInvalidatingMutation((appearanceId) => api.delete(`/appearances/${appearanceId}`), [['games', gameId, 'characters']]);

export const useAssets = (gameId, category) =>
    useQuery({
        queryKey: ['games', gameId, 'assets', category ?? 'all'],
        queryFn: () => api.get(`/games/${gameId}/assets${category ? `?category=${category}` : ''}`),
        enabled: !!gameId,
    });

export const useUploadAsset = (gameId) =>
    useInvalidatingMutation(
        ({ file, category }) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            return api.post(`/games/${gameId}/assets`, formData);
        },
        [['games', gameId, 'assets']],
    );

export const useDeleteAsset = (gameId) =>
    useInvalidatingMutation((path) => api.delete(`/games/${gameId}/assets`, { path }), [['games', gameId, 'assets']]);

export const useExportGame = (gameId) =>
    useMutation({ mutationFn: () => api.post(`/games/${gameId}/export`) });

export const fileUrl = (gameId, path) => `/api/games/${gameId}/files/${path}`;
