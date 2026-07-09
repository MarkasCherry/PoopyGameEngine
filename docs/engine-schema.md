# Game Serialization Schema — Engine Contract

**Schema version: `2.1`**

This document is the contract between the editor (writer) and the JS game engine (reader).
The editor produces this JSON; the engine consumes it and owns *all* runtime behavior. Nothing in
this file implies behavior on the PHP side.

## Obtaining the document

| Method | Result |
|---|---|
| `GET /api/games/{id}/export` | The JSON document, returned inline |
| `POST /api/games/{id}/export` | Writes `games/{slug}/game.json` inside the game folder |

A game folder is fully self-contained: `game.json` + every asset it references, all paths relative
to the folder root:

```
games/{slug}/
├── game.json
├── assets/
│   ├── backgrounds/*.png|jpg|webp
│   ├── audio/music/*.mp3|ogg|...
│   ├── audio/sfx/*.mp3|ogg|...
│   └── video/*.mp4|webm
└── characters/{character-slug}/{appearance-slug}.png
```

Every `*_path` / `image` string in the document is relative to the game folder root.

## The model: one recursive concept

There is exactly one structural entity: the **scene**. A scene is either

- a **group** (`is_group: true`) — a folder organizing scenes into chapters / episodes / acts,
  nested arbitrarily deep. Groups are never played directly; or
- a **playable scene** (`is_group: false`, `type` set) — one atomic story moment: a single
  dialogue line, a single choice menu, or a single video.

Playback is simply the depth-first order of the playable scenes. The `scenes` array is already
flattened in that order.

## Top level

```jsonc
{
  "schema_version": "2.1",
  "game": {
    "id": 1,
    "title": "Midnight Tale",
    "slug": "midnight-tale",
    "description": "…",            // nullable
    "settings": {}                  // free-form, reserved for future engine options
  },
  "start_scene_id": 3,              // first playable scene in depth-first order; null if none
  "characters": [ Character ],
  "scenes": [ Scene ]               // depth-first tree order (groups expand in place)
}
```

## Scene

```jsonc
{
  "id": 3,
  "title": "Line 1",               // editor label only — engines never display it
  "parent_id": 2,                   // group nesting; null = top level
  "is_group": false,
  "type": "dialogue",              // "dialogue" | "choice" | "video"; null for groups
  "position": 0,                    // order among siblings

  // Background: raw own value (nullable) and the editor-resolved effective value.
  "background": { "asset_path": "assets/backgrounds/cave.png", "transition": "cut" },
  "resolved_background": "assets/backgrounds/cave.png",

  // Music: the editor-resolved track playing WHILE this scene is on screen.
  // null = silence. Engines switch tracks only when the path changes between scenes.
  "resolved_music": { "asset_path": "assets/audio/music/rain.mp3", "loop": true, "volume": 0.8 },

  "components": {
    "audio": {                      // nullable — the raw own value behind resolved_music
      "action": "play",            // "play" (with asset_path) | "stop" (forces silence)
      "asset_path": "assets/audio/music/rain.mp3",
      "loop": true,
      "volume": 0.8
    },
    "effects": [                    // one-shots fired on entry, in order (may be empty)
      { "type": "sfx",          "asset_path": "assets/audio/sfx/thunder.mp3", "options": { "volume": 1 } },
      { "type": "screen_flash", "options": { "color": "#ffffff", "duration_ms": 250 } },
      { "type": "screen_shake", "options": { "intensity": 0.5, "duration_ms": 400 } }
    ]
  },

  "auto_advance": false,            // advance without input once the scene completes
  "auto_advance_delay_ms": null,

  "data": { … }                     // type-specific (below); null for groups
}
```

### Background resolution (done by the editor)

`resolved_background` is what the engine shows when the scene starts — already resolved:
a scene's own background wins; otherwise the previous playable scene's background carries
over; a group's background applies to everything inside it (and re-asserts itself when the
group is entered), cascading through nested groups. Engines just render
`resolved_background` and animate `background.transition` when the path differs from the
previously displayed one. `null` means black / no background.

### Music resolution (done by the editor)

`resolved_music` cascades by **scope**, not carry-over: a scene's own `audio` wins; otherwise
the nearest ancestor group's `audio` applies. Set a track on a chapter and it plays through
every scene inside; a child scene or sub-group with its own `audio` overrides it only for its
own scope, and the chapter track resumes afterwards. `action: "stop"` resolves to `null`
(explicit silence for that scope). Engines keep the current track playing across scenes and
switch only when `resolved_music.asset_path` differs from what is already playing.

The "thunder + flash on this line" case is one dialogue scene with two `components.effects`
entries — never a separate scene.

## Scene types

### `dialogue`

```jsonc
"data": {
  "text": "It was a dark night…",
  "character_id": 1,                // null → narrator / anonymous speaker
  "appearance_id": 2,               // null → character's default appearance; reference, never flattened
  "speaker_name": null,             // used only when character_id is null
  "speaker_color": null,            // used only when character_id is null
  "speaker_position": "center",    // "left" | "center" | "right" — dialogue box alignment
  "sprites": [                      // who is VISIBLE — independent of who is speaking
    { "character_id": 1, "appearance_id": 2, "x": 0.25, "y": 0, "scale": 0.9, "flip": false }
  ]
}
```

Sprite transform: `x` = horizontal center as a fraction of stage width; `y` = bottom-edge offset
from the stage bottom as a fraction of stage height; rendered height = `scale × stage height`;
`flip` mirrors horizontally.

Speaker resolution: `character_id` set → use the referenced appearance's `resolved` values
(falling back to `default_appearance_id`); null → narrator using `speaker_name`/`speaker_color`.

### `choice`

```jsonc
"data": {
  "prompt": "Go inside?",          // nullable
  "options": [
    { "id": "839fd458-…", "text": "Yes", "target_scene_id": 7 },
    { "id": "15d8fe57-…", "text": "No",  "target_scene_id": null }   // null → next scene in order
  ]
}
```

Option `id`s are stable UUIDs — savegames should key on them. `target_scene_id` may reference any
scene: a playable scene plays it directly; a group means "enter the group" — play its first
playable descendant, then continue in depth-first order.

### `video`

```jsonc
"data": { "asset_path": "assets/video/intro.mp4", "loop": false, "skippable": true }
```

## Character

```jsonc
{
  "id": 1,
  "name": "Aria",
  "type": "protagonist",           // nullable, free-form tag
  "display_name": "Aria",
  "text_color": "#e879f9",         // nullable
  "default_appearance_id": 1,
  "appearances": [
    {
      "id": 2,
      "name": "Happy",
      "scope": "global",           // "global" | "scene" — editor organization only
      "scene_id": null,
      "resolved": {                 // cascade applied: character defaults ← appearance overrides
        "display_name": "Aria",
        "text_color": "#22d3ee",
        "image": "characters/aria/happy.png"
      },
      "overrides": {                // the raw override layer (null = inherit)
        "display_name": null,
        "text_color": "#22d3ee",
        "image": "characters/aria/happy.png"
      }
    }
  ]
}
```

## Playback rules

1. Start at `start_scene_id`; play playable scenes in the order of the `scenes` array.
2. On scene entry: show `resolved_background`, sync the music channel to `resolved_music`,
   fire `components.effects`.
3. Dialogue/choice wait for input (or `auto_advance`); video advances when it ends.
4. Choice options jump via `target_scene_id` (see above) or continue in order when null.
5. After the last playable scene, the game ends.

Engines MUST ignore unknown keys and unknown scene/effect types gracefully — minor schema
versions only add, never repurpose.

## Changelog

- **2.1** — background music cascade: added `resolved_music` (scope-based resolution — own
  audio, else nearest ancestor group's). `components.audio` is now the raw layer behind it,
  no longer an entry command.
- **2.0** — unified model: the node layer was removed; a playable scene now *is* the atomic beat
  (type/data/components live on the scene). Backgrounds unified into one cascading `background`
  field with editor-resolved `resolved_background`. Choice targets may reference groups.
- **1.2** — explicit groups, group default backgrounds. **1.1** — scene nesting, sprite
  transforms. **1.0** — initial contract.

## Versioning rules

- `schema_version` is `major.minor`.
- Minor bump: additive only. Major bump: breaking; engines must refuse higher majors.

## Reserved for the future (do not repurpose)

- `game.settings` — engine/runtime configuration.
- Savegames: separate self-contained files, not part of this document.
- New scene types (plugins: inventory, map, …) arrive as new `type` values with their own `data`.
