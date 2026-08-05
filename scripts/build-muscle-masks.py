from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/muscle-map-reference.png"
OUT = ROOT / "public/assets/muscles"
OUT.mkdir(parents=True, exist_ok=True)

image = Image.open(SOURCE).convert("RGB")
w, h = image.size
rgb = np.asarray(image)
gray = rgb.mean(axis=2)
muscle_alpha = np.clip((150 - gray) * 5.5, 0, 255).astype(np.uint8)
body_alpha = np.clip((253 - gray) * 20, 0, 255).astype(np.uint8)

base = np.zeros((h, w, 4), dtype=np.uint8)
base[:, :, :3] = np.where(gray[..., None] < 150, np.array([62, 67, 72]), np.array([190, 195, 192]))
base[:, :, 3] = body_alpha
scale = 2
resample = Image.Resampling.LANCZOS
Image.fromarray(base, "RGBA").resize((w * scale, h * scale), resample).save(ROOT / "public/assets/muscle-map-base.png", optimize=True)

# Normalized selectors choose a group; the final edges always come from the
# charcoal artwork, preserving every anatomical separator in the reference.
regions = {
    "chest": [[(.16,.20),(.37,.20),(.37,.31),(.16,.31)]],
    "shoulders": [[(.115,.19),(.19,.19),(.19,.285),(.115,.285)],[(.34,.19),(.405,.19),(.405,.285),(.34,.285)],[(.615,.19),(.69,.19),(.69,.285),(.615,.285)],[(.835,.19),(.91,.19),(.91,.285),(.835,.285)]],
    "biceps": [[(.105,.265),(.18,.26),(.18,.39),(.105,.39)],[(.345,.26),(.415,.265),(.415,.39),(.345,.39)]],
    "triceps": [[(.61,.255),(.69,.255),(.69,.395),(.61,.395)],[(.835,.255),(.91,.255),(.91,.395),(.835,.395)]],
    "forearms": [[(.055,.345),(.145,.34),(.145,.47),(.055,.47)],[(.39,.34),(.47,.345),(.47,.47),(.39,.47)],[(.545,.345),(.63,.34),(.63,.47),(.545,.47)],[(.89,.34),(.965,.345),(.965,.47),(.89,.47)]],
    "abdominals": [[(.17,.285),(.35,.285),(.35,.50),(.17,.50)]],
    "adductors": [[(.205,.47),(.285,.47),(.285,.67),(.205,.67)]],
    "quadriceps": [[(.14,.46),(.225,.46),(.225,.67),(.14,.67)],[(.275,.46),(.365,.46),(.365,.67),(.275,.67)]],
    "calves": [[(.14,.645),(.23,.645),(.23,.875),(.14,.875)],[(.27,.645),(.355,.645),(.355,.875),(.27,.875)],[(.65,.65),(.735,.65),(.735,.875),(.65,.875)],[(.77,.65),(.855,.65),(.855,.875),(.77,.875)]],
    "traps": [[(.69,.135),(.815,.135),(.815,.34),(.69,.34)]],
    "upper_back": [[(.64,.195),(.725,.19),(.74,.38),(.635,.37)],[(.78,.19),(.865,.195),(.87,.37),(.765,.38)]],
    "lats": [[(.64,.285),(.725,.30),(.745,.455),(.66,.47),(.62,.38)],[(.78,.30),(.865,.285),(.90,.38),(.86,.47),(.765,.455)]],
    "lower_back": [[(.70,.345),(.815,.345),(.84,.49),(.755,.52),(.675,.49)]],
    "glutes": [[(.65,.43),(.755,.43),(.755,.56),(.645,.56)],[(.755,.43),(.86,.43),(.865,.56),(.755,.56)]],
    "hamstrings": [[(.645,.535),(.755,.535),(.745,.69),(.64,.69)],[(.755,.535),(.865,.535),(.87,.69),(.765,.69)]],
}

# Find the anatomical islands first. A selector may identify an island, but it
# can never slice through it: the complete connected muscle is always painted.
ink = gray < 150
seen = np.zeros((h, w), dtype=bool)
components = []
for sy in range(h):
    for sx in range(w):
        if not ink[sy, sx] or seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        seen[sy, sx] = True
        points = []
        while stack:
            y, x = stack.pop()
            points.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and ink[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(points) >= 30:  # retain small serratus, oblique and forearm islands
            components.append(points)

def point_in_polygon(x, y, polygon):
    inside = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

def polygon_area(polygon):
    return abs(sum(
        polygon[i][0] * polygon[(i + 1) % len(polygon)][1]
        - polygon[(i + 1) % len(polygon)][0] * polygon[i][1]
        for i in range(len(polygon))
    )) / 2

# Every anatomical island belongs to exactly one mask. When selectors overlap,
# the smallest (most specific) region wins. This prevents a grey/untrained mask
# from tinting a red/fatigued muscle and creating two shades of the same status.
classified = []
for points in components:
    cy = sum(p[0] for p in points) / len(points) / h
    cx = sum(p[1] for p in points) / len(points) / w
    candidates = []
    for name, polygons in regions.items():
        for polygon in polygons:
            if point_in_polygon(cx, cy, polygon):
                candidates.append((polygon_area(polygon), name))
    if candidates:
        _, winner = min(candidates)
        classified.append({"points": points, "cx": cx, "cy": cy, "size": len(points), "winner": winner})

# Hevy exposes muscle groups, not left/right activation. Pair every anatomical
# island with its mirrored counterpart so a bilateral group can never appear
# trained on only one side because of a selector boundary.
for center, left_edge, right_edge in ((0.251, 0.03, 0.48), (0.748, 0.52, 0.97)):
    left = [c for c in classified if left_edge < c["cx"] < center]
    right = [c for c in classified if center < c["cx"] < right_edge]
    used = set()
    for item in left:
        target_x = 2 * center - item["cx"]
        matches = []
        for candidate in right:
            identity = id(candidate)
            if identity in used:
                continue
            size_ratio = candidate["size"] / item["size"]
            if not 0.72 <= size_ratio <= 1.38:
                continue
            distance = abs(candidate["cx"] - target_x) + abs(candidate["cy"] - item["cy"])
            if distance < 0.035:
                matches.append((distance, candidate))
        if matches:
            _, counterpart = min(matches, key=lambda match: match[0])
            counterpart["winner"] = item["winner"]
            used.add(id(counterpart))

assigned = {name: [] for name in regions}
for item in classified:
    assigned[item["winner"]].append(item["points"])

for name in regions:
    island_mask = np.zeros((h, w), dtype=np.uint8)
    for points in assigned[name]:
        for y, x in points:
            island_mask[y, x] = 255

    # A one-pixel expansion restores antialiased edge pixels without crossing
    # the light anatomical gutters between neighbouring muscles.
    expanded = np.asarray(Image.fromarray(island_mask).filter(ImageFilter.MaxFilter(3)))
    selected = np.minimum(muscle_alpha, expanded).astype(np.uint8)
    mask = np.zeros((h, w, 4), dtype=np.uint8)
    mask[:, :, :3] = 255
    mask[:, :, 3] = selected
    Image.fromarray(mask, "RGBA").resize((w * scale, h * scale), resample).save(OUT / f"{name}.png", optimize=True)

print(f"Wrote {w*scale}x{h*scale} base and {len(regions)} exact muscle masks to {OUT}")
