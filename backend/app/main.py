import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import (
    admin_auth,
    admin_categories,
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
    request_id = request.headers.get("X-Request-ID", "")

    logger.info(
        f"Request started: {request.method} {request.url.path} - ID: {request_id}"
    )

    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        logger.info(
            f"Request completed: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - Time: {process_time:.3f}s"
        )
        return response
    except Exception as exc:
        process_time = time.time() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url.path} - "
            f"Time: {process_time:.3f}s - Error: {exc}"
        )
        raise


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "message": exc.detail, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
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
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"code": 5000, "message": "Internal server error", "data": None},
    )


@app.get("/health")
async def health_check():
    return {"status": "ok"}


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
app.include_router(admin_data_sources.router, prefix="/v1")
