#!/usr/bin/env python3
"""
Собирает все JPEG-файлы из папки upl/ в один PDF-файл.

Использование:
    python3 jpeg_to_pdf.py
    python3 jpeg_to_pdf.py --input upl --output result.pdf
"""

import argparse
import sys
from pathlib import Path

from PIL import Image


def natural_key(path: Path):
    """Сортировка вида: img1, img2, img10 (а не img1, img10, img2)."""
    import re
    return [int(t) if t.isdigit() else t.lower()
            for t in re.split(r"(\d+)", path.stem)]


def collect_jpegs(folder: Path) -> list[Path]:
    exts = {".jpg", ".jpeg", ".JPG", ".JPEG"}
    files = [p for p in folder.iterdir() if p.is_file() and p.suffix in exts]
    files.sort(key=natural_key)
    return files


def build_pdf(folder: str, output: str) -> None:
    src_folder = Path(folder)
    if not src_folder.is_dir():
        print(f"Ошибка: папка '{folder}' не найдена.", file=sys.stderr)
        sys.exit(1)

    jpeg_files = collect_jpegs(src_folder)
    if not jpeg_files:
        print(f"В папке '{folder}' не найдено JPEG-файлов.", file=sys.stderr)
        sys.exit(1)

    print(f"Найдено {len(jpeg_files)} файлов:")
    for f in jpeg_files:
        print(f"  - {f.name}")

    images = []
    for f in jpeg_files:
        img = Image.open(f)
        # Конвертируем в RGB на случай CMYK/палитровых JPEG
        if img.mode != "RGB":
            img = img.convert("RGB")
        images.append(img)

    first, rest = images[0], images[1:]
    first.save(output, save_all=True, append_images=rest)

    print(f"\nГотово! PDF сохранён как: {output}")


def parse_args():
    parser = argparse.ArgumentParser(description="Собрать JPEG-файлы из папки в один PDF.")
    parser.add_argument("--input", "-i", default="upl", help="Папка с JPEG-файлами (по умолчанию: upl)")
    parser.add_argument("--output", "-o", default="output.pdf", help="Имя итогового PDF-файла (по умолчанию: output.pdf)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    build_pdf(args.input, args.output)
