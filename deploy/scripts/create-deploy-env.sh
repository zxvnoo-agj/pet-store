#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

read_env_value() {
    local file="$1"
    local key="$2"
    if [ ! -f "$file" ]; then
        return 0
    fi
    awk -F= -v key="$key" '
        $1 == key {
            sub(/^[^=]*=/, "")
            print
            exit
        }
    ' "$file"
}

random_hex() {
    local bytes="${1:-32}"
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex "$bytes"
    else
        tr -dc 'a-f0-9' < /dev/urandom | head -c "$((bytes * 2))"
    fi
}

value_or_random() {
    local value="$1"
    local bytes="${2:-32}"
    if [ -n "$value" ] && [[ "$value" != \<* ]]; then
        printf '%s' "$value"
    else
        random_hex "$bytes"
    fi
}

value_or_blank() {
    local value="$1"
    if [ -n "$value" ] && [[ "$value" != \<* ]]; then
        printf '%s' "$value"
    fi
}

write_env() {
    local mode="$1"
    local source_file="$2"
    local target_file="$3"
    local db_name="$4"
    local redis_db="$5"
    local api_domain="$6"
    local cors_origins="$7"

    local postgres_password secret_key metrics_token meili_key
    if [ -f "$target_file" ] && [ "${FORCE:-0}" != "1" ]; then
        echo "Skip existing ${target_file#$ROOT_DIR/}. Set FORCE=1 to overwrite."
        return
    fi

    postgres_password="$(random_hex 24)"
    secret_key="$(value_or_random "$(read_env_value "$source_file" SECRET_KEY)" 32)"
    metrics_token="$(random_hex 32)"
    meili_key="$(value_or_random "$(read_env_value "$source_file" MEILISEARCH_API_KEY)" 32)"

    umask 077
    {
        printf 'APP_ENV=%s\n' "$mode"
        printf 'DEBUG=false\n'
        printf '\n'
        printf 'API_DOMAIN=%s\n' "$api_domain"
        printf 'ADMIN_DOMAIN=admin.pawpalai.cn\n'
        printf 'STAGING_API_DOMAIN=staging.api.pawpalai.cn\n'
        printf 'CORS_ORIGINS=%s\n' "$cors_origins"
        printf '\n'
        printf 'POSTGRES_PASSWORD=%s\n' "$postgres_password"
        printf 'DATABASE_URL=postgresql+asyncpg://petshop:%s@postgres:5432/%s\n' "$postgres_password" "$db_name"
        printf 'REDIS_URL=redis://redis:6379/%s\n' "$redis_db"
        printf 'SECRET_KEY=%s\n' "$secret_key"
        printf 'METRICS_TOKEN=%s\n' "$metrics_token"
        printf 'ACCESS_TOKEN_EXPIRE_DAYS=7\n'
        printf '\n'
        printf 'WECHAT_APP_ID=%s\n' "$(value_or_blank "$(read_env_value "$source_file" WECHAT_APP_ID)")"
        printf 'WECHAT_APP_SECRET=%s\n' "$(value_or_blank "$(read_env_value "$source_file" WECHAT_APP_SECRET)")"
        printf '\n'
        printf 'DASHSCOPE_API_KEY=%s\n' "$(value_or_blank "$(read_env_value "$source_file" DASHSCOPE_API_KEY)")"
        printf 'DASHSCOPE_MODEL=%s\n' "$(value_or_blank "$(read_env_value "$source_file" DASHSCOPE_MODEL)")"
        printf 'DASHSCOPE_BASE_URL=%s\n' "$(value_or_blank "$(read_env_value "$source_file" DASHSCOPE_BASE_URL)")"
        printf 'OPENAI_API_KEY=%s\n' "$(value_or_blank "$(read_env_value "$source_file" OPENAI_API_KEY)")"
        printf 'OPENAI_MODEL=%s\n' "$(value_or_blank "$(read_env_value "$source_file" OPENAI_MODEL)")"
        printf 'DEEPSEEK_API_KEY=%s\n' "$(value_or_blank "$(read_env_value "$source_file" DEEPSEEK_API_KEY)")"
        printf 'DEEPSEEK_BASE_URL=%s\n' "$(value_or_blank "$(read_env_value "$source_file" DEEPSEEK_BASE_URL)")"
        printf 'DEEPSEEK_MODEL=%s\n' "$(value_or_blank "$(read_env_value "$source_file" DEEPSEEK_MODEL)")"
        printf '\n'
        printf 'MEILISEARCH_URL=http://meilisearch:7700\n'
        printf 'MEILISEARCH_API_KEY=%s\n' "$meili_key"
        printf '\n'
        printf 'PDD_CLIENT_ID=%s\n' "$(value_or_blank "$(read_env_value "$source_file" PDD_CLIENT_ID)")"
        printf 'PDD_CLIENT_SECRET=%s\n' "$(value_or_blank "$(read_env_value "$source_file" PDD_CLIENT_SECRET)")"
        printf 'PDD_PID=%s\n' "$(value_or_blank "$(read_env_value "$source_file" PDD_PID)")"
        printf 'XHS_COOKIE=%s\n' "$(value_or_blank "$(read_env_value "$source_file" XHS_COOKIE)")"
        printf 'XHS_BACKUP_COOKIE=%s\n' "$(value_or_blank "$(read_env_value "$source_file" XHS_BACKUP_COOKIE)")"
        printf 'PLAYWRIGHT_HEADLESS=%s\n' "$(value_or_blank "$(read_env_value "$source_file" PLAYWRIGHT_HEADLESS)")"
        printf 'CRAWL_DAILY_LIMIT=%s\n' "$(value_or_blank "$(read_env_value "$source_file" CRAWL_DAILY_LIMIT)")"
    } > "$target_file"
}

mkdir -p "$ROOT_DIR/deploy/production" "$ROOT_DIR/deploy/staging"

write_env \
    "prod" \
    "$ROOT_DIR/backend/.env.prod" \
    "$ROOT_DIR/deploy/production/.env.production" \
    "petshop" \
    "0" \
    "api.pawpalai.cn" \
    "https://api.pawpalai.cn,https://admin.pawpalai.cn,https://staging.api.pawpalai.cn"

write_env \
    "staging" \
    "$ROOT_DIR/backend/.env.dev" \
    "$ROOT_DIR/deploy/staging/.env.staging" \
    "petshop_staging" \
    "1" \
    "staging.api.pawpalai.cn" \
    "https://staging.api.pawpalai.cn,http://localhost:10086,http://localhost:3001"

echo "Done preparing deploy environment files."
echo "Review any blank third-party credentials before deploying."
