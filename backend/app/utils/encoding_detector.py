import chardet


def detect_encoding(file_path: str) -> str:
    """Detect the encoding of a text file.

    Reads the file in binary mode and uses chardet to detect encoding.
    Returns the detected encoding name. Falls back to utf-8 on low confidence.

    Args:
        file_path: Absolute or relative path to the text file.

    Returns:
        Encoding name string (e.g., 'utf-8', 'gbk').
    """
    with open(file_path, "rb") as f:
        raw = f.read()

    result = chardet.detect(raw)
    encoding = result["encoding"] if result.get("confidence", 0) > 0.7 else "utf-8"

    if encoding is None:
        encoding = "utf-8"

    encoding_lower = encoding.lower()
    if encoding_lower in ("gb2312", "gb18030"):
        encoding = "gbk"

    return encoding


def read_with_encoding(file_path: str) -> str:
    """Read a text file with automatic encoding detection.

    Args:
        file_path: Path to the text file.

    Returns:
        Decoded file content as a string.

    Raises:
        UnicodeDecodeError: If decoding fails with all attempted encodings.
    """
    encoding = detect_encoding(file_path)

    with open(file_path, "rb") as f:
        raw = f.read()

    try:
        return raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        return raw.decode("utf-8", errors="replace")
