export function resolveAppearance(characters, characterId, appearanceId) {
    const character = characters.find((c) => c.id === characterId) ?? null;
    if (!character) return { character: null, appearance: null, image: null, name: null, color: null };

    const appearance =
        character.appearances.find((a) => a.id === appearanceId) ??
        character.appearances.find((a) => a.is_default) ??
        character.appearances[0] ??
        null;

    return {
        character,
        appearance,
        image: appearance?.image_url ?? null,
        name: appearance?.display_name ?? character.display_name ?? character.name,
        color: appearance?.text_color ?? character.text_color ?? '#aeb6fb',
    };
}

export function resolveSpeaker(characters, data) {
    if (data.character_id) {
        return resolveAppearance(characters, data.character_id, data.appearance_id);
    }

    return {
        character: null,
        appearance: null,
        image: null,
        name: data.speaker_name || null,
        color: data.speaker_color || '#aeb6fb',
    };
}

export function ancestorBackground(scene, scenes) {
    const byId = new Map(scenes.map((s) => [s.id, s]));
    let current = scene;

    while (current) {
        if (current.background?.asset_path) return current.background.asset_path;
        current = current.parent_id != null ? byId.get(current.parent_id) : null;
    }

    return null;
}

export const nodeIcon = (type) => ({ dialogue: '💬', choice: '🔀', video: '🎥' }[type] ?? '▫️');
