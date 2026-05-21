import pytest
from decimal import Decimal

from app.models.category import Category
from app.models.spu import Spu
from app.schemas.spu import SpuFilter
from app.services.category_service import CategoryService
from app.services.spu_service import SpuService
from app.services.search_service import SearchService


class TestCategoryService:
    """Unit tests for CategoryService."""

    @pytest.mark.asyncio
    async def test_get_category_tree(self, db_session):
        """Test retrieving category tree."""
        cat1 = Category(name="猫粮", pet_type="cat", level=1, sort_order=1, is_active=True)
        db_session.add(cat1)
        await db_session.commit()
        await db_session.refresh(cat1)
        
        cat2 = Category(name="干粮", pet_type="cat", parent_id=cat1.id, level=2, sort_order=1, is_active=True)
        cat3 = Category(name="狗粮", pet_type="dog", level=1, sort_order=2, is_active=True)
        db_session.add_all([cat2, cat3])
        await db_session.commit()
        
        service = CategoryService(db_session)
        result = await service.get_category_tree()
        
        assert len(result) == 2
        assert result[0].name == "猫粮"
        assert result[1].name == "狗粮"

    @pytest.mark.asyncio
    async def test_get_category_tree_filter_by_pet_type(self, db_session):
        cat1 = Category(name="猫粮", pet_type="cat", level=1, sort_order=1, is_active=True)
        cat2 = Category(name="狗粮", pet_type="dog", level=1, sort_order=1, is_active=True)
        db_session.add_all([cat1, cat2])
        await db_session.commit()
        
        service = CategoryService(db_session)
        result = await service.get_category_tree(pet_type="cat")
        
        assert len(result) == 1
        assert result[0].pet_type == "cat"

    @pytest.mark.asyncio
    async def test_get_category_by_id(self, db_session):
        category = Category(name="测试分类", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        service = CategoryService(db_session)
        result = await service.get_category_by_id(category.id)
        
        assert result is not None
        assert result.name == "测试分类"

    @pytest.mark.asyncio
    async def test_get_category_by_id_not_found(self, db_session):
        service = CategoryService(db_session)
        result = await service.get_category_by_id(99999)
        assert result is None


class TestSpuService:
    """Unit tests for SpuService."""

    @pytest.mark.asyncio
    async def test_get_spus_basic(self, db_session):
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        spu = Spu(
            name="测试猫粮",
            brand="测试品牌",
            model="K36",
            category_id=category.id,
            price_min=Decimal("100.00"),
            price_max=Decimal("200.00"),
            status="active",
        )
        db_session.add(spu)
        await db_session.commit()
        
        service = SpuService(db_session)
        filters = SpuFilter()
        
        spus, total = await service.list_spus(filters)
        
        assert total >= 1
        assert len(spus) >= 1
        assert spus[0].name == "测试猫粮"

    @pytest.mark.asyncio
    async def test_get_spus_filter_by_category(self, db_session):
        cat1 = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        cat2 = Category(name="狗粮", pet_type="dog", level=1, is_active=True)
        db_session.add_all([cat1, cat2])
        await db_session.commit()
        await db_session.refresh(cat1)
        await db_session.refresh(cat2)
        
        spu1 = Spu(name="猫粮A", brand="品牌A", model="A1", category_id=cat1.id, status="active")
        spu2 = Spu(name="狗粮A", brand="品牌B", model="B1", category_id=cat2.id, status="active")
        db_session.add_all([spu1, spu2])
        await db_session.commit()
        
        service = SpuService(db_session)
        filters = SpuFilter(category_id=cat1.id)
        
        spus, total = await service.list_spus(filters)
        
        assert total == 1
        assert spus[0].name == "猫粮A"

    @pytest.mark.asyncio
    async def test_get_spu_by_id(self, db_session):
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        spu = Spu(
            name="详细测试产品",
            brand="品牌A",
            model="TEST",
            category_id=category.id,
            description="这是一个测试产品",
            status="active",
        )
        db_session.add(spu)
        await db_session.commit()
        await db_session.refresh(spu)
        
        service = SpuService(db_session)
        
        result = await service.get_spu(spu.id)
        
        assert result is not None
        assert result.name == "详细测试产品"
        assert result.brand == "品牌A"

    @pytest.mark.asyncio
    async def test_compare_spus(self, db_session):
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        spu1 = Spu(name="产品1", brand="品牌A", model="A1", category_id=category.id, status="active")
        spu2 = Spu(name="产品2", brand="品牌B", model="B1", category_id=category.id, status="active")
        db_session.add_all([spu1, spu2])
        await db_session.commit()
        await db_session.refresh(spu1)
        await db_session.refresh(spu2)
        
        service = SpuService(db_session)
        
        result = await service.get_spus_for_miniprogram(SpuFilter())
        # get_spus_for_miniprogram returns tuple


class TestSearchService:
    """Unit tests for SearchService."""

    @pytest.mark.asyncio
    async def test_search_spus(self, db_session):
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        spu = Spu(
            name="皇家猫粮",
            brand="Royal Canin",
            model="K36",
            category_id=category.id,
            status="active",
        )
        db_session.add(spu)
        await db_session.commit()
        
        service = SearchService(db_session)
        
        result = await service.search("皇家")
        
        assert len(result["spus"]) >= 1
        assert result["spus"][0]["name"] == "皇家猫粮"

    @pytest.mark.asyncio
    async def test_search_with_pet_type_filter(self, db_session):
        cat_cat = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        dog_cat = Category(name="狗粮", pet_type="dog", level=1, is_active=True)
        db_session.add_all([cat_cat, dog_cat])
        await db_session.commit()
        await db_session.refresh(cat_cat)
        await db_session.refresh(dog_cat)
        
        spu1 = Spu(name="猫粮", brand="品牌A", model="A1", category_id=cat_cat.id, pet_type="cat", status="active")
        spu2 = Spu(name="狗粮", brand="品牌B", model="B1", category_id=dog_cat.id, pet_type="dog", status="active")
        db_session.add_all([spu1, spu2])
        await db_session.commit()
        
        service = SearchService(db_session)
        
        result = await service.search("粮", pet_type="cat")
        
        assert len(result["spus"]) == 1
        assert result["spus"][0]["name"] == "猫粮"

    @pytest.mark.asyncio
    async def test_get_suggestions(self, db_session):
        category = Category(name="猫粮", pet_type="cat", level=1, is_active=True)
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)
        
        spu = Spu(name="皇家猫粮", brand="Royal", model="K36", category_id=category.id, status="active")
        db_session.add(spu)
        await db_session.commit()
        
        service = SearchService(db_session)
        
        suggestions = await service.get_suggestions("皇", limit=5)
        
        assert len(suggestions) >= 1
        assert any(s["type"] == "product" for s in suggestions)
