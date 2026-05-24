"""007 pet profiles: create pets + pet_breeds tables and seed breed data

Revision ID: 007_pet_profiles
Revises: b11cc8dbc49a
Create Date: 2026-05-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '007_pet_profiles'
down_revision = 'b11cc8dbc49a'
branch_labels = None
depends_on = None


BREED_SEEDS = [
    {"species": "cat", "name": "英短", "description": "圆脸短毛，性格独立温顺"},
    {"species": "cat", "name": "美短", "description": "活泼好动，适应力强"},
    {"species": "cat", "name": "布偶", "description": "温顺亲人，长毛大型猫"},
    {"species": "cat", "name": "暹罗", "description": "聪明好动，社交性强"},
    {"species": "cat", "name": "缅因", "description": "体型大，性格温和"},
    {"species": "cat", "name": "波斯", "description": "长毛扁脸，性格安静"},
    {"species": "cat", "name": "折耳", "description": "耳朵向前折叠，性格温和"},
    {"species": "cat", "name": "无毛", "description": "无毛品种，聪明粘人"},
    {"species": "cat", "name": "橘猫", "description": "常见橘色家猫，性格亲人"},
    {"species": "cat", "name": "三花", "description": "黑白橘三色，多为母猫"},
    {"species": "cat", "name": "狸花", "description": "中国本土品种，体质强健"},
    {"species": "cat", "name": "加菲", "description": "扁脸短毛，性格温顺"},
    {"species": "cat", "name": "德文", "description": "卷毛大耳，聪明粘人"},
    {"species": "cat", "name": "阿比西尼亚", "description": "短毛活泼，好奇心强"},
    {"species": "cat", "name": "孟加拉", "description": "豹纹花纹，活泼好动"},
    {"species": "cat", "name": "俄罗斯蓝猫", "description": "灰色短毛，性格安静"},
    {"species": "cat", "name": "挪威森林", "description": "长毛大型猫，适应寒冷"},
    {"species": "cat", "name": "土耳其梵猫", "description": "半长毛，喜欢玩水"},
    {"species": "cat", "name": "新加坡猫", "description": "体型最小品种，活泼亲人"},
    {"species": "cat", "name": "曼基康", "description": "短腿猫，性格活泼可爱"},
    {"species": "dog", "name": "金毛", "description": "性格温顺，智商高，家庭伴侣犬"},
    {"species": "dog", "name": "拉布拉多", "description": "活泼友善，导盲犬常用品种"},
    {"species": "dog", "name": "柯基", "description": "短腿长身，活泼聪明"},
    {"species": "dog", "name": "泰迪", "description": "体型小，卷毛不掉毛"},
    {"species": "dog", "name": "比熊", "description": "白色卷毛，性格活泼可爱"},
    {"species": "dog", "name": "柴犬", "description": "日本犬种，独立忠诚"},
    {"species": "dog", "name": "哈士奇", "description": "精力旺盛，表情丰富"},
    {"species": "dog", "name": "萨摩耶", "description": "微笑天使，白色长毛"},
    {"species": "dog", "name": "边牧", "description": "智商最高犬种，工作能力强"},
    {"species": "dog", "name": "德牧", "description": "忠诚勇敢，警犬常用品种"},
    {"species": "dog", "name": "法斗", "description": "体型小，性格温和亲人"},
    {"species": "dog", "name": "英斗", "description": "体型健壮，性格沉稳"},
    {"species": "dog", "name": "博美", "description": "小型犬，毛量丰富"},
    {"species": "dog", "name": "雪纳瑞", "description": "须眉特征明显，不掉毛"},
    {"species": "dog", "name": "约克夏", "description": "小型长毛犬，活泼好动"},
    {"species": "dog", "name": "吉娃娃", "description": "世界最小犬种，忠诚护主"},
    {"species": "dog", "name": "杜宾", "description": "体型健美，护卫能力强"},
    {"species": "dog", "name": "罗威纳", "description": "强壮有力，忠诚护主"},
    {"species": "dog", "name": "松狮", "description": "紫舌特征明显，性格独立"},
    {"species": "dog", "name": "秋田", "description": "日本犬种，忠诚勇敢"},
    {"species": "dog", "name": "巴哥", "description": "面部褶皱明显，性格安静"},
    {"species": "dog", "name": "贵宾", "description": "标准贵宾，聪明不掉毛"},
    {"species": "dog", "name": "阿拉斯加", "description": "大型雪橇犬，需要大量运动"},
    {"species": "dog", "name": "大白熊", "description": "大型护卫犬，白色长毛"},
    {"species": "dog", "name": "中华田园犬", "description": "中国本土犬，适应力强"},
    {"species": "dog", "name": "泰迪熊", "description": "卷毛小型犬，可爱亲人"},
    {"species": "dog", "name": "马犬", "description": "工作犬，服从性好"},
    {"species": "dog", "name": "可卡", "description": "长耳特征明显，性格温和"},
    {"species": "dog", "name": "牛头梗", "description": "蛋型头特征明显，活泼好动"},
    {"species": "dog", "name": "古牧", "description": "长毛大型犬，性格温和"},
    {"species": "bird", "name": "玄凤鹦鹉", "description": "头部冠羽明显，性格温顺"},
    {"species": "bird", "name": "牡丹鹦鹉", "description": "颜色鲜艳，成对饲养"},
    {"species": "bird", "name": "虎皮鹦鹉", "description": "体型小，易饲养繁殖"},
    {"species": "bird", "name": "金丝雀", "description": "鸣叫声优美，颜色多样"},
    {"species": "bird", "name": "文鸟", "description": "体型小巧，适合新手饲养"},
    {"species": "bird", "name": "八哥", "description": "善于模仿人语，智商高"},
    {"species": "bird", "name": "画眉", "description": "中国著名笼鸟，鸣叫声洪亮"},
    {"species": "bird", "name": "百灵", "description": "鸣叫婉转多变，善效鸣"},
    {"species": "bird", "name": "鸽子", "description": "和平象征，易饲养"},
    {"species": "fish", "name": "锦鲤", "description": "观赏鲤鱼，色彩丰富"},
    {"species": "fish", "name": "龙鱼", "description": "大型观赏鱼，寓意吉祥"},
    {"species": "fish", "name": "金鱼", "description": "传统观赏鱼，品种繁多"},
    {"species": "fish", "name": "孔雀鱼", "description": "小型热带鱼，繁殖力强"},
    {"species": "fish", "name": "神仙鱼", "description": "体形如燕，游姿优美"},
    {"species": "fish", "name": "斗鱼", "description": "颜色鲜艳，雄鱼好斗"},
    {"species": "fish", "name": "灯鱼", "description": "小型热带鱼，颜色亮丽"},
    {"species": "fish", "name": "鼠鱼", "description": "底栖鱼，帮助清理缸底"},
    {"species": "fish", "name": "异形鱼", "description": "吸盘嘴，清理藻类"},
    {"species": "reptile", "name": "豹纹守宫", "description": "小型蜥蜴，色彩多样"},
    {"species": "reptile", "name": "鬃狮蜥", "description": "中型蜥蜴，性格温顺"},
    {"species": "reptile", "name": "绿鬣蜥", "description": "大型素食蜥蜴，需要大空间"},
    {"species": "reptile", "name": "巴西龟", "description": "常见水龟，适应力强"},
    {"species": "reptile", "name": "草龟", "description": "中国本土龟种"},
    {"species": "reptile", "name": "玉米蛇", "description": "小型无毒蛇，色彩丰富"},
    {"species": "small_pet", "name": "仓鼠", "description": "小型啮齿类，适合新手"},
    {"species": "small_pet", "name": "荷兰猪", "description": "性格温顺，群居动物"},
    {"species": "small_pet", "name": "兔子", "description": "跳跃奔跑，食草动物"},
    {"species": "small_pet", "name": "龙猫", "description": "毛发浓密，性格活泼"},
    {"species": "small_pet", "name": "松鼠", "description": "敏捷好动，需要大活动空间"},
    {"species": "small_pet", "name": "刺猬", "description": "夜行性动物，身上有刺"},
]


def seed_breeds(op_bind):
    """Insert seed breed data."""
    from sqlalchemy.sql import text
    conn = op_bind.get_bind()
    for idx, breed in enumerate(BREED_SEEDS):
        conn.execute(
            text(
                "INSERT INTO pet_breeds (species, name, description, is_active, sort_order) "
                "VALUES (:species, :name, :description, :is_active, :sort_order)"
            ),
            {
                "species": breed["species"],
                "name": breed["name"],
                "description": breed["description"],
                "is_active": True,
                "sort_order": idx,
            },
        )


def upgrade() -> None:
    op.create_table(
        'pet_breeds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('species', sa.String(16), nullable=False),
        sa.Column('name', sa.String(64), nullable=False),
        sa.Column('description', sa.String(256), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('sort_order', sa.Integer(), server_default=sa.text('0')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('species', 'name', name='uq_pet_breeds_species_name'),
    )
    op.create_index('ix_pet_breeds_species', 'pet_breeds', ['species', 'sort_order'])
    op.create_index('ix_pet_breeds_active', 'pet_breeds', ['species', 'is_active'])

    op.create_table(
        'pets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('species', sa.String(16), nullable=False),
        sa.Column('breed_id', sa.Integer(), nullable=True),
        sa.Column('nickname', sa.String(32), nullable=False),
        sa.Column('age_months', sa.Integer(), nullable=True),
        sa.Column('weight_kg', sa.Numeric(5, 2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'species', 'nickname', name='uq_user_species_nickname'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['breed_id'], ['pet_breeds.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_pets_user_id', 'pets', ['user_id'])
    op.create_index('ix_pets_species', 'pets', ['species'])

    seed_breeds(op)


def downgrade() -> None:
    op.drop_table('pets')
    op.drop_table('pet_breeds')
