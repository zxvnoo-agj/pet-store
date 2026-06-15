from functools import lru_cache
from pathlib import Path


DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "sensitive_words.txt"


@lru_cache(maxsize=1)
def load_sensitive_words() -> tuple[str, ...]:
    if not DATA_FILE.exists():
        return ()

    words = []
    for line in DATA_FILE.read_text(encoding="utf-8").splitlines():
        word = line.strip()
        if word and not word.startswith("#"):
            words.append(word.lower())
    return tuple(dict.fromkeys(words))


def find_sensitive_words(content: str) -> list[str]:
    normalized = content.lower()
    return [word for word in load_sensitive_words() if word in normalized]


def contains_sensitive_words(content: str) -> bool:
    return bool(find_sensitive_words(content))
