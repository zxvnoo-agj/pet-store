from app.services.sensitive_words import find_sensitive_words


def test_find_sensitive_words_returns_matches():
    assert "诈骗" in find_sensitive_words("这是诈骗内容")


def test_find_sensitive_words_ignores_clean_content():
    assert find_sensitive_words("猫咪吃了以后状态不错") == []
