#!/usr/bin/env bash
# Сборка ZIP-архива для загрузки в Консоль Яндекс Игр.
# Требования: index.html в корне, без кириллицы/пробелов в путях, <= 100 МБ.
set -e
cd "$(dirname "$0")"

python - <<'PY'
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "nebesniy-uvorot.zip")
INCLUDE = ["index.html", "css", "js"]

# Проверка: кириллица и пробелы в путях
bad = []
for item in INCLUDE:
    p = os.path.join(ROOT, item)
    if os.path.isfile(p):
        files = [item]
    else:
        files = [os.path.relpath(os.path.join(dp, f), ROOT)
                 for dp, _, fs in os.walk(p) for f in fs]
    for rel in files:
        name = rel.replace("\\", "/")
        if any("\u0400" <= ch <= "\u04FF" for ch in name) or " " in name:
            bad.append(name)
if bad:
    print("ОШИБКА: кириллица или пробелы в путях:")
    print("\n".join(bad))
    sys.exit(1)

if os.path.exists(OUT):
    os.remove(OUT)

total = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for item in INCLUDE:
        p = os.path.join(ROOT, item)
        if os.path.isfile(p):
            z.write(p, item.replace("\\", "/"))
            total += os.path.getsize(p)
        else:
            for dp, _, fs in os.walk(p):
                for f in fs:
                    full = os.path.join(dp, f)
                    rel = os.path.relpath(full, ROOT).replace("\\", "/")
                    z.write(full, rel)
                    total += os.path.getsize(full)

print(f"Собран nebesniy-uvorot.zip")
print(f"Распакованный размер сборки: {total / 1024:.1f} КБ (лимит: 100 МБ)")
with zipfile.ZipFile(OUT) as z:
    names = z.namelist()
    print("index.html в корне:", "index.html" in names)
    print("Файлов в архиве:", len(names))
    for n in names:
        print(" -", n)
PY
