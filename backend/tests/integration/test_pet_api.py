import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_breeds(async_client: AsyncClient):
    response = await async_client.get("/v1/pet-breeds?species=cat")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "breeds" in data["data"]


@pytest.mark.asyncio
async def test_list_breeds_invalid_species(async_client: AsyncClient):
    response = await async_client.get("/v1/pet-breeds?species=invalid")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_pet_unauthorized(async_client: AsyncClient):
    response = await async_client.post(
        "/v1/pets",
        json={"species": "cat", "nickname": "团子"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_and_list_pets(async_client: AsyncClient):
    auth_response = await async_client.post(
        "/v1/auth/login",
        json={"code": "test_code"},
    )
    if auth_response.status_code != 200:
        pytest.skip("Auth not configured in test environment")
    token = auth_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await async_client.post(
        "/v1/pets",
        json={"species": "cat", "nickname": "团子", "age_months": 3},
        headers=headers,
    )
    assert create_resp.status_code == 201
    pet_id = create_resp.json()["data"]["id"]

    list_resp = await async_client.get("/v1/pets", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]["pets"]) == 1

    update_resp = await async_client.put(
        f"/v1/pets/{pet_id}",
        json={"nickname": "新团子"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["nickname"] == "新团子"

    delete_resp = await async_client.delete(f"/v1/pets/{pet_id}", headers=headers)
    assert delete_resp.status_code == 204

    list_after = await async_client.get("/v1/pets", headers=headers)
    assert len(list_after.json()["data"]["pets"]) == 0
