import pytest


class TestCategoriesAPI:
    """Integration tests for categories endpoints."""

    def test_get_categories(self, client):
        """Test GET /v1/categories endpoint."""
        response = client.get("/v1/categories")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "code" in data

    def test_get_categories_with_pet_type(self, client):
        """Test GET /v1/categories?pet_type=cat endpoint."""
        response = client.get("/v1/categories?pet_type=cat")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200


class TestProductsAPI:
    """Integration tests for products endpoints."""

    def test_get_products(self, client):
        """Test GET /v1/products endpoint."""
        response = client.get("/v1/products")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "items" in data["data"] or isinstance(data["data"], list)

    def test_get_products_with_filters(self, client):
        """Test GET /v1/products with query parameters."""
        response = client.get("/v1/products?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200

    def test_get_product_detail(self, client):
        """Test GET /v1/products/{id} endpoint."""
        # First get list to find a valid product ID
        response = client.get("/v1/products")
        assert response.status_code == 200
        
        # Test with a likely non-existent ID
        response = client.get("/v1/products/99999")
        # Should return 404 or 200 with null data
        assert response.status_code in [200, 404]


class TestSearchAPI:
    """Integration tests for search endpoints."""

    def test_search(self, client):
        """Test GET /v1/search endpoint."""
        response = client.get("/v1/search?q=猫粮")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "products" in data["data"]
        assert "suggestions" in data["data"]

    def test_search_suggestions(self, client):
        """Test GET /v1/search/suggestions endpoint."""
        response = client.get("/v1/search/suggestions?q=猫")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_search_empty_query(self, client):
        """Test search with empty query returns error."""
        response = client.get("/v1/search?q=")
        assert response.status_code == 422


class TestAuthAPI:
    """Integration tests for auth endpoints."""

    def test_wechat_login_without_code(self, client):
        """Test POST /v1/auth/wechat-login without code."""
        response = client.post("/v1/auth/wechat-login", json={})
        assert response.status_code == 422


class TestHealthAPI:
    """Integration tests for health endpoint."""

    def test_health_check(self, client):
        """Test GET /health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_metrics_endpoint(self, client):
        """Test GET /metrics endpoint returns Prometheus metrics."""
        response = client.get("/metrics")
        assert response.status_code == 200
        assert "http_requests_total" in response.text
