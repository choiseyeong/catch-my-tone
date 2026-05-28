"""
옷 색상 분석 → 12 퍼스널컬러 타입 매칭 (빌드타임 배치 스크립트)

파이프라인:
  1) mydocs/12 color type.md 에서 12타입 assort 팔레트(타입당 16색) 파싱 → Lab 변환
  2) data/cloth_UTF8.csv 의 각 상품 이미지(image_url) 다운로드 (캐시)
  3) 흰 배경 제품컷 가정 → 중앙 크롭 + K-means 로 배경 제외한 대표색 추출
  4) 대표색 RGB → Lab. 채도(chroma)가 낮으면 무채색으로 보고 명도(L*)로 분류,
     아니면 12타입 팔레트와 CIEDE2000 색거리로 가까운 상위 N타입에 복수 태그
  5) 결과를 data/cloth_analysis.json 으로 저장 (프론트가 읽어 추천에 사용)

실행:  python data/analyze_clothes.py
"""

import os
import csv
import json
import re
import time
import io

import numpy as np
import requests
from PIL import Image
from sklearn.cluster import KMeans

# ─── 경로 ─────────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CSV_PATH = os.path.join(HERE, "cloth_UTF8.csv")
PALETTE_MD = os.path.join(ROOT, "mydocs", "12 color type.md")
OUT_JSON = os.path.join(HERE, "cloth_analysis.json")
CACHE_DIR = os.path.join(HERE, "images_cache")

# md 헤더(한글) → 표준 영문 키 (프론트 determineSubtype 결과와 매핑)
TYPE_KEY = {
    "봄 브라이트": "spring-bright", "봄 트루": "spring-true", "봄 라이트": "spring-light",
    "여름 라이트": "summer-light", "여름 트루": "summer-true", "여름 뮤트": "summer-mute",
    "가을 뮤트": "autumn-mute", "가을 트루": "autumn-true", "가을 딥": "autumn-deep",
    "겨울 딥": "winter-deep", "겨울 트루": "winter-true", "겨울 브라이트": "winter-bright",
}

TOP_N = 3            # 옷 하나당 매칭할 타입 수 (복수 태그)
ACHROMATIC_C = 4.0   # Lab chroma 가 이 값 미만이면 무채색으로 간주

# ─── 색공간 변환 (RGB → XYZ → Lab, D65) ───────────────────────────────────────
def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)

def rgb_to_lab(rgb):
    """rgb: (...,3) 0~255 → lab (...,3)"""
    rgb = np.asarray(rgb, dtype=float)
    lin = srgb_to_linear(rgb)
    R, G, B = lin[..., 0], lin[..., 1], lin[..., 2]
    X = (R * 0.4124 + G * 0.3576 + B * 0.1805) * 100
    Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) * 100
    Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) * 100
    refX, refY, refZ = 95.047, 100.0, 108.883
    x, y, z = X / refX, Y / refY, Z / refZ
    def f(t):
        return np.where(t > 0.008856, np.cbrt(t), (7.787 * t) + (16 / 116))
    fx, fy, fz = f(x), f(y), f(z)
    L = (116 * fy) - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)
    return np.stack([L, a, b], axis=-1)

def hex_to_rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

# ─── CIEDE2000 색거리 ─────────────────────────────────────────────────────────
def ciede2000(lab1, lab2):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    avg_Lp = (L1 + L2) / 2.0
    C1 = np.hypot(a1, b1)
    C2 = np.hypot(a2, b2)
    avg_C = (C1 + C2) / 2.0
    G = 0.5 * (1 - np.sqrt((avg_C ** 7) / (avg_C ** 7 + 25 ** 7)))
    a1p = (1 + G) * a1
    a2p = (1 + G) * a2
    C1p = np.hypot(a1p, b1)
    C2p = np.hypot(a2p, b2)
    avg_Cp = (C1p + C2p) / 2.0
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    if abs(h1p - h2p) > 180:
        avg_Hp = (h1p + h2p + 360) / 2.0
    else:
        avg_Hp = (h1p + h2p) / 2.0
    T = (1 - 0.17 * np.cos(np.radians(avg_Hp - 30))
         + 0.24 * np.cos(np.radians(2 * avg_Hp))
         + 0.32 * np.cos(np.radians(3 * avg_Hp + 6))
         - 0.20 * np.cos(np.radians(4 * avg_Hp - 63)))
    dhp = h2p - h1p
    if abs(dhp) > 180:
        dhp += 360 if dhp < 0 else -360
    dLp = L2 - L1
    dCp = C2p - C1p
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp) / 2.0)
    SL = 1 + (0.015 * (avg_Lp - 50) ** 2) / np.sqrt(20 + (avg_Lp - 50) ** 2)
    SC = 1 + 0.045 * avg_Cp
    SH = 1 + 0.015 * avg_Cp * T
    dRo = 30 * np.exp(-(((avg_Hp - 275) / 25) ** 2))
    RC = 2 * np.sqrt((avg_Cp ** 7) / (avg_Cp ** 7 + 25 ** 7))
    RT = -RC * np.sin(np.radians(2 * dRo))
    return np.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2
                   + RT * (dCp / SC) * (dHp / SH))

# ─── 12타입 팔레트 파싱 ────────────────────────────────────────────────────────
def parse_palettes(md_path):
    palettes = {}
    cur = None
    with open(md_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            m = re.match(r"^###\s+(.+)$", line)
            if m:
                name = m.group(1).strip()
                cur = TYPE_KEY.get(name)
                if cur:
                    palettes[cur] = []
                continue
            if cur and line.startswith("#"):
                for hx in re.findall(r"#[0-9A-Fa-f]{6}", line):
                    palettes[cur].append(hex_to_rgb(hx))
    return {k: rgb_to_lab(np.array(v)) for k, v in palettes.items() if v}

# ─── 이미지 다운로드 (캐시) ─────────────────────────────────────────────────────
def fetch_image(url, item_id):
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache = os.path.join(CACHE_DIR, f"{item_id}.jpg")
    if os.path.exists(cache):
        try:
            return Image.open(cache).convert("RGB")
        except Exception:
            pass
    headers = {"User-Agent": "Mozilla/5.0 (personal-color-termproject; educational use)"}
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    img.save(cache, "JPEG", quality=90)
    return img

# ─── 대표색 추출 (흰 배경 제외 + 중앙 크롭 + K-means) ──────────────────────────
def extract_dominant_rgb(img, k=5):
    img = img.copy()
    img.thumbnail((220, 220))
    arr = np.asarray(img, dtype=float)
    h, w, _ = arr.shape
    # 중앙 60% 크롭 — 제품은 중앙, 가장자리는 배경일 확률이 큼
    y0, y1 = int(h * 0.20), int(h * 0.80)
    x0, x1 = int(w * 0.20), int(w * 0.80)
    crop = arr[y0:y1, x0:x1].reshape(-1, 3)

    km = KMeans(n_clusters=min(k, len(crop)), n_init=4, random_state=0)
    labels = km.fit_predict(crop)
    centers = km.cluster_centers_
    counts = np.bincount(labels, minlength=len(centers))

    # 배경 판정: 매우 밝고(min채널>215) 무채색(채널 폭<16)
    def is_bg(c):
        return c.min() > 215 and (c.max() - c.min()) < 16
    fg_idx = [i for i in range(len(centers)) if not is_bg(centers[i])]
    if not fg_idx:                     # 전부 배경 같음(=흰 옷) → 전체 사용
        fg_idx = list(range(len(centers)))

    best = max(fg_idx, key=lambda i: counts[i])
    return tuple(centers[best])

# ─── 분류 ──────────────────────────────────────────────────────────────────────
def classify_achromatic(L):
    """무채색은 명도로 갈라 매칭 (복수 태그)."""
    if L >= 75:
        return ["spring-light", "summer-light", "summer-true"]
    if L <= 30:
        return ["winter-deep", "winter-true", "autumn-deep"]
    return ["summer-mute", "autumn-mute", "winter-true"]

def classify_chromatic(lab, palettes):
    scores = {}
    for key, pal in palettes.items():
        scores[key] = float(min(ciede2000(lab, p) for p in pal))
    ranked = sorted(scores, key=scores.get)
    return ranked[:TOP_N], scores

# ─── 메인 ──────────────────────────────────────────────────────────────────────
def main():
    palettes = parse_palettes(PALETTE_MD)
    print(f"팔레트 로드: {len(palettes)}개 타입")

    items = []
    with open(CSV_PATH, encoding="utf-8-sig") as f:  # utf-8-sig: BOM 제거
        reader = csv.DictReader(f)
        for row in reader:
            url = (row.get("image_url") or "").strip()
            if not url:
                continue
            item_id = row.get("id", "").strip()
            try:
                img = fetch_image(url, item_id)
            except Exception as e:
                print(f"  [skip] id={item_id} 이미지 실패: {e}")
                continue

            rgb = extract_dominant_rgb(img)
            lab = rgb_to_lab(np.array(rgb))
            L, a, b = [float(x) for x in lab]
            chroma = float(np.hypot(a, b))
            achromatic = chroma < ACHROMATIC_C

            if achromatic:
                types = classify_achromatic(L)
                scores = None
            else:
                types, scores = classify_chromatic(lab, palettes)

            hexv = "#{:02X}{:02X}{:02X}".format(*(int(round(c)) for c in rgb))
            items.append({
                "id": int(item_id) if item_id.isdigit() else item_id,
                "brand": (row.get("brand") or "").strip(),
                "name": (row.get("name") or "").strip(),
                "price": int(row["price"]) if (row.get("price") or "").strip().isdigit() else None,
                "product_url": (row.get("product_url") or "").strip(),
                "image_url": url,
                "dominant_hex": hexv,
                "lab": [round(L, 2), round(a, 2), round(b, 2)],
                "chroma": round(chroma, 2),
                "achromatic": achromatic,
                "types": types,
                "scores": ({k: round(v, 2) for k, v in scores.items()} if scores else None),
            })
            print(f"  id={item_id:>3} {hexv}  C={chroma:5.1f}  -> {', '.join(types)}")
            time.sleep(0.3)   # 예의상 rate limit

    out = {"generated_count": len(items), "top_n": TOP_N, "items": items}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n저장 완료: {OUT_JSON}  ({len(items)}개)")

    print_rank_summary(items)

# ─── 타입별 1·2·3순위 선정 개수 집계 출력 ────────────────────────────────────
def print_rank_summary(items):
    order = ["spring-bright", "spring-true", "spring-light",
             "summer-light", "summer-true", "summer-mute",
             "autumn-mute", "autumn-true", "autumn-deep",
             "winter-deep", "winter-true", "winter-bright"]
    rank = {k: [0, 0, 0] for k in order}   # [1순위, 2순위, 3순위]
    total = {k: 0 for k in order}
    achromatic = 0
    for it in items:
        if it.get("achromatic"):
            achromatic += 1
        for pos, t in enumerate(it["types"][:3]):
            if t in rank:
                rank[t][pos] += 1
                total[t] += 1

    print(f"\n타입별 순위 선정 개수  (총 {len(items)}개, 무채색 {achromatic}개)")
    print(f"{'TYPE':16} 1순위 2순위 3순위  합계")
    print("-" * 42)
    for k in order:
        r = rank[k]
        print(f"{k:16} {r[0]:4} {r[1]:4} {r[2]:4}  {total[k]:4}")
    print("-" * 42)
    zero1 = [k for k in order if rank[k][0] == 0]
    print("1순위 0회 타입:", ", ".join(zero1) if zero1 else "없음")
    never = [k for k in order if total[k] == 0]
    print("한 번도 매칭 안 된 타입:", ", ".join(never) if never else "없음")

if __name__ == "__main__":
    main()
