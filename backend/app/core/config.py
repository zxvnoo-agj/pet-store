import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "dev"
    DATABASE_URL: str = "postgresql+asyncpg://petshop:petshop123@localhost:5432/petshop"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    WECHAT_APP_ID: str = ""
    WECHAT_APP_SECRET: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    DASHSCOPE_API_KEY: str = ""
    DASHSCOPE_MODEL: str = "deepseek-v4-flash"
    DASHSCOPE_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_API_KEY: str = ""
    PDD_CLIENT_ID: str = ""
    PDD_CLIENT_SECRET: str = ""
    PDD_PID: str = ""
    XHS_COOKIE: str = ""
    XHS_BACKUP_COOKIE: str = ""
    PLAYWRIGHT_HEADLESS: bool = True
    CRAWL_DAILY_LIMIT: int = 200
    DEBUG: bool = False

    model_config = SettingsConfigDict(case_sensitive=True)


@lru_cache
def get_settings() -> Settings:
    env = os.getenv("APP_ENV", "dev")
    env_file = f".env.{env}"
    return Settings(_env_file=env_file)


settings = get_settings()
