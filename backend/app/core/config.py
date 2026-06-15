import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "dev"
    API_DOMAIN: str = "api.pawpalai.cn"
    ADMIN_DOMAIN: str = "admin.pawpalai.cn"
    STAGING_API_DOMAIN: str = "staging.api.pawpalai.cn"
    CORS_ORIGINS: str = "http://localhost:10086,http://localhost:3001,http://localhost:3000"
    DATABASE_URL: str = "postgresql+asyncpg://petshop:petshop123@localhost:5432/petshop"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production"
    METRICS_TOKEN: str = ""
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    WECHAT_APP_ID: str = ""
    WECHAT_APP_SECRET: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    DASHSCOPE_API_KEY: str = ""
    DASHSCOPE_MODEL: str = ""
    DASHSCOPE_BASE_URL: str = ""
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"
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

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.APP_ENV == "prod":
            production_origins = [
                f"https://{self.API_DOMAIN}",
                f"https://{self.ADMIN_DOMAIN}",
                f"https://{self.STAGING_API_DOMAIN}",
            ]
            origins.extend(origin for origin in production_origins if origin not in origins)
        return origins


@lru_cache
def get_settings() -> Settings:
    env = os.getenv("APP_ENV", "dev")
    env_file = f".env.{env}"
    return Settings(_env_file=env_file)


settings = get_settings()
