import pytest


class TestAPIContracts:
    """Contract tests verifying API response schemas match expectations."""

    def test_categories_response_schema(self, client):
        """Verify /v1/categories response structure."""
        response = client.get("/v1/categories")
        assert response.status_code == 200
        
        data = response.json()
        # Contract: Must have code, message, data fields
        assert "code" in data, "Response must contain 'code' field"
        assert "message" in data, "Response must contain 'message' field"
        assert "data" in data, "Response must contain 'data' field"
        
        # Contract: code must be integer
        assert isinstance(data["code"], int), "code must be an integer"
        
        # Contract: data must be a list
        assert isinstance(data["data"], list), "data must be a list"

    def test_products_list_response_schema(self, client):
        """Verify /v1/products response structure."""
        response = client.get("/v1/products")
        assert response.status_code == 200
        
        data = response.json()
        assert "code" in data
        assert "data" in data
        
        # Contract: Pagination response structure
        if isinstance(data["data"], dict):
            assert "items" in data["data"], "Paginated response must contain 'items'"
            assert "total" in data["data"], "Paginated response must contain 'total'"
            assert isinstance(data["data"]["items"], list)
            assert isinstance(data["data"]["total"], int)

    def test_product_detail_response_schema(self, client):
        """Verify /v1/products/{id} response structure."""
        response = client.get("/v1/products/1")
        # Contract: Should return 200 or 404
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "code" in data
            assert "data" in data
            
            if data["data"] is not None:
                # Contract: Product must have required fields
                product = data["data"]
                assert "id" in product, "Product must have 'id'"
                assert "name" in product, "Product must have 'name'"
                assert "price_min" in product, "Product must have 'price_min'"
                assert "price_max" in product, "Product must have 'price_max'"

    def test_search_response_schema(self, client):
        """Verify /v1/search response structure."""
        response = client.get("/v1/search?q=test")
        assert response.status_code == 200
        
        data = response.json()
        assert "code" in data
        assert "data" in data
        
        # Contract: Search response must contain specific fields
        search_data = data["data"]
        assert "products" in search_data, "Search response must contain 'products'"
        assert "categories" in search_data, "Search response must contain 'categories'"
        assert "brands" in search_data, "Search response must contain 'brands'"
        assert "suggestions" in search_data, "Search response must contain 'suggestions'"
        
        # Contract: Fields must be lists
        assert isinstance(search_data["products"], list)
        assert isinstance(search_data["categories"], list)
        assert isinstance(search_data["brands"], list)
        assert isinstance(search_data["suggestions"], list)

    def test_search_suggestions_response_schema(self, client):
        """Verify /v1/search/suggestions response structure."""
        response = client.get("/v1/search/suggestions?q=test")
        assert response.status_code == 200
        
        data = response.json()
        assert "code" in data
        assert "data" in data
        assert isinstance(data["data"], list)
        
        # Contract: Each suggestion must have specific fields
        for suggestion in data["data"]:
            assert "type" in suggestion, "Suggestion must have 'type'"
            assert "text" in suggestion, "Suggestion must have 'text'"
            assert suggestion["type"] in ["product", "brand", "category"]

    def test_error_response_schema(self, client):
        """Verify error response structure."""
        response = client.get("/v1/search")  # Missing required 'q' parameter
        assert response.status_code == 422
        
        data = response.json()
        # Contract: Error response must contain error information
        assert "code" in data or "detail" in data

    def test_health_response_schema(self, client):
        """Verify /health response structure."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data, "Health response must contain 'status'"
        assert data["status"] == "ok"
