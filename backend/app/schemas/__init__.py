# Pydantic schemas for request/response validation
from pydantic import BaseModel

class HealthCheck(BaseModel):
    status: str
