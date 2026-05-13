import pytest
from decimal import Decimal

from app.models.category import Category
from app.models.product import Product
from app.schemas.product import ProductFilter
from app.services.category_service import CategoryService
from app.services.product_service import ProductService
from app.services.search_service import SearchService


class TestCategoryService:
    """Unit tests for CategoryService."""

    @pytest.mark.asyncio
    async def test_get_category_tree(self, db_session):
        """Test retrieving category tree."""
        # Arrange: Create test categories
        cat1 = Category(name="猫粮", pet_type="cat", level=1, sort_order=1, is_active=True)
        cat2 = Category(name="干粮", pet_type="cat", parent_id=1, level=2, sort_order=1, is_active=True)
        cat3 = Category(name="狗粮", pet_type="dog", level=1, sort_order=2, is_active=True)
        
        db_session.add_all([cat1, cat2, cat3])
        await db_session.commit()
        # Refresh to get IDs
        for cat in [cat1, cat2, cat3]:
            await db_session.refresh(cat)
        
        # Fix parent relationship
        cat2.parent_id = cat1.id
        await db_session.commit()
        
        service = CategoryService(db_session)
        
        # Act
        result = await service.get_category_tree()
        
        # Assert
        assert len(result) == 2
        assert result[0].name == "猫粮"
        assert result[1].name == "狗粮"

    @pytest.mark.asyncio
    async def test_get_category_tree_filter_by_pet_type(self, db_session):
        """Test filtering category tree by pet type."""
        # Arrange
        cat1 = Category(name="猫粮", pet_type="cat", level=1, sort_order=1, is_active=True)
        cat2 = Category(name="狗粮", pet_type="dog", level=1, sort_order=1, is_active=True)
        db_session.add_all([cat1, cat2])
        await db_session.commit()
        
        service = CategoryService(db_session)
        
        # Act
        result = await service.get_category_tree(pet_type="cat")
        
        # Assert
        assert len(result) == 1
        assert result[0].pet_type == "cat"

    @pytest.mark.asyncio
    async def test_get_category_by_id(self, db_session):
        """Test retrieving a category by ID."""
        # Arrange
        category = Category(name="测试分类", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        service = CategoryService(db_session)
        
        # Act
        result = await service.get_category_by_id(category.id)
        
        # Assert
        assert result is not None
        assert result.name == "测试分类"

    @pytest.mark.asyncio
    async def test_get_category_by_id_not_found(self, db_session):
        """Test retrieving a non-existent category."""
        service = CategoryService(db_session)
        result = await service.get_category_by_id(99999)
        assert result is None


class TestProductService:
    """Unit tests for ProductService."""

    @pytest.mark.asyncio
    async def test_get_products_basic(self, db_session):
        """Test basic product listing."""
        # Arrange
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        product = Product(
            name="测试猫粮",
            brand="测试品牌",
            category_id=category.id,
            price_min=Decimal("100.00"),
            price_max=Decimal("200.00"),
            status="active",
        )
        db_session.add(product)
        await db_session.commit()
        
        service = ProductService(db_session)
        filters = ProductFilter()
        
        # Act
        products, total = await service.get_products(filters)
        
        # Assert
        assert total >= 1
        assert len(products) >= 1
        assert products[0].name == "测试猫粮"

    @pytest.mark.asyncio
    async def test_get_products_filter_by_category(self, db_session):
        """Test filtering products by category."""
        # Arrange
        cat1 = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        cat2 = Category(name="狗粮", pet_type="dog", level=1, is_active=True)
        db_session.add_all([cat1, cat2])
        await db_session.commit()
        await db_session.refresh(cat1)
        await db_session.refresh(cat2)
        
        product1 = Product(name="猫粮A", category_id=cat1.id, status="active")
        product2 = Product(name="狗粮A", category_id=cat2.id, status="active")
        db_session.add_all([product1, product2])
        await db_session.commit()
        
        service = ProductService(db_session)
        filters = ProductFilter(category_id=cat1.id)
        
        # Act
        products, total = await service.get_products(filters)
        
        # Assert
        assert total == 1
        assert products[0].name == "猫粮A"

    @pytest.mark.asyncio
    async def test_get_product_by_id(self, db_session):
        """Test retrieving product details."""
        # Arrange
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        product = Product(
            name="详细测试产品",
            brand="品牌A",
            category_id=category.id,
            description="这是一个测试产品",
            status="active",
        )
        db_session.add(product)
        await db_session.commit()
        await db_session.refresh(product)
        
        service = ProductService(db_session)
        
        # Act
        result = await service.get_product_by_id(product.id)
        
        # Assert
        assert result is not None
        assert result.name == "详细测试产品"
        assert result.brand == "品牌A"
        assert result.category is not None

    @pytest.mark.asyncio
    async def test_compare_products(self, db_session):
        """Test product comparison."""
        # Arrange
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        product1 = Product(name="产品1", category_id=category.id, status="active")
        product2 = Product(name="产品2", category_id=category.id, status="active")
        db_session.add_all([product1, product2])
        await db_session.commit()
        await db_session.refresh(product1)
        await db_session.refresh(product2)
        
        service = ProductService(db_session)
        
        # Act
        result = await service.compare_products([product1.id, product2.id])
        
        # Assert
        assert len(result) == 2
        names = [p.name for p in result]
        assert "产品1" in names
        assert "产品2" in names


class TestSearchService:
    """Unit tests for SearchService."""

    @pytest.mark.asyncio
    async def test_search_products(self, db_session):
        """Test product search."""
        # Arrange
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        product = Product(
            name="皇家猫粮",
            brand="Royal Canin",
            category_id=category.id,
            status="active",
        )
        db_session.add(product)
        await db_session.commit()
        
        service = SearchService(db_session)
        
        # Act
        result = await service.search("皇家")
        
        # Assert
        assert len(result["products"]) >= 1
        assert result["products"][0]["name"] == "皇家猫粮"

    @pytest.mark.asyncio
    async def test_search_with_pet_type_filter(self, db_session):
        """Test search filtered by pet type."""
        # Arrange
        cat_cat = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        dog_cat = Category(name="狗粮", pet_type="dog", level=1, is_active=True)
        db_session.add_all([cat_cat, dog_cat])
        await db_session.commit()
        await db_session.refresh(cat_cat)
        await db_session.refresh(dog_cat)
        
        product1 = Product(name="猫粮", category_id=cat_cat.id, status="active")
        product2 = Product(name="狗粮", category_id=dog_cat.id, status="active")
        db_session.add_all([product1, product2])
        await db_session.commit()
        
        service = SearchService(db_session)
        
        # Act
        result = await service.search("粮", pet_type="cat")
        
        # Assert
        assert len(result["products"]) == 1
        assert result["products"][0]["name"] == "猫粮"

    @pytest.mark.asyncio
    async def test_get_suggestions(self, db_session):
        """Test search suggestions."""
        # Arrange
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        product = Product(name="皇家猫粮", brand="Royal", category_id=category.id, status="active")
        db_session.add(product)
        await db_session.commit()
        
        service = SearchService(db_session)
        
        # Act
        suggestions = await service.get_suggestions("皇", limit=5)
        
        # Assert
        assert len(suggestions) >= 1
        assert any(s["type"] == "product" for s in suggestions)
