import sys
import time
import uuid

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from loguru import logger
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.v1 import (
    admin_auth,
    admin_categories,
    admin_collect,
    admin_data_sources,
    admin_products,
    admin_reviews,
    auth,
    categories,
    chat,
    favorites,
    products,
    reviews,
    search,
)

# Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)
REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

logger.remove()
logger.add(
    sys.stderr,
    level="DEBUG" if settings.DEBUG else "INFO",
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<7}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
    colorize=True,
    backtrace=True,
    diagnose=False,
)
logger.add(
    "logs/error_{time:YYYY-MM-DD}.log",
    level="ERROR",
    rotation="1 day",
    retention="30 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<7} | {name}:{line} | {message}",
    backtrace=True,
    diagnose=True,
)

app = FastAPI(
    title="Pet Supplies Assistant API",
    description="Backend API for Pet Supplies Assistant Mini Program",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:10086", "http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    
    with logger.contextualize(request_id=request_id):
        logger.debug(
            "Request started",
            extra={
                "method": request.method,
                "path": request.url.path,
            }
        )

        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
            ).inc()
            REQUEST_DURATION.labels(
                method=request.method,
                endpoint=request.url.path,
            ).observe(process_time)
            
            return response
        except Exception:
            process_time = time.time() - start_time
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.url.path,
                status_code=500,
            ).inc()
            REQUEST_DURATION.labels(
                method=request.method,
                endpoint=request.url.path,
            ).observe(process_time)
            raise


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(
        "HTTP exception",
        extra={
            "path": request.url.path,
            "status_code": exc.status_code,
            "detail": exc.detail,
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "message": exc.detail, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning(
        "Validation error",
        extra={
            "path": request.url.path,
            "errors": errors,
        }
    )
    return JSONResponse(
        status_code=400,
        content={
            "code": 1001,
            "message": "Invalid parameters",
            "detail": errors[0] if errors else None,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception",
        extra={
            "path": request.url.path,
            "error_type": type(exc).__name__,
        }
    )
    return JSONResponse(
        status_code=500,
        content={"code": 5000, "message": "Internal server error", "data": None},
    )


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


app.include_router(categories.router, prefix="/v1")
app.include_router(products.router, prefix="/v1")
app.include_router(reviews.router, prefix="/v1")
app.include_router(chat.router, prefix="/v1")
app.include_router(auth.router, prefix="/v1")
app.include_router(favorites.router, prefix="/v1")
app.include_router(search.router, prefix="/v1")

# Admin routes
app.include_router(admin_auth.router, prefix="/v1")
app.include_router(admin_products.router, prefix="/v1")
app.include_router(admin_categories.router, prefix="/v1")
app.include_router(admin_reviews.router, prefix="/v1")
app.include_router(admin_collect.router, prefix="/v1")
app.include_router(admin_data_sources.router, prefix="/v1")
