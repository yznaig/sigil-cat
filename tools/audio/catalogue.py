"""The sound brief and reel order; deliberately independent of the synthesizer."""
BASELINE = '27f3543caf49ee21e5005f957a8cc89b5b14a4d4'
# Aaron's listening decision e1111-05. These use the historical clip with constant gain only.
KEPT_ORIGINALS = {
    'bite': ('qubodup', 'https://freesound.org/people/qubodup/sounds/816237/'),
    'slap': ('adviseme333', 'https://freesound.org/people/adviseme333/sounds/679391/'),
    'glass-slide': ('jedg', 'https://freesound.org/people/jedg/sounds/505965/'),
    'glass-smash': ('AlterKartoffelsack', 'https://freesound.org/people/AlterKartoffelsack/sounds/465946/'),
    'choir': ('bone666138', 'https://freesound.org/people/bone666138/sounds/274121/'),
    'paper': ('BenjaminNelan', 'https://freesound.org/people/BenjaminNelan/sounds/353125/'),
    'twinkle': ('steffcaffrey', 'https://freesound.org/people/steffcaffrey/sounds/452379/'),
    'click': ('tbrook', 'https://freesound.org/people/tbrook/sounds/348224/'),
}
# Approved exceptions preserve these sparse transients at the -4 dBFS peak ceiling.
PEAK_LIMITED_ORIGINALS = {'paper': -26.568, 'click': -30.841}
PEAK_LIMIT_REASON = 'original kept by Aaron, e1111-05; transient sound, gain-only would clip'
# name, actual trigger, previous voice, intended voice
CUES = [
    ('tap-boing', 'Random cat body tap', 'Jaw harp', 'A rubber-band twong with a little wooden belly'),
    ('tap-squeak', 'Random cat body tap', 'Dog toy', 'Two felt-mouse squeaks, rounded and brief'),
    ('tap-bonk', 'Random cat body tap; top-hat landing', 'Hollow wood knock', 'A hollow maple bonk, with a tiny loose bead'),
    ('tap-mrrp', 'Random cat body tap; cat enters the box', 'CC0 cat trill', 'Keep the real cat: close, warm, gently filtered trill'),
    ('tap-pop', 'Random tap; bread return; box exit; hat lift; eyes detach; Butterman encore exit', 'Cork pop', 'A little suction pop with a soft falling body'),
    ('tap-blat', 'Random cat body tap', 'Raspberry', 'An embarrassed miniature bassoon flutter'),
    ('tap-rare', 'One in fifty cat taps', 'Small gong', 'A tiny ceremonial gong followed by one ridiculous bubble'),
    ('cast', 'Every recognized sigil or repeated spell', 'Magic-wand recording', 'Three climbing glass-and-tine notes: C, G, high C'),
    ('fizzle', 'Unrecognized drawn sigil', 'Wet match', 'Paper sputter that folds into a question-mark chirrup'),
    ('thunder', 'Lightning spell; cloud tap/drag grumble (offset .35 s, slower)', 'Close thunder recording', 'A small theatrical storm: soft crack, rolling wooden low end'),
    ('whoosh', 'Circle spin, two slowed layers; spinning-top use', 'Generic whoosh', 'Felt brushing the air, a rising then falling breath'),
    ('ding', 'Loaf transformation; buttered-cat paradox begins', 'Desk bell', 'A small brass kitchen bell, one rounded strike'),
    ('airhorn', 'Legacy MLG horn callback; currently preloaded but montage video supersedes it', 'Oil-rig horn', 'Two toy-brass honks: knowingly silly, never an alarm'),
    ('hit', 'Rifle keepsake tap; legacy MLG hitmarker; glass shards tap at higher pitch', 'Metal tap stand-in', 'Dry two-part mechanical tick with a glass fleck'),
    ('slap', 'Butterman butter slap; butter pat tap/return; paradox butter return', 'Wet towel', 'Soft butter contact, sticky peel, one low plop'),
    ('purr', 'Petting builds a crossfaded loop', 'CC0 cat purr', 'Keep the real breath and flutter; remove rumble and sharp room hiss'),
    ('bite', 'Seventh pet stroke; bread nibble', 'Toast crunch', 'Small biscuit crunch: three irregular dry fractures'),
    ('hiss', 'Bite warning, 80 ms after crunch', 'CC0 cat hiss', 'Keep the real cat warning, soften its high edge'),
    ('glass-slide', 'Cat pushes glass; glass tips', 'Glass scraping table', 'Short glass-foot scrape with a restrained rim resonance'),
    ('glass-smash', 'Glass falls and breaks', 'Glass-breaking recording', 'One rounded impact, then a handful of tiny falling shards'),
    ('drip', 'Puddle appears or is tapped', 'Water plip', 'A round water droplet and a small answering ripple'),
    ('box-thud', 'Cat drops into box; paradox falls', 'Cardboard drop', 'Cardboard cavity thump and a papery flap'),
    ('choir', 'Googly eyes revelation', 'Human aah triad', 'A tiny breathy vowel choir, C-major, gently ridiculous'),
    ('rattle', 'Eyes land or loose eyes are tapped', 'Pillbox', 'Three irregular plastic beads skittering inside googly eyes'),
    ('pluck', 'Each whisker; transposed from C4 to preserve B C B D B puzzle', 'Kalimba C4 (about 16 cents sharp)', 'Precisely tuned C4 tine and a warm wooden soundboard'),
    ('paper', 'Ticket, plaster tin, rejected physics paper, galaxy postcard', 'Paper rustle', 'Two dry folded-paper flicks, no scratchy high hiss'),
    ('splat', 'Flung butter hits the screen', 'Wet washcloth', 'A broad soft butter splop and three sticky droplets'),
    ('sponge-wipe', 'Sponge slide and rub, speed changes gain/pitch, refreshed at 130 ms', 'Original filtered-noise sponge', 'Damp cellulose swish and quiet low water bubbles'),
    ('twinkle', 'Bread rocket return and crumbs', 'Small bell', 'Two sugar-glass tinkles with a tiny descending sparkle'),
    ('click', 'Unmute and volume change; optional Butterman footsteps (disabled)', 'Light switch', 'A fingertip on a small wooden toggle'),
    ('paradox-hum', 'Buttered loaf hovers; gain follows existing start/stop', 'Three detuned oscillators, low-pass at 520 Hz', 'A warm wonky motor with a slow felt flutter'),
    ('galaxy-hum', 'Galaxy opening, hover and cutscene; gain follows aperture', '55/82.6/110.4 Hz drone and high sine shimmer', 'Breathing low fifths with distant glass dust'),
]
MATERIALS = ['wood', 'metal', 'paper', 'butter', 'glass', 'tin']
CAT_SOURCES = {
    'tap-mrrp': ('MBPL', 'https://freesound.org/people/MBPL/sounds/668825/'),
    'purr': ('aunrea', 'https://freesound.org/people/aunrea/sounds/485373/'),
    'hiss': ('aunrea', 'https://freesound.org/people/aunrea/sounds/485952/'),
}
