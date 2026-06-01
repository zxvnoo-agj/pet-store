import base64
import json

from Crypto.Cipher import AES


class WeChatDecryptError(Exception): ...


def decrypt_user_info(session_key: str, encrypted_data: str, iv: str) -> dict:
    key = base64.b64decode(session_key)
    raw = base64.b64decode(encrypted_data)
    iv_bytes = base64.b64decode(iv)

    cipher = AES.new(key, AES.MODE_CBC, iv_bytes)
    decrypted = cipher.decrypt(raw)

    pad = decrypted[-1]
    decrypted = decrypted[:-pad]

    result = json.loads(decrypted)
    if "openId" not in result:
        raise WeChatDecryptError("decrypted data missing openId")
    return result
