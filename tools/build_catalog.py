"""Builds the catalog from the studio-style product photos found in the shop's public Telegram channel (Black Friday price infographics, the Moon Boot
colour chart, the Travis Scott pink photo): every product is cut out of its white background and saved as a transparent PNG (img/products/*.png), and
data/products.json is written with colour variants (like nike.com colour swatches).

    python tools/build_catalog.py        (needs the crops in _source/crops: bf-XX.png, moon-XX.png and the original m2941-01.jpg in img/_candidates)

Names are given by looking at the pictures: brand/model/colour should be confirmed by the shop (see 'check': True)."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CROPS, OUT = ROOT / "_source" / "crops", ROOT / "img" / "products"
OUT.mkdir(parents=True, exist_ok=True)


def cutout(src: Path, dst: Path, scale=2, pad=18):
    """White studio background -> transparent: flood fill from the borders (white parts INSIDE the product are kept), soft edge, tight crop + padding."""
    im = Image.open(src).convert("RGB")
    im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    w, h = im.size
    work = im.copy()
    key = (255, 0, 255)
    for pt in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if sum(work.getpixel(pt)) > 690:                                      # only start from (near) white border pixels
            ImageDraw.floodfill(work, pt, key, thresh=26)
    mask = work.convert("RGB").point(lambda v: v)                              # copy
    bg = Image.new("L", (w, h), 0)
    px, mp = work.load(), bg.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == key:
                mp[x, y] = 255
    alpha = bg.point(lambda v: 255 - v).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    rgba = im.convert("RGBA"); rgba.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        rgba = rgba.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad)))
    rgba.save(dst, optimize=True)
    return dst.name


def P(id, name, brand, category, subtitle, colors, **kw):
    d = dict(id=id, name=name, brand=brand, category=category, subtitle=subtitle, price=None, availability="Наличие уточняйте", new=False, tag="", sizes=[],
             description="Фото из каталога магазина. Цвет, размер, наличие и цену уточняйте у менеджера.", colors=colors, check=True)
    d.update(kw)
    return d


# (file in _source/crops or _candidates, colour name, hex)
def C(src, color, hexv): return (src, color, hexv)


CATALOG = [
    P("jordan-1-low-travis-scott", "Air Jordan 1 Low x Travis Scott", "Jordan", "Обувь", "Коллаб · мужская и женская обувь",
      [C("bf-02.png", "Mocha", "#4a3a31"), C("../candidates/m2941-01.jpg", "Pink", "#e9a3b8")], tag="Лимитированный выпуск", new=True,
      availability="Предзаказ", sizes=["35.5", "36", "36.5", "37.5", "38", "38.5", "39", "40", "40.5", "41", "42", "42.5", "43", "44", "44.5", "45", "45.5", "46", "47", "47.5", "48"],
      description="Размеры 35.5–48 EU, также доступны детские. Pink доступен к заказу до официального релиза."),
    P("jordan-1-low", "Air Jordan 1 Low", "Jordan", "Обувь", "Мужская и женская обувь",
      [C("bf-03.png", "Mocha / Black", "#6b5646"), C("bf-14.png", "Black Patent", "#111111"), C("bf-15.png", "Green Toe", "#1c7a5a"), C("bf-16.png", "Grey", "#8d98ad"), C("bf-17.png", "Ice Blue", "#bcd6ee")], new=True),
    P("jordan-1-high", "Air Jordan 1 High", "Jordan", "Обувь", "Мужская и женская обувь", [C("bf-23.png", "Grey / White", "#b4b0ba"), C("bf-24.png", "University Blue", "#8fb1de")]),
    P("jordan-4", "Air Jordan 4", "Jordan", "Обувь", "Мужская и женская обувь", [C("bf-22.png", "Taupe", "#7d6a5c"), C("bf-25.png", "Denim", "#9dbad6")]),
    P("nike-dunk-low", "Nike Dunk Low", "Nike", "Обувь", "Мужская и женская обувь",
      [C("bf-10.png", "Lemon", "#e5dc86"), C("bf-11.png", "Rose / Red", "#d99a90"), C("bf-12.png", "Mocha", "#8a6a55"), C("bf-13.png", "Emerald", "#1f9a72")], new=True),
    P("nike-shox-r4", "Nike Shox R4", "Nike", "Обувь", "Мужская и женская обувь", [C("bf-20.png", "Black", "#1b1b1b")]),
    P("new-balance", "New Balance", "New Balance", "Обувь", "Мужская и женская обувь", [C("bf-00.png", "Grey (2002R)", "#8d8a85"), C("bf-18.png", "Taupe", "#8a7a6e")]),
    P("on-cloudtilt", "On Cloudtilt", "On", "Обувь", "Беговые кроссовки", [C("bf-19.png", "White", "#efefef")]),
    P("salomon-xt-6", "Salomon XT-6", "Salomon", "Обувь", "Мужская и женская обувь", [C("bf-21.png", "Black / Silver", "#222222")]),
    P("adidas-samba", "adidas Samba OG", "adidas", "Обувь", "Мужская и женская обувь", [C("bf-01.png", "White / Black", "#f0f0f0")]),
    P("adidas-gazelle", "adidas Gazelle Indoor", "adidas", "Обувь", "Мужская и женская обувь", [C("bf-26.png", "Green", "#1d6b52"), C("bf-29.png", "Pink", "#eba08c")]),
    P("adidas-spezial", "adidas Handball Spezial", "adidas", "Обувь", "Мужская и женская обувь", [C("bf-27.png", "Navy", "#1f3b7a"), C("bf-28.png", "Brown", "#7d6a5a")]),
    P("moon-boot-icon", "Moon Boot Icon", "Moon Boot", "Обувь", "Зимняя обувь · высокие",
      [C("moon-00.png", "Black", "#111111"), C("moon-01.png", "White", "#f2f2f2"), C("moon-02.png", "Navy", "#1c2a5a"), C("moon-03.png", "Yellow", "#f0c21a"), C("moon-04.png", "Brown", "#6a3b22"), C("moon-05.png", "Blue", "#1f4fd6")],
      availability="В наличии в Ереване", description="Самая удобная обувь на зиму и горнолыжный сезон. В наличии в магазине в Ереване. Цвет и размер уточняйте у менеджера."),
    P("moon-boot-icon-low", "Moon Boot Icon Low", "Moon Boot", "Обувь", "Зимняя обувь · низкие",
      [C("moon-06.png", "Black", "#111111"), C("moon-07.png", "White / Black", "#e9e9e9"), C("moon-08.png", "Yellow", "#f0b323"), C("moon-09.png", "White", "#f4f4f4"), C("moon-10.png", "Khaki", "#5f6a3a"),
       C("moon-11.png", "Lilac", "#a9a4e8"), C("moon-12.png", "Sky Blue", "#8fb0dd"), C("moon-13.png", "Pink", "#f0a7cb"), C("moon-14.png", "Black Patent", "#1a1a1a"), C("moon-15.png", "Navy", "#1f2e6b"),
       C("moon-16.png", "Silver", "#b5b7ba"), C("moon-17.png", "Camel", "#c07a3a")], availability="В наличии в Ереване",
      description="Самая удобная обувь на зиму и горнолыжный сезон. В наличии в магазине в Ереване. Цвет и размер уточняйте у менеджера."),
    P("moon-boot-low-plush", "Moon Boot Low · замша и мех", "Moon Boot", "Обувь", "Зимняя обувь · низкие",
      [C("moon-18.png", "Mustard / Brown", "#c99a2a"), C("moon-19.png", "Shearling", "#b9722e"), C("moon-20.png", "Taupe Suede", "#6e5c52"), C("moon-21.png", "Burgundy", "#5b1f2c"), C("moon-22.png", "Grey Felt", "#a5a8ad"), C("moon-23.png", "Teddy", "#b98a56")],
      availability="В наличии в Ереване"),
    P("kith-scarface-tee", "Kith x Scarface Tee", "Kith", "Одежда", "Футболка · коллаб", [C("bf-06.png", "Washed Black", "#3a3a3a")]),
    P("palace-mcdonalds-tee", "Palace x McDonald's Tee", "Palace", "Одежда", "Футболка · коллаб", [C("bf-04.png", "White", "#e8e8ea")]),
    P("chrome-hearts-tee", "Chrome Hearts Pocket Tee", "Chrome Hearts", "Одежда", "Футболка", [C("bf-07.png", "Black", "#101010")]),
]


def main():
    products = []
    for p in CATALOG:
        cols = []
        for k, (src, name, hexv) in enumerate(p["colors"]):
            path = (CROPS / src).resolve()
            dst = OUT / f"{p['id']}-{k + 1}.png"
            cutout(path, dst)
            cols.append({"name": name, "hex": hexv, "image": f"img/products/{dst.name}"})
        q = dict(p); q["colors"] = cols; q["images"] = [c["image"] for c in cols]
        products.append(q)
    data = {"demo": False, "currency": "AMD", "contacts": {"whatsapp": "37441773561", "telegram": "rootieyerevan", "instagram": "rootie.yerevan", "phone": "+374 41 773561"},
            "categories": ["Обувь", "Одежда"], "brands": sorted({p["brand"] for p in products}),
            "note": "Фото вырезаны из каталожных изображений публичного канала t.me/rrrutti1. Названия определены по фото ('check': true = подтвердить у магазина). Цен в канале нет.",
            "products": products}
    (ROOT / "data" / "products.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(len(products), "products,", sum(len(p["colors"]) for p in products), "cutouts")


if __name__ == "__main__":
    main()
