"""Seed admin user for development."""
import asyncio
import sys

sys.path.insert(0, "/home/zxv/code/pet-store/backend")

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User


async def seed_admin_user():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.openid == "admin:admin")
        )
        existing = result.scalar_one_or_none()

        if existing:
            print("Admin user already exists")
            return

        result = await db.execute(
            select(User).where(User.id == 1)
        )
        mock_user = result.scalar_one_or_none()

        if mock_user:
            mock_user.openid = "admin:admin"
            mock_user.nickname = "Administrator"
            mock_user.is_admin = True
            mock_user.profile = {"password_hash": get_password_hash("admin")}
            await db.commit()
            print("Mock user upgraded to admin: admin / admin")
            return

        admin = User(
            openid="admin:admin",
            nickname="Administrator",
            is_admin=True,
            profile={"password_hash": get_password_hash("admin")},
        )
        db.add(admin)
        await db.commit()
        print("Admin user created: admin / admin")


if __name__ == "__main__":
    asyncio.run(seed_admin_user())
