from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="宠物用品选购助手 API",
    description="宠物用品选购助手小程序后端服务",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Pet Supplies API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
