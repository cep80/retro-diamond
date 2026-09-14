"""Animation clip contract (pure data, no bpy).

Single source of truth for clip names, frame lengths, loop flags and marker
frames. Imported by the animation authoring (``build_anims``) and by the
manifest writer / validator so the three can never drift.

Marker/duration seconds are derived as ``frame / FPS`` -- every clip is
authored starting at frame 0, and export uses ``export_anim_slide_to_zero`` so
the glTF animation also starts at t=0.
"""

from __future__ import annotations

FPS = 24


def _sec(frame):
    return round(frame / FPS, 4)


# character -> {role, sockets, clips:{name:{frames, loop, markers}}}
CHARACTERS = {
    "aoi": {
        "role": "batter",
        "sockets": {"bat_grip": "hand.R", "glove": "hand.L"},
        "clips": {
            "idle_bat":         {"frames": 48, "loop": True,  "markers": {}},
            "swing_contact":    {"frames": 22, "loop": False, "markers": {"contact": 16}},
            "swing_power":      {"frames": 24, "loop": False, "markers": {"contact": 18}},
            "bunt":             {"frames": 19, "loop": False, "markers": {"contact": 12}},
            "take":             {"frames": 19, "loop": False, "markers": {}},
            "react_success":    {"frames": 29, "loop": False, "markers": {}},
            "react_disappoint": {"frames": 29, "loop": False, "markers": {}},
            "run":              {"frames": 19, "loop": True,  "markers": {}},
        },
    },
    "reina": {
        "role": "pitcher",
        "sockets": {"ball_release": "hand.R", "glove": "hand.L"},
        "clips": {
            "idle_set":         {"frames": 48, "loop": True,  "markers": {}},
            "pitch_delivery":   {"frames": 34, "loop": False, "markers": {"release": 22}},
            "follow_through":   {"frames": 19, "loop": False, "markers": {}},
            "react_restrained": {"frames": 29, "loop": False, "markers": {}},
        },
    },
    "catcher": {
        "role": "catcher",
        "sockets": {"glove": "hand.L"},
        "clips": {
            "idle_crouch":      {"frames": 48, "loop": True,  "markers": {}},
            "catch_receive":    {"frames": 14, "loop": False, "markers": {"catch": 8}},
        },
    },
}


# Roster heroes that ride a contract character's rig, sockets and clips.
# Miki and Yuki bat (Aoi's contract); Kira closes and Sol is an ace (Reina's
# contract). Their render meshes come from content/3d/<hero>-3d.glb via hero_swap.
HERO_CONTRACT = {"miki": "aoi", "yuki": "aoi", "kira": "reina", "sol": "reina"}
for _hero, _base in HERO_CONTRACT.items():
    CHARACTERS[_hero] = dict(CHARACTERS[_base])


def contract_of(variant):
    """The contract character whose rig / clips ``variant`` is authored on."""
    return HERO_CONTRACT.get(variant, variant)


def clip_manifest(character):
    """Return the manifest 'clips' object for a character:
    {name: {duration: s, loop: bool, markers: {mname: s}}}."""
    out = {}
    for name, spec in CHARACTERS[character]["clips"].items():
        out[name] = {
            "duration": _sec(spec["frames"]),
            "loop": spec["loop"],
            "markers": {mk: _sec(mf) for mk, mf in spec["markers"].items()},
        }
    return out


def clip_names(character):
    return list(CHARACTERS[character]["clips"].keys())
