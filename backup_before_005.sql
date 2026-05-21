--
-- PostgreSQL database dump
--

\restrict kxPpw0eCUydqCQzcAP0GgHDo14IKu5j3A5zOOy1tgcYDO5QLjShqbJ0bA4CE7RG

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: products_search_vector_update(); Type: FUNCTION; Schema: public; Owner: petshop
--

CREATE FUNCTION public.products_search_vector_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            NEW.search_vector := 
                setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.brand, '')), 'B') ||
                setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C');
            RETURN NEW;
        END;
        $$;


ALTER FUNCTION public.products_search_vector_update() OWNER TO petshop;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO petshop;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(64) NOT NULL,
    pet_type character varying(32) NOT NULL,
    parent_id integer,
    level integer,
    icon character varying(128),
    sort_order integer,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO petshop;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO petshop;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    session_id integer NOT NULL,
    role character varying(16) NOT NULL,
    content text NOT NULL,
    tool_calls jsonb,
    tokens_used integer,
    referenced_products jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chat_messages OWNER TO petshop;

--
-- Name: TABLE chat_messages; Type: COMMENT; Schema: public; Owner: petshop
--

COMMENT ON TABLE public.chat_messages IS 'Chat messages for AI assistant conversations';


--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_messages_id_seq OWNER TO petshop;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.chat_sessions (
    id integer NOT NULL,
    user_id integer,
    title character varying(128),
    model character varying(32),
    system_prompt text,
    session_metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chat_sessions OWNER TO petshop;

--
-- Name: chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.chat_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.chat_sessions_id_seq OWNER TO petshop;

--
-- Name: chat_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.chat_sessions_id_seq OWNED BY public.chat_sessions.id;


--
-- Name: data_fetch_jobs; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.data_fetch_jobs (
    id integer NOT NULL,
    data_source_id integer NOT NULL,
    job_type character varying(32) NOT NULL,
    status character varying(16),
    params jsonb,
    result jsonb,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    collection_type character varying(16) DEFAULT 'full'::character varying,
    product_id integer,
    cursor_value timestamp with time zone
);


ALTER TABLE public.data_fetch_jobs OWNER TO petshop;

--
-- Name: data_fetch_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.data_fetch_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.data_fetch_jobs_id_seq OWNER TO petshop;

--
-- Name: data_fetch_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.data_fetch_jobs_id_seq OWNED BY public.data_fetch_jobs.id;


--
-- Name: data_sources; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.data_sources (
    id integer NOT NULL,
    name character varying(64) NOT NULL,
    platform character varying(32) NOT NULL,
    config jsonb,
    is_active boolean,
    last_sync_at timestamp with time zone,
    sync_interval_minutes integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.data_sources OWNER TO petshop;

--
-- Name: data_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.data_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.data_sources_id_seq OWNER TO petshop;

--
-- Name: data_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.data_sources_id_seq OWNED BY public.data_sources.id;


--
-- Name: external_products; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.external_products (
    id integer NOT NULL,
    product_id integer NOT NULL,
    source_id integer NOT NULL,
    platform character varying(32) NOT NULL,
    external_id character varying(64) NOT NULL,
    external_url character varying(2048),
    pid character varying(64),
    is_primary boolean,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.external_products OWNER TO petshop;

--
-- Name: external_products_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.external_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.external_products_id_seq OWNER TO petshop;

--
-- Name: external_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.external_products_id_seq OWNED BY public.external_products.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.favorites OWNER TO petshop;

--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.favorites_id_seq OWNER TO petshop;

--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    product_id integer NOT NULL,
    source_id integer NOT NULL,
    price numeric(10,2) NOT NULL,
    group_price numeric(10,2),
    single_price numeric(10,2),
    coupon_discount numeric(10,2),
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.price_history OWNER TO petshop;

--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.price_history_id_seq OWNER TO petshop;

--
-- Name: price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.price_history_id_seq OWNED BY public.price_history.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.products (
    id integer NOT NULL,
    category_id integer NOT NULL,
    name character varying(128) NOT NULL,
    brand character varying(64),
    price_min numeric(10,2),
    price_max numeric(10,2),
    currency character varying(8),
    image_urls jsonb,
    pros jsonb,
    cons jsonb,
    ratings jsonb,
    description text,
    ingredients jsonb,
    specifications jsonb,
    source_url character varying(2048),
    source_platform character varying(32),
    status character varying(16),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    search_vector tsvector,
    goods_name character varying(255),
    spec_form character varying(16),
    age_range character varying(32),
    mall_name character varying(128),
    pet_type character varying(16) DEFAULT 'cat'::character varying NOT NULL,
    promotion_rate integer DEFAULT 0,
    min_group_price integer DEFAULT 0,
    min_normal_price integer DEFAULT 0,
    gallery_urls jsonb DEFAULT '[]'::jsonb,
    detail_img_urls jsonb DEFAULT '[]'::jsonb,
    service_tags jsonb DEFAULT '[]'::jsonb,
    nutrition jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.products OWNER TO petshop;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO petshop;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: promotion_url_cache; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.promotion_url_cache (
    id integer NOT NULL,
    goods_sign character varying(64) NOT NULL,
    pid character varying(64) NOT NULL,
    short_url character varying(256) NOT NULL,
    mobile_url character varying(512),
    we_app_url character varying(512),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.promotion_url_cache OWNER TO petshop;

--
-- Name: promotion_url_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.promotion_url_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.promotion_url_cache_id_seq OWNER TO petshop;

--
-- Name: promotion_url_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.promotion_url_cache_id_seq OWNED BY public.promotion_url_cache.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    product_id integer NOT NULL,
    user_id integer,
    rating numeric(2,1) NOT NULL,
    content text NOT NULL,
    images jsonb,
    tags jsonb,
    is_recommended boolean,
    source character varying(32),
    source_url character varying(256),
    helpful_count integer,
    status character varying(16),
    llm_review_result jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    external_note_id character varying(64),
    author character varying(64),
    note_published_at timestamp with time zone,
    note_likes integer
);


ALTER TABLE public.reviews OWNER TO petshop;

--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reviews_id_seq OWNER TO petshop;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: search_strategies; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.search_strategies (
    id integer NOT NULL,
    data_source_id integer NOT NULL,
    name character varying(64) NOT NULL,
    keywords jsonb,
    opt_id integer,
    price_min integer,
    price_max integer,
    sort_type integer,
    max_items integer,
    last_run_at timestamp with time zone,
    last_result jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    brand_filter jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.search_strategies OWNER TO petshop;

--
-- Name: search_strategies_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.search_strategies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.search_strategies_id_seq OWNER TO petshop;

--
-- Name: search_strategies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.search_strategies_id_seq OWNED BY public.search_strategies.id;


--
-- Name: spu_listings; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.spu_listings (
    id integer NOT NULL,
    spu_id integer NOT NULL,
    platform character varying(32) NOT NULL,
    shop_name character varying(128) NOT NULL,
    goods_id character varying(64),
    title character varying(512) NOT NULL,
    price numeric(10,2) NOT NULL,
    original_price numeric(10,2),
    url character varying(2048) NOT NULL,
    image_url character varying(2048),
    sales_count integer,
    match_confidence numeric(5,4),
    match_status character varying(16) DEFAULT 'linked'::character varying,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ck_spu_listings_confidence CHECK (((match_confidence >= (0)::numeric) AND (match_confidence <= (1)::numeric))),
    CONSTRAINT ck_spu_listings_price CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.spu_listings OWNER TO petshop;

--
-- Name: spu_listings_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.spu_listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.spu_listings_id_seq OWNER TO petshop;

--
-- Name: spu_listings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.spu_listings_id_seq OWNED BY public.spu_listings.id;


--
-- Name: spus; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.spus (
    id integer NOT NULL,
    category_id integer NOT NULL,
    brand character varying(64) NOT NULL,
    name character varying(255) NOT NULL,
    model character varying(128) NOT NULL,
    pet_type character varying(16) DEFAULT 'cat'::character varying NOT NULL,
    description text,
    ingredients jsonb DEFAULT '[]'::jsonb,
    nutrition jsonb DEFAULT '{}'::jsonb,
    pros jsonb DEFAULT '[]'::jsonb,
    cons jsonb DEFAULT '[]'::jsonb,
    extra_attrs jsonb DEFAULT '{}'::jsonb,
    price_min numeric(10,2),
    price_max numeric(10,2),
    currency character varying(8) DEFAULT 'CNY'::character varying,
    image_urls jsonb DEFAULT '[]'::jsonb,
    status character varying(16) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ck_spus_pet_type CHECK (((pet_type)::text = ANY ((ARRAY['cat'::character varying, 'dog'::character varying])::text[])))
);


ALTER TABLE public.spus OWNER TO petshop;

--
-- Name: spus_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.spus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.spus_id_seq OWNER TO petshop;

--
-- Name: spus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.spus_id_seq OWNED BY public.spus.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: petshop
--

CREATE TABLE public.users (
    id integer NOT NULL,
    openid character varying(64) NOT NULL,
    unionid character varying(64),
    nickname character varying(64),
    avatar_url character varying(256),
    pet_types jsonb,
    profile jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_admin boolean NOT NULL
);


ALTER TABLE public.users OWNER TO petshop;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: petshop
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO petshop;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: petshop
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: chat_sessions id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.chat_sessions ALTER COLUMN id SET DEFAULT nextval('public.chat_sessions_id_seq'::regclass);


--
-- Name: data_fetch_jobs id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.data_fetch_jobs ALTER COLUMN id SET DEFAULT nextval('public.data_fetch_jobs_id_seq'::regclass);


--
-- Name: data_sources id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.data_sources ALTER COLUMN id SET DEFAULT nextval('public.data_sources_id_seq'::regclass);


--
-- Name: external_products id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.external_products ALTER COLUMN id SET DEFAULT nextval('public.external_products_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: price_history id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.price_history ALTER COLUMN id SET DEFAULT nextval('public.price_history_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: promotion_url_cache id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.promotion_url_cache ALTER COLUMN id SET DEFAULT nextval('public.promotion_url_cache_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: search_strategies id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.search_strategies ALTER COLUMN id SET DEFAULT nextval('public.search_strategies_id_seq'::regclass);


--
-- Name: spu_listings id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spu_listings ALTER COLUMN id SET DEFAULT nextval('public.spu_listings_id_seq'::regclass);


--
-- Name: spus id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spus ALTER COLUMN id SET DEFAULT nextval('public.spus_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.alembic_version (version_num) FROM stdin;
h1a2b3c4d5e6
004_refract_goods_spu
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.categories (id, name, pet_type, parent_id, level, icon, sort_order, is_active, created_at) FROM stdin;
39	猫粮	cat	\N	1	🐱	1	t	2026-05-12 14:24:13.370153+00
40	干粮	cat	39	2	\N	1	t	2026-05-12 14:24:13.370153+00
41	湿粮	cat	39	2	\N	2	t	2026-05-12 14:24:13.370153+00
42	猫砂	cat	\N	1	🐱	2	t	2026-05-12 14:24:13.370153+00
43	豆腐砂	cat	42	2	\N	1	t	2026-05-12 14:24:13.370153+00
44	膨润土	cat	42	2	\N	2	t	2026-05-12 14:24:13.370153+00
45	猫玩具	cat	\N	1	🐱	3	t	2026-05-12 14:24:13.370153+00
46	逗猫棒	cat	45	2	\N	1	t	2026-05-12 14:24:13.370153+00
47	猫抓板	cat	45	2	\N	2	t	2026-05-12 14:24:13.370153+00
48	狗粮	dog	\N	1	🐶	1	t	2026-05-12 14:24:13.370153+00
49	幼犬粮	dog	48	2	\N	1	t	2026-05-12 14:24:13.370153+00
50	成犬粮	dog	48	2	\N	2	t	2026-05-12 14:24:13.370153+00
51	狗零食	dog	48	2	\N	3	t	2026-05-12 14:24:13.370153+00
52	狗玩具	dog	\N	1	🐶	2	t	2026-05-12 14:24:13.370153+00
53	磨牙玩具	dog	52	2	\N	1	t	2026-05-12 14:24:13.370153+00
54	互动玩具	dog	52	2	\N	2	t	2026-05-12 14:24:13.370153+00
55	狗用品	dog	\N	1	🐶	3	t	2026-05-12 14:24:13.370153+00
56	牵引绳	dog	55	2	\N	1	t	2026-05-12 14:24:13.370153+00
57	狗窝	dog	55	2	\N	2	t	2026-05-12 14:24:13.370153+00
62	通用	cat	\N	1	\N	99	t	2026-05-15 10:41:23.762091+00
63	通用	cat	\N	1	\N	99	t	2026-05-15 12:48:42.928072+00
64	通用	cat	\N	1	\N	99	t	2026-05-15 12:59:10.316513+00
65	通用	cat	\N	1	\N	99	t	2026-05-15 13:03:33.859431+00
66	通用	cat	\N	1	\N	99	t	2026-05-15 13:11:55.622077+00
67	通用	cat	\N	1	\N	99	t	2026-05-15 13:19:50.149942+00
68	通用	cat	\N	1	\N	99	t	2026-05-15 13:22:28.046392+00
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.chat_messages (id, session_id, role, content, tool_calls, tokens_used, referenced_products, created_at) FROM stdin;
1	1	user	幼猫吃什么猫粮	null	\N	[]	2026-05-13 01:05:54.137975+00
2	1	user	幼猫吃什么猫粮	null	\N	[]	2026-05-13 01:26:45.466483+00
3	1	assistant	您好！幼猫的肠胃和营养需求与成年猫不同，选择一款合适的幼猫粮非常重要！我来帮您搜索一下目前市面上有哪些幼猫猫粮让我换个关键词再搜索一下。让我再专门搜索一下幼猫粮。好的！虽然系统中没有专门标注"幼猫粮"的产品，但我找到了 **适用于全阶段（幼猫也可以吃）**的优质猫粮。让我为您详细介绍一下：\n\n---##🐱幼猫猫粮推荐###1️⃣渴望六种鱼全猫粮1.8kg|项目|内容 ||------|------|\n|💰价格 |**289~320元**|\n|⭐综合评分| **4.7**|\n|🥩含肉量|85% ||📌特点 |全阶段可吃（幼猫适用） |**✅优点：**-高蛋白（幼猫生长发育需要大量蛋白质）\n-无谷物配方，降低过敏风险-富含Omega-3，帮助幼猫大脑和视力发育-营养评分高达**4.9**，非常出色**⚠️注意：**-价格偏高-部分猫咪肠胃敏感可能软便（建议逐步换粮）\n\n---###2️⃣巅峰牛肉罐头85g（全阶段）\n|项目|内容 ||------|------|\n|💰价格 |**28~35元/罐** ||⭐综合评分| **4.8**|\n|🥩含肉量 |92% |**✅优点：**\n-单一蛋白来源，适合幼猫敏感肠胃-新西兰进口，无添加剂-可作为干粮的补充，增加水分摄入**⚠️注意：**-价格较高，适合作为辅食或加餐-分量较小---\n\n##📌幼猫喂养小贴士1️⃣**幼猫需要高蛋白、高脂肪**：幼猫处于快速生长期，需要比成猫更多的蛋白质和能量2️⃣**建议少量多餐**：幼猫胃容量小，每天喂3-4次3️⃣**逐步换粮**：新猫粮要和旧粮混合过渡7-10天，避免肠胃不适4️⃣**保证充足饮水**：尤其吃干粮时，要确保随时有干净的水5️⃣**不要喂牛奶**：大部分猫咪乳糖不耐受，会拉肚子--->⚠️ **温馨提示**：以上推荐是基于"全阶段"的产品信息。如果您的小猫有特殊的健康状况（如软便、呕吐等），建议咨询兽医获取个性化的饮食建议。您的小猫多大了？如果有预算范围或其他需求，我可以帮您进一步筛选推荐！😊	null	\N	[58, 59, 60, 61, 57]	2026-05-13 01:26:47.605604+00
4	2	user	3个月幼猫推荐什么猫粮？	null	\N	[]	2026-05-13 07:20:24.858083+00
5	2	assistant	恭喜你迎来了一只小猫咪！🐱3个月大的幼猫正处于快速成长期，需要高蛋白、高营养的专用幼猫粮来支持发育。让我先帮你搜索一下适合的产品！让我换个方式搜索看看让我再搜索一下其他可能适合幼猫的产品。好的，我们来看一下搜索结果。虽然数据库中专门的"幼猫粮"产品不多，但我找到了一些可能适合的产品。让我查看详细信息好的，根据我的搜索结果，我来为你推荐适合 **3个月幼猫**的猫粮方案！🐾---##🐱3个月幼猫猫粮推荐3个月大的猫咪正处于**断奶后的快速生长期**，需要高蛋白、高能量、易消化的食物。以下是适合的产品：\n\n---###🌟首选推荐：渴望六种鱼全猫粮1.8kg|项目 |详情|\n|------|------|| **价格**| ¥289~320 || **适用年龄** |**全阶段（幼猫可用）**|\n|**营养评分** |⭐**4.9/5**（极高）|\n|**核心优势** |85%含肉量、无谷物、六种深海鱼配方 || **可能不足**|价格偏高，部分猫咪可能软便|**推荐理由：**渴望是公认的高端猫粮，全阶段配方适合幼猫，富含Omega-3帮助大脑和视力发育，高蛋白支持快速生长。\n\n---###🌟湿粮补充：巅峰牛肉罐头85g|项目 |详情|\n|------|------|| **价格**| ¥28~35/罐 || **适用年龄** |**全阶段（幼猫可用）**|| **营养评分**|⭐ **4.9/5**|\n|**核心优势**|92%含肉量、新西兰进口、单一蛋白|| **可能不足**|价格贵、分量小|\n\n**推荐理由：**可以作为主食或加餐，给幼猫补充水分和优质蛋白，适口性极佳。\n\n---##📋给3个月幼猫的喂养建议1.**幼猫专用粮优先**：如果有条件，建议选择专门的**幼猫粮**（如皇家幼猫粮BK34、冠能幼猫粮等），颗粒更小、营养配比更针对幼猫。2.**干湿结合**：干粮为主（保持牙齿健康）+偶尔湿粮（补充水分）\n3.**少量多餐**：3个月幼猫建议每天喂**3-4次**\n4.**温水泡软**：如果猫咪牙齿还不够硬，可以用温水将干粮泡软再喂5.**充足饮水**：确保随时有清洁饮水6.**换粮要过渡**：用 **7天换粮法**（每天逐渐增加新粮比例），避免肠胃不适--->⚠️ **温馨提示**：以上产品均为"全阶段"配方，适合幼猫食用。如果条件允许，专门针对幼猫的猫粮（如皇家幼猫粮、冠能幼猫粮等）在颗粒大小和营养配比上会更精准。建议购买前再确认一下产品包装上的年龄说明哦！\n\n如果你告诉我你的**预算范围**或猫咪有没有**特殊需求**（比如肠胃敏感），我可以帮你进一步筛选！😊	null	\N	[58, 59, 60, 61, 57]	2026-05-13 07:20:27.037616+00
6	2	user	猫粮有哪些推荐	null	\N	[]	2026-05-13 07:21:19.704536+00
7	2	assistant	好的！让我全面搜索一下市面上有哪些猫粮产品，给你做一个详细的推荐清单！🔍好的，让我深入查看这些产品的详细信息和评价！现在让我把它们做个对比，给你一个完整的推荐！👇好的！以下是基于数据整理的**猫粮全面推荐清单**🐾---#🐱猫粮推荐总清单>⚠️温馨提醒：你之前提到的是**3个月幼猫**，所以我会标注哪些适合幼猫哦！\n\n---##🥇高端推荐（适合幼猫 ✅）\n\n###1️⃣渴望六种鱼全猫粮1.8kg|项目 |详情|\n|------|------||💰 **价格**| **¥289~320** ||⭐ **综合评分**| **4.7/5** ||🥩**营养评分** |**4.9/5**（最高分！） ||👶 **适合幼猫？** |✅ **全阶段配方，幼猫可用！** || 👍**优点** |85%含肉量、无谷物、六种深海鱼、富含Omega-3美毛护脑 ||👎 **缺点**|价格高，部分猫咪可能软便 ||🗣️ **用户评价**|100%推荐率，标签：高蛋白、美毛、品质好|> **适合人群**：预算充足、追求高品质、想给猫咪最好的营养---\n\n###2️⃣巅峰牛肉罐头85g（湿粮）|项目 |详情|\n|------|------||💰 **价格**| **¥28~35/罐** ||⭐ **综合评分**| **4.8/5**|\n|🥩**营养评分**|**4.9/5**（最高分！）|\n|👶**适合幼猫？**| ✅**全阶段配方，幼猫可用！** || 👍**优点** |92%含肉量、新西兰进口、单一蛋白、无添加剂 ||👎 **缺点**|价格昂贵、分量小 ||🗣️ **用户评价** |100%推荐率，标签：高品质、适口性极佳 |>**适合人群**：想给猫咪加餐/补水、或作为主食搭配干粮---##🥈中高端推荐（成猫粮⚠️）\n\n###3️⃣皇家室内成猫粮2kg|项目|详情 ||------|------||💰 **价格**| **¥145~168** ||⭐ **综合评分** |**4.5/5**|\n|👶**适合幼猫？** |❌**成猫粮（1-7岁）** || 👍**优点** |适口性好、营养均衡、颗粒大小适中 ||👎 **缺点**|价格偏高、含谷物||🗣️ **用户评价**|67%推荐率，标签：适口性好、营养均衡、长期回购|\n\n---###4️⃣冠能成猫鸡肉配方2.5kg|项目 |详情|\n|------|------|\n|💰 **价格**| **¥98~118**||⭐ **综合评分**| **4.2/5**|\n|👶 **适合幼猫？** |❌**成猫粮（1岁以上）**|\n|👍**优点** |性价比高、适口性好、品牌可靠 ||👎 **缺点**|蛋白质含量一般、含副产品 ||🗣️ **用户评价**|数据较少 |---\n\n##📊四款猫粮对比总览|产品 |价格|营养评分|适口性 |适合幼猫？|\n|:---|:---:|:---:|:---:|:---:||🥇**渴望六种鱼**| ¥289~320 |**4.9**⭐ |4.5| ✅**是** ||🥇**巅峰牛肉罐头** |¥28~35/罐 |**4.9**⭐| **4.7** |✅ **是** ||🥉**皇家室内成猫粮** |¥145~168|4.4 |**4.6** |❌成猫||🥉**冠能鸡肉配方**| ¥98~118|4.0 |4.3|❌成猫 |---\n\n##🎯针对你的3个月幼猫，我的推荐方案###🌟方案一：高端干粮为主>**渴望六种鱼全猫粮**（¥289~320/1.8kg）> -全阶段配方，幼猫放心吃> -高蛋白+Omega-3，促进大脑和视力发育> -一袋约够一只幼猫吃1~1.5个月###🌟方案二：干湿结合（推荐！）> **渴望六种鱼全猫粮**为主粮+ **巅峰牛肉罐头**偶尔加餐> -干粮磨牙、湿粮补水> -巅峰适口性极佳，幼猫超爱> -建议每周2~3次湿粮---##💡幼猫喂养小贴士1. **7天换粮法**：新旧粮逐渐过渡，避免肠胃不适2.**温水泡软**：3个月幼猫牙齿还不够硬，可用温水泡粮10分钟3. **少量多餐**：每天喂**3~4次**4.**充足饮水**：一定要保证随时有干净的水5. **先别喂成猫粮**：冠能和皇家那两款是成猫粮，营养配比不适合幼猫---\n\n>📢**需要我帮你进一步筛选吗？**比如告诉我你的预算范围、猫咪有没有肠胃敏感或其他需求，我可以给出更精准的推荐！😊	null	\N	[58, 59, 60, 61, 57, 57, 58, 59, 60]	2026-05-13 07:21:29.850238+00
8	3	user	猫粮推荐	null	\N	[]	2026-05-13 07:26:57.284059+00
9	3	assistant		null	\N	[58, 59, 60, 61, 57]	2026-05-13 07:27:02.511395+00
10	4	user	猫粮推荐	null	\N	[]	2026-05-13 07:52:31.311229+00
11	4	assistant		null	\N	[58, 59, 60, 61, 57, 57, 58, 59, 60, 61]	2026-05-13 07:52:33.982005+00
12	5	user	猫粮推荐	null	\N	[]	2026-05-13 08:01:52.626098+00
13	5	assistant		null	\N	[58, 59, 60, 61, 57]	2026-05-13 08:01:54.884831+00
14	6	user	猫粮推荐	null	\N	[]	2026-05-13 08:41:42.543518+00
15	6	assistant		null	\N	[58, 59, 60, 61, 57]	2026-05-13 08:41:45.676671+00
16	12	user	3个月幼猫推荐什么猫粮？	null	\N	[]	2026-05-13 13:51:18.303912+00
17	12	assistant		null	\N	[58, 59, 60, 61, 57, 58, 59, 60, 61, 57]	2026-05-13 13:51:20.616383+00
18	15	user	3个月幼猫推荐什么猫粮？	null	\N	[]	2026-05-13 14:18:19.370321+00
19	15	assistant		null	\N	[58, 59, 60, 61, 57]	2026-05-13 14:18:21.566658+00
20	22	user	3个月幼猫推荐什么猫粮？	null	\N	[]	2026-05-16 09:25:43.490524+00
21	22	assistant		null	\N	[]	2026-05-16 09:25:45.939477+00
22	22	user	推荐一下成猫猫粮	null	\N	[]	2026-05-17 07:25:51.576253+00
23	22	assistant		null	\N	[130, 131, 128, 129, 127, 130, 131, 128, 129, 127, 58, 73]	2026-05-17 07:25:54.123029+00
\.


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.chat_sessions (id, user_id, title, model, system_prompt, session_metadata, created_at, updated_at) FROM stdin;
1	\N	新对话	gpt-4o	\N	{}	2026-05-13 01:01:28.412863+00	2026-05-13 01:01:28.412863+00
2	\N	新对话	gpt-4o	\N	{}	2026-05-13 07:20:18.045801+00	2026-05-13 07:20:18.045801+00
3	\N	新对话	gpt-4o	\N	{}	2026-05-13 07:26:49.986741+00	2026-05-13 07:26:49.986741+00
4	\N	新对话	gpt-4o	\N	{}	2026-05-13 07:52:24.144322+00	2026-05-13 07:52:24.144322+00
5	\N	新对话	gpt-4o	\N	{}	2026-05-13 08:01:46.722993+00	2026-05-13 08:01:46.722993+00
6	\N	新对话	gpt-4o	\N	{}	2026-05-13 08:41:36.267766+00	2026-05-13 08:41:36.267766+00
7	\N	新对话	gpt-4o	\N	{}	2026-05-13 10:28:35.610082+00	2026-05-13 10:28:35.610082+00
8	\N	新对话	gpt-4o	\N	{}	2026-05-13 13:24:20.171019+00	2026-05-13 13:24:20.171019+00
9	\N	新对话	gpt-4o	\N	{}	2026-05-13 13:24:37.799583+00	2026-05-13 13:24:37.799583+00
10	\N	新对话	gpt-4o	\N	{}	2026-05-13 13:24:40.998822+00	2026-05-13 13:24:40.998822+00
11	\N	新对话	gpt-4o	\N	{}	2026-05-13 13:45:11.222858+00	2026-05-13 13:45:11.222858+00
12	\N	新对话	gpt-4o	\N	{}	2026-05-13 13:45:13.403784+00	2026-05-13 13:45:13.403784+00
13	\N	新对话	gpt-4o	\N	{}	2026-05-13 13:52:49.778583+00	2026-05-13 13:52:49.778583+00
14	\N	新对话	gpt-4o	\N	{}	2026-05-13 13:52:52.661484+00	2026-05-13 13:52:52.661484+00
15	\N	新对话	gpt-4o	\N	{}	2026-05-13 14:16:42.819146+00	2026-05-13 14:16:42.819146+00
16	\N	新对话	gpt-4o	\N	{}	2026-05-13 14:28:14.457574+00	2026-05-13 14:28:14.457574+00
17	\N	新对话	gpt-4o	\N	{}	2026-05-13 14:29:17.834356+00	2026-05-13 14:29:17.834356+00
18	\N	新对话	gpt-4o	\N	{}	2026-05-13 14:38:02.916354+00	2026-05-13 14:38:02.916354+00
19	\N	新对话	gpt-4o	\N	{}	2026-05-13 15:13:14.219664+00	2026-05-13 15:13:14.219664+00
20	\N	新对话	gpt-4o	\N	{}	2026-05-13 15:20:27.471875+00	2026-05-13 15:20:27.471875+00
21	\N	新对话	gpt-4o	\N	{}	2026-05-13 15:22:31.812099+00	2026-05-13 15:22:31.812099+00
22	\N	新对话	gpt-4o	\N	{}	2026-05-16 09:25:40.944039+00	2026-05-16 09:25:40.944039+00
23	\N	新对话	gpt-4o	\N	{}	2026-05-20 09:37:27.226573+00	2026-05-20 09:37:27.226573+00
\.


--
-- Data for Name: data_fetch_jobs; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.data_fetch_jobs (id, data_source_id, job_type, status, params, result, error_message, started_at, completed_at, created_at, collection_type, product_id, cursor_value) FROM stdin;
1	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	base_url must have a trailing '/'	2026-05-14 11:30:30.689328+00	2026-05-14 11:30:30.698195+00	2026-05-14 11:30:30.571938+00	full	\N	\N
16	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	Exception: PDD API error: 未传入已经授权备案过的相关参数(pid/custom_parameters)，授权备案说明链接：https://jinbao.pinduoduo.com/qa-system?questionId=204	2026-05-14 12:57:25.287124+00	2026-05-14 12:57:25.73731+00	2026-05-14 12:57:25.233975+00	full	\N	\N
2	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:34:18.929774+00	2026-05-14 11:34:18.936089+00	2026-05-14 11:34:18.840229+00	full	\N	\N
3	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:36:38.237515+00	2026-05-14 11:36:38.244709+00	2026-05-14 11:36:38.137388+00	full	\N	\N
24	1	discovery	completed	{"keyword": "皇家 全价猫粮", "strategy_id": 5}	{"new": 73, "found": 81, "failed": 0, "skipped": 8}	\N	2026-05-17 07:50:25.172014+00	2026-05-17 07:53:07.55181+00	2026-05-17 07:50:25.105118+00	full	\N	\N
4	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:39:37.066934+00	2026-05-14 11:39:37.072524+00	2026-05-14 11:39:37.02862+00	full	\N	\N
17	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	Exception: PDD API error: 未传入已经授权备案过的相关参数(pid/custom_parameters)，授权备案说明链接：https://jinbao.pinduoduo.com/qa-system?questionId=204	2026-05-14 13:57:04.921809+00	2026-05-14 13:57:05.149578+00	2026-05-14 13:57:04.765342+00	full	\N	\N
5	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:46:24.588467+00	2026-05-14 11:46:24.601213+00	2026-05-14 11:46:24.481991+00	full	\N	\N
6	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:49:09.622593+00	2026-05-14 11:49:09.628446+00	2026-05-14 11:49:09.574193+00	full	\N	\N
18	1	discovery	running	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	\N	2026-05-14 14:05:42.303687+00	\N	2026-05-14 14:05:42.177056+00	full	\N	\N
7	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:50:21.03827+00	2026-05-14 11:50:21.045675+00	2026-05-14 11:50:20.961196+00	full	\N	\N
8	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:50:36.908674+00	2026-05-14 11:50:36.916637+00	2026-05-14 11:50:36.882677+00	full	\N	\N
19	1	discovery	running	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	\N	2026-05-14 14:08:22.647126+00	\N	2026-05-14 14:08:22.523395+00	full	\N	\N
9	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N		2026-05-14 11:55:31.845521+00	2026-05-14 11:55:31.852896+00	2026-05-14 11:55:31.783408+00	full	\N	\N
10	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	AssertionError: 	2026-05-14 12:46:54.852082+00	2026-05-14 12:46:54.864859+00	2026-05-14 12:46:54.731758+00	full	\N	\N
11	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	AssertionError: 	2026-05-14 12:49:55.301208+00	2026-05-14 12:49:55.309919+00	2026-05-14 12:49:55.244223+00	full	\N	\N
20	1	discovery	completed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	{"new": 10, "found": 10, "failed": 0, "skipped": 0}	\N	2026-05-14 14:12:37.993719+00	2026-05-14 14:12:59.078663+00	2026-05-14 14:12:37.868679+00	full	\N	\N
12	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	ClientConnectionError: Connection closed	2026-05-14 12:50:44.733912+00	2026-05-14 12:50:44.994571+00	2026-05-14 12:50:44.621248+00	full	\N	\N
13	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	ClientConnectionError: Connection closed	2026-05-14 12:52:27.061472+00	2026-05-14 12:52:27.343969+00	2026-05-14 12:52:26.961561+00	full	\N	\N
14	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	ClientConnectionError: Connection closed	2026-05-14 12:52:52.188905+00	2026-05-14 12:52:52.405735+00	2026-05-14 12:52:52.064878+00	full	\N	\N
21	1	discovery	completed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	{"new": 10, "found": 10, "failed": 0, "skipped": 0}	\N	2026-05-14 15:36:33.785246+00	2026-05-14 15:36:54.851194+00	2026-05-14 15:36:33.655104+00	full	\N	\N
15	1	discovery	failed	{"keyword": "猫粮、幼猫", "strategy_id": 2}	\N	Exception: PDD API error: 非多多客，请到以下链接(https://jinbao.pinduoduo.com/third-party/rank）检查：1. duoId是否绑定clientId 2. 绑定clientId与当前clientId是否一致（不支持解绑clientId,请使用绑定clientId或者重新注册多多进宝账号进行绑定）	2026-05-14 12:56:03.51481+00	2026-05-14 12:56:03.697728+00	2026-05-14 12:56:03.38838+00	full	\N	\N
25	1	discovery	completed	{"keyword": "皇家猫粮", "strategy_id": 6}	{"new": 20, "found": 20, "failed": 0, "skipped": 0}	\N	2026-05-17 08:54:19.35821+00	2026-05-17 08:55:04.664448+00	2026-05-17 08:54:19.307262+00	full	\N	\N
22	1	discovery	completed	{"keyword": "皇家 网易严选 麦富迪 诚实一口", "strategy_id": 3}	{"new": 9, "found": 10, "failed": 0, "skipped": 1}	\N	2026-05-14 15:41:09.977517+00	2026-05-14 15:41:28.894792+00	2026-05-14 15:41:09.941339+00	full	\N	\N
23	1	discovery	completed	{"keyword": "鲜朗 猫粮", "strategy_id": 4}	{"new": 4, "found": 10, "failed": 0, "skipped": 6}	\N	2026-05-16 11:10:47.942948+00	2026-05-16 11:10:56.738662+00	2026-05-16 11:10:47.87846+00	full	\N	\N
\.


--
-- Data for Name: data_sources; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.data_sources (id, name, platform, config, is_active, last_sync_at, sync_interval_minutes, created_at, updated_at) FROM stdin;
1	拼多多多多进宝	pdd	{}	t	\N	60	2026-05-14 11:02:58.536511+00	2026-05-14 11:02:58.536511+00
2	小红书	xiaohongshu	{}	t	\N	1440	2026-05-14 11:02:58.536511+00	2026-05-14 11:02:58.536511+00
\.


--
-- Data for Name: external_products; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.external_products (id, product_id, source_id, platform, external_id, external_url, pid, is_primary, created_at) FROM stdin;
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.favorites (id, user_id, product_id, created_at) FROM stdin;
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.price_history (id, product_id, source_id, price, group_price, single_price, coupon_discount, recorded_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.products (id, category_id, name, brand, price_min, price_max, currency, image_urls, pros, cons, ratings, description, ingredients, specifications, source_url, source_platform, status, created_at, updated_at, search_vector, goods_name, spec_form, age_range, mall_name, pet_type, promotion_rate, min_group_price, min_normal_price, gallery_urls, detail_img_urls, service_tags, nutrition) FROM stdin;
\.


--
-- Data for Name: promotion_url_cache; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.promotion_url_cache (id, goods_sign, pid, short_url, mobile_url, we_app_url, expires_at, created_at) FROM stdin;
1	E9P2foICQ49t2X6xwfDAJF3lT9mEIi1JkQ_JDDu57kEK	44388613_315828604	https://p.pinduoduo.com/01F3kmjz?sc=EFAC	https://mobile.yangkeduo.com/duo_coupon_landing.html?goods_id=948790148379&pid=44388613_315828604&display_mod=101&goods_sign=E9P2foICQ49t2X6xwfDAJF3lT9mEIi1JkQ_JDDu57kEK&cpsSign=CC_260516_44388613_315828604_88ee6249cc9d2c03505818e552dcf671&_x_ddjb_act=%7B%22st%22%3A%221%22%7D&duoduo_type=2&launch_pdd=1&campaign=ddjb&cid=launch_dl_force_		2026-05-16 20:47:06.477692+00	2026-05-16 08:47:06.049801+00
2	E9z2f9bTx7Nt2X6xwfDAJI6nYFbayDAm8A_JQkIBDgExB	44388613_315828604	https://p.pinduoduo.com/OCs3U5s9?sc=EFAC	https://mobile.yangkeduo.com/duo_coupon_landing.html?goods_id=952352192807&pid=44388613_315828604&display_mod=101&goods_sign=E9z2f9bTx7Nt2X6xwfDAJI6nYFbayDAm8A_JQkIBDgExB&cpsSign=CC_260516_44388613_315828604_9182d5c338df0ed83702671dcc6633c2&_x_ddjb_act=%7B%22st%22%3A%221%22%7D&duoduo_type=2&launch_pdd=1&campaign=ddjb&cid=launch_dl_force_		2026-05-16 20:49:55.166241+00	2026-05-16 08:49:54.862363+00
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.reviews (id, product_id, user_id, rating, content, images, tags, is_recommended, source, source_url, helpful_count, status, llm_review_result, created_at, updated_at, external_note_id, author, note_published_at, note_likes) FROM stdin;
\.


--
-- Data for Name: search_strategies; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.search_strategies (id, data_source_id, name, keywords, opt_id, price_min, price_max, sort_type, max_items, last_run_at, last_result, created_at, updated_at, brand_filter) FROM stdin;
1	1	猫粮测试	["猫粮"]	\N	\N	\N	0	5	\N	\N	2026-05-14 11:04:52.783637+00	2026-05-14 11:04:52.783637+00	[]
2	1	猫粮-销量排序	["猫粮、幼猫"]	\N	\N	\N	2	10	2026-05-14 15:36:54.851217+00	{"new": 10, "found": 10, "failed": 0, "skipped": 0}	2026-05-14 11:16:26.701236+00	2026-05-14 15:36:54.861405+00	[]
3	1	猫粮-品牌	["皇家", "网易严选", "麦富迪", "诚实一口"]	\N	\N	\N	0	10	2026-05-14 15:41:28.894799+00	{"new": 9, "found": 10, "failed": 0, "skipped": 1}	2026-05-14 15:41:06.791876+00	2026-05-14 15:41:28.900429+00	[]
4	1	猫粮-鲜朗	["鲜朗", "猫粮"]	\N	\N	\N	0	10	2026-05-16 11:10:56.738669+00	{"new": 4, "found": 10, "failed": 0, "skipped": 6}	2026-05-16 11:10:45.569991+00	2026-05-16 11:10:56.765969+00	[]
5	1	皇家	["皇家", "全价猫粮"]	\N	\N	\N	0	100	2026-05-17 07:53:07.551817+00	{"new": 73, "found": 81, "failed": 0, "skipped": 8}	2026-05-17 07:50:22.735617+00	2026-05-17 07:53:07.600376+00	[]
6	1	仅搜索皇家	["皇家猫粮"]	\N	\N	\N	0	20	2026-05-17 08:55:04.66446+00	{"new": 20, "found": 20, "failed": 0, "skipped": 0}	2026-05-17 08:54:17.148301+00	2026-05-17 08:55:04.681047+00	[]
\.


--
-- Data for Name: spu_listings; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.spu_listings (id, spu_id, platform, shop_name, goods_id, title, price, original_price, url, image_url, sales_count, match_confidence, match_status, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: spus; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.spus (id, category_id, brand, name, model, pet_type, description, ingredients, nutrition, pros, cons, extra_attrs, price_min, price_max, currency, image_urls, status, created_at, updated_at) FROM stdin;
1	40	Royal Canin	Mother & Babycat 离乳期母猫与幼猫配方	Mother & Babycat	cat	适用于怀孕/哺乳期母猫、1-4个月离乳期幼猫。超软慕斯质地，帮助幼猫从母乳过渡到固体食物。含有专利抗氧化复合物（维生素E和C），支持幼猫免疫系统发育。添加Omega-3脂肪酸（DHA），支持脑部发育和视力健康。益生元（MOS）与高消化蛋白，促进肠道菌群平衡。	["肉类及动物衍生物", "谷物", "油脂", "牛奶及乳制品", "植物衍生物", "矿物质", "酵母"]	{"水分": "78.7-79.0%", "粗灰分": "1.7-1.9%", "粗纤维": "0.8-0.9%", "粗脂肪": "5.5%", "粗蛋白质": "10.5%"}	["超软慕斯质地，易于离乳期幼猫食用", "专利抗氧化复合物支持免疫系统发育", "Omega-3（DHA）支持脑部发育和视力健康", "益生元促进肠道菌群平衡"]	["湿粮水分含量高，需配合干粮使用", "价格相对较高"]	{"产品形式": "湿粮：超软慕斯罐头（195g）；干粮：离乳期幼猫奶糕", "适用对象": "怀孕/哺乳期母猫、1-4个月离乳期幼猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:19.732868+00	2026-05-21 11:05:19.732868+00
2	40	Royal Canin	Kitten 幼猫营养配方	Kitten	cat	适用于4-12个月成长期幼猫（也可用于怀孕或哺乳期母猫）。支持幼猫巩固期的快速生长需求。维生素C和E支持免疫系统健康发育，有助于疫苗接种后抗体更快升高。Omega-3（DHA）支持大脑发育和视力健康。益生元（MOS）与高消化蛋白促进肠道健康。颗粒小巧轻盈，适合幼猫口腔咀嚼。	["鸡肉副产品粉", "糙米", "啤酒米", "鸡脂肪", "小麦蛋白", "天然香料", "玉米", "玉米蛋白粉", "蛋制品", "甜菜浆", "纤维素", "植物油", "鱼油", "果寡糖", "水解酵母", "海洋微藻油", "牛磺酸"]	{"代谢能": "3823 kcal/kg", "磷（最低）": "0.75%", "钙（最低）": "0.93%", "水分（最高）": "7.5%", "粗纤维（最高）": "4.4%", "粗脂肪（最低）": "16.0%", "维生素E（最低）": "350 IU/kg", "粗蛋白质（最低）": "34.0%"}	["支持快速生长期营养需求", "维生素C和E促进免疫发育", "DHA支持大脑和视力发育", "小颗粒适合幼猫咀嚼", "高消化蛋白促进肠道健康"]	["含有谷物成分（糙米、玉米等）", "部分猫咪可能对鸡肉副产品敏感"]	{"产品形式": "干粮、湿粮（肉汁薄切/肉块浓汤）", "湿粮营养": "蛋白质12%、脂肪4%、纤维0.7%、灰分1.7%、水分78.2%", "适用对象": "4-12个月成长期幼猫、怀孕/哺乳期母猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:19.956906+00	2026-05-21 11:05:19.956906+00
3	40	Royal Canin	Fit 32 理想体态成猫配方	Fit 32	cat	适用于1-10岁健康成猫。均衡营养，维持理想体态。添加食物纤维（洋车前子壳0.5%），促进毛球排出。Omega-3和Omega-6脂肪酸，维护皮肤和毛发健康。独特配方有助于减少牙垢堆积。高消化性，减少排便量。	["脱水家禽蛋白", "米", "小麦", "玉米", "动物脂肪", "小麦蛋白", "水解动物蛋白", "蔬菜纤维", "甜菜浆", "大豆油", "鱼油", "洋车前子壳和籽", "果寡糖", "甘露寡糖", "金盏花提取物"]	{"代谢能": "3641 kcal/kg", "粗灰分": "7.3%", "粗纤维": "4.3%", "粗脂肪": "15%", "粗蛋白质": "32%"}	["均衡营养维持理想体态", "洋车前子壳促进毛球排出", "Omega-3/6维护皮肤毛发健康", "有助于减少牙垢堆积", "高消化性减少排便量"]	["含有较多谷物（米、小麦、玉米）", "蛋白质含量相对品种粮较低"]	{"特殊成分": "洋车前子壳0.5%", "适用对象": "1-10岁健康成猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:19.977004+00	2026-05-21 11:05:19.977004+00
4	40	Royal Canin	Indoor 27 室内成猫配方	Indoor 27	cat	适用于1-7岁室内生活成猫。控制热量，适应室内猫较低的活动量。特定纤维（洋车前子、甜菜浆、果寡糖）帮助排出毛球。高消化蛋白（L.I.P.）减少粪便气味。维护泌尿道健康。	["鸡肉粉", "玉米", "啤酒米", "玉米蛋白粉", "小麦", "鸡脂肪", "小麦蛋白", "天然香料", "糙米", "豌豆纤维", "米糠", "甜菜浆", "植物油", "硫酸钙", "酵母", "鱼油", "氯化钾", "果寡糖", "焦磷酸钠", "洋车前子壳", "盐", "牛磺酸"]	{"代谢能": "3534 kcal/kg", "水分（最高）": "8.0%", "粗纤维（最高）": "5.7%", "粗脂肪（最低）": "11.0%", "粗脂肪（最高）": "15.0%", "粗蛋白质（最低）": "27.0%"}	["低热量配方适合室内猫", "多种纤维帮助排毛球", "高消化蛋白减少粪便气味", "维护泌尿道健康"]	["蛋白质含量较低（27%）", "含有较多谷物成分"]	{"生活方式": "室内猫专用", "适用对象": "1-7岁室内生活成猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:19.995493+00	2026-05-21 11:05:19.995493+00
5	40	Royal Canin	Sensible 33 肠胃敏感成猫配方	Sensible 33	cat	适用于1-7岁消化敏感成猫。三种不同形状颗粒，提高适口性。极高消化性蛋白质（L.I.P.）+ 益生元，支持安全消化和肠道菌群平衡。高能量配方，减少每餐喂食量，减轻消化道负担。维护泌尿道健康。	["脱水家禽蛋白", "米", "动物脂肪", "植物分离蛋白", "小麦粉", "水解动物蛋白", "玉米", "玉米蛋白", "甜菜浆", "鱼油", "蔬菜纤维", "大豆油", "果寡糖"]	{"粗灰分": "7.7%", "粗纤维": "1.6%", "粗脂肪": "22.0%", "粗蛋白质": "33.0%"}	["三种颗粒形状提高适口性", "极高消化蛋白适合敏感肠胃", "益生元支持肠道菌群平衡", "高能量减少每餐喂食量", "减轻消化道负担"]	["脂肪含量较高（22%）", "价格相对较高"]	{"功能": "肠胃敏感护理", "适用对象": "1-7岁消化敏感成猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.012269+00	2026-05-21 11:05:20.012269+00
6	40	Royal Canin	Indoor 7+ 室内熟龄猫配方	Indoor 7+	cat	适用于7-12岁室内猫。活力复合物：维生素C、绿茶多酚（150mg/kg）、EPA/DHA，应对初老迹象。调整磷含量，支持肾脏健康。葡萄糖胺和软骨素（500mg/kg）支持关节健康。超软颗粒，适合熟龄猫敏感的牙齿和牙龈。高消化性蛋白减少粪便气味。	["玉米", "脱水家禽蛋白", "大麦", "玉米粉", "小麦", "水解动物蛋白", "动物脂肪", "小麦蛋白", "甜菜浆", "蔬菜纤维", "大豆油", "鱼油", "果寡糖", "洋车前子壳", "葡萄糖胺", "金盏花粉", "软骨素"]	{"水分": "5.5%", "粗灰分": "7.2%", "粗纤维": "3.4%", "粗脂肪": "13%", "粗蛋白质": "26.5%"}	["活力复合物应对初老迹象", "调整磷含量支持肾脏健康", "葡萄糖胺和软骨素支持关节", "超软颗粒适合敏感牙齿", "高消化蛋白减少粪便气味"]	["蛋白质含量较低（26.5%）", "仅适用于室内熟龄猫"]	{"特殊成分": "绿茶多酚150mg/kg、葡萄糖胺和软骨素500mg/kg", "生命阶段": "熟龄期", "适用对象": "7-12岁室内猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.028801+00	2026-05-21 11:05:20.028801+00
15	40	Royal Canin	Hairball Care 毛球护理配方	Hairball Care	cat	天然纤维组合（洋车前子、甜菜浆等）促进肠道蠕动。帮助毛球顺畅排出，减少呕吐毛球。适用于室内猫和长毛猫。	[]	{}	["天然纤维促进肠道蠕动", "帮助毛球顺畅排出", "减少呕吐毛球"]	["报告未提供完整成分和营养数据", "主要适用于长毛猫和室内猫"]	{"功能": "毛球护理", "适用对象": "室内猫和长毛猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.187601+00	2026-05-21 11:05:20.187601+00
7	40	Royal Canin	Ageing 12+ 老年猫配方	Ageing 12+	cat	适用于12岁以上老年猫。适中磷含量，支持肾脏健康。添加番茄红素（来自番茄），抗氧化支持。Omega-3（EPA/DHA）来自鱼油，支持关节健康。葡萄糖胺和软骨素支持关节功能。高消化蛋白，减少粪便量和气味。绿茶提取物（多酚来源）0.6g/kg，抗氧化。	["植物蛋白分离物", "预煮小麦粉", "动物脂肪", "脱水家禽蛋白", "米", "玉米", "蔬菜纤维", "水解动物蛋白", "菊苣浆", "鱼油", "大豆油", "酵母", "番茄红素", "果寡糖", "洋车前子", "甘露寡糖", "水解甲壳类（葡萄糖胺来源）", "琉璃苣油", "金盏花提取物", "水解软骨（软骨素来源）"]	{"磷": "0.6%", "粗灰分": "5.3%", "粗纤维": "4.4%", "粗脂肪": "19%", "粗蛋白质": "30%", "Omega-3脂肪酸": "10.9 g/kg"}	["适中磷含量支持肾脏健康", "番茄红素抗氧化支持", "Omega-3支持关节健康", "葡萄糖胺和软骨素保护关节", "高消化蛋白减少粪便量", "绿茶多酚抗氧化"]	["脂肪含量较高（19%）", "仅适用于12岁以上老年猫"]	{"特殊成分": "番茄红素、绿茶提取物0.6g/kg", "生命阶段": "老年期", "适用对象": "12岁以上老年猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.047882+00	2026-05-21 11:05:20.047882+00
8	40	Royal Canin	British Shorthair 英国短毛猫成猫专用	British Shorthair Adult	cat	适用于12月龄以上英短成猫。支持骨骼和关节健康：添加Omega-3（EPA/DHA）。心脏健康：富含牛磺酸、EPA和DHA。L-肉碱参与健康脂肪代谢，帮助维持理想体重。独家新月形大颗粒，适合英短宽大的下颚，促进咀嚼和口腔卫生。34%蛋白含量维持肌肉量。	["脱水家禽蛋白", "米", "植物分离蛋白", "动物脂肪", "玉米", "玉米蛋白", "蔬菜纤维", "水解动物蛋白", "菊苣浆", "鱼油", "大豆油", "酵母", "果寡糖", "甘露寡糖", "琉璃苣油", "水解甲壳类（葡萄糖胺来源）", "金盏花提取物", "水解软骨（软骨素来源）"]	{"L-肉碱": "200 mg/kg", "代谢能": "4005 kcal/kg", "牛磺酸": "2.6 g/kg", "粗灰分": "6.8-6.9%", "粗纤维": "5.3%", "粗脂肪": "19%", "粗蛋白质": "34%", "Omega-3（含EPA/DHA）": "9.7 g/kg"}	["新月形大颗粒适合英短下颚", "Omega-3支持骨骼关节健康", "牛磺酸和EPA/DHA支持心脏", "L-肉碱帮助维持理想体重", "34%蛋白维持肌肉量"]	["仅适用于英短成猫", "代谢能较高（4005 kcal/kg）"]	{"品种专用": "英国短毛猫", "适用对象": "12月龄以上英短成猫", "颗粒形状": "新月形大颗粒"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.067048+00	2026-05-21 11:05:20.067048+00
9	40	Royal Canin	British Shorthair 英国短毛猫幼猫专用	British Shorthair Kitten	cat	适用于英短幼猫。高蛋白支持骨骼肌肉发育。	[]	{"水分": "5.5%", "粗灰分": "8%", "粗纤维": "2.2%", "粗脂肪": "20%", "粗蛋白质": "38%"}	["高蛋白（38%）支持发育", "专为英短幼猫设计"]	["报告未提供完整成分信息", "仅适用于英短幼猫"]	{"品种专用": "英国短毛猫", "生命阶段": "幼猫期", "适用对象": "英短幼猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.083884+00	2026-05-21 11:05:20.083884+00
10	40	Royal Canin	Persian 波斯猫专用	Persian	cat	适用于12月龄以上波斯猫。杏仁形特制颗粒，适配波斯猫短面部结构（扁脸），方便用舌头下方舀取食物。Omega-3和Omega-6脂肪酸，保持长毛柔软亮泽。特殊纤维组合，防止毛球形成。独特矿物质组合支持泌尿道健康。	["脱水家禽蛋白", "动物脂肪", "米", "植物分离蛋白", "玉米", "蔬菜纤维", "玉米粉", "水解动物蛋白", "玉米蛋白", "菊苣浆", "鱼油", "洋车前子壳和籽", "大豆油", "果寡糖", "甘露寡糖", "琉璃苣油", "金盏花提取物"]	{}	["杏仁形颗粒适配扁脸结构", "Omega-3/6保持长毛亮泽", "特殊纤维防止毛球形成", "矿物质组合支持泌尿道"]	["报告未提供完整营养数据", "仅适用于波斯猫"]	{"品种专用": "波斯猫", "适用对象": "12月龄以上波斯猫", "颗粒形状": "杏仁形"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.102097+00	2026-05-21 11:05:20.102097+00
11	40	Royal Canin	Maine Coon 缅因猫专用	Maine Coon	cat	适用于15月龄以上缅因猫。关节健康：添加葡萄糖胺和软骨素，支持大体型带来的关节压力。心脏健康：富含牛磺酸和Omega-3，支持心脏功能。大颗粒设计，适合缅因猫大而方正的下颚。富含优质蛋白支持肌肉发育。	[]	{}	["葡萄糖胺和软骨素支持关节", "牛磺酸和Omega-3支持心脏", "大颗粒适合缅因猫下颚", "优质蛋白支持肌肉发育"]	["报告未提供完整成分和营养数据", "仅适用于缅因猫"]	{"品种专用": "缅因猫", "适用对象": "15月龄以上缅因猫", "颗粒形状": "大颗粒"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.119531+00	2026-05-21 11:05:20.119531+00
12	40	Royal Canin	Ragdoll 布偶猫专用	Ragdoll	cat	适用于12月龄以上布偶猫。关节和骨骼健康：布偶猫体型大、骨骼重，需特别关注。金字塔形颗粒，适合布偶猫宽大的下颚。Omega-3和Omega-6维护半长型丝质被毛。支持心脏健康。	[]	{}	["关注关节和骨骼健康", "金字塔形颗粒适合布偶猫", "Omega-3/6维护丝质被毛", "支持心脏健康"]	["报告未提供完整成分和营养数据", "仅适用于布偶猫"]	{"品种专用": "布偶猫", "适用对象": "12月龄以上布偶猫", "颗粒形状": "金字塔形"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.136668+00	2026-05-21 11:05:20.136668+00
13	40	Royal Canin	Siamese 暹罗猫专用	Siamese	cat	适用于12月龄以上暹罗猫。管状颗粒设计，适合暹罗猫尖长窄小的下颚，方便用牙齿叼取。高易消化蛋白、低脂肪配方，保持暹罗猫典型的修长体型。氨基酸、维生素和Omega-3/6维持短而光滑的被毛。矿物质平衡支持泌尿道健康。	["脱水家禽蛋白", "植物分离蛋白", "玉米", "小麦", "动物脂肪", "玉米蛋白", "米", "水解动物蛋白", "甜菜浆", "鱼油", "酵母", "果寡糖", "大豆油", "甘露寡糖", "琉璃苣油", "金盏花提取物"]	{"L-肉碱": "50 mg/kg", "粗灰分": "7.7%", "粗纤维": "1.4%", "粗脂肪": "16%", "粗蛋白质": "38%", "Omega-3脂肪酸": "7.9 g/kg", "Omega-6脂肪酸": "37.7 g/kg"}	["管状颗粒适合暹罗猫下颚", "低脂肪保持修长体型", "高易消化蛋白", "Omega-3/6维持短毛光泽", "矿物质平衡支持泌尿道"]	["仅适用于暹罗猫", "含有谷物成分"]	{"品种专用": "暹罗猫", "适用对象": "12月龄以上暹罗猫", "颗粒形状": "管状"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.15456+00	2026-05-21 11:05:20.15456+00
14	40	Royal Canin	Digestive Care 消化呵护配方	Digestive Care	cat	高易消化蛋白质（L.I.P.）。益生元（FOS）和特定纤维组合，支持肠道菌群平衡。有助于改善粪便质量。有干粮和湿粮（loaf in sauce肉饼肉汁型）两种形式。适用于消化不良、软便、肠胃敏感。	[]	{}	["高易消化蛋白质（L.I.P.）", "益生元和纤维支持肠道菌群", "改善粪便质量"]	["报告未提供完整成分和营养数据", "适用于特定症状"]	{"功能": "消化呵护", "适用症状": "消化不良、软便、肠胃敏感"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.170045+00	2026-05-21 11:05:20.170045+00
16	40	Royal Canin	Oral Care 口腔护理配方	Oral Care	cat	特殊颗粒纹理，模拟刷牙动作清洁牙齿。焦磷酸钠捕获有害矿物质，减少牙垢和牙菌斑形成。绿茶多酚有助于口腔卫生。	[]	{}	["特殊颗粒模拟刷牙清洁", "焦磷酸钠减少牙垢牙菌斑", "绿茶多酚有助于口腔卫生"]	["报告未提供完整成分和营养数据", "不能替代专业洗牙"]	{"功能": "口腔护理"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.204211+00	2026-05-21 11:05:20.204211+00
17	40	Royal Canin	Urinary Care 泌尿道护理配方	Urinary Care	cat	矿物质平衡配方，维持泌尿道健康。帮助维持尿液pH值。建议搭配湿粮增加水分摄取。	[]	{}	["矿物质平衡维持泌尿道健康", "帮助维持尿液pH值"]	["报告未提供完整成分和营养数据", "建议搭配湿粮使用"]	{"功能": "泌尿道护理", "建议": "搭配湿粮增加水分摄取"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.22229+00	2026-05-21 11:05:20.22229+00
18	40	Royal Canin	Hair & Skin Care 皮肤与被毛护理配方	Hair & Skin Care	cat	Omega-3和Omega-6脂肪酸，支持皮肤健康。特定氨基酸和维生素组合，促进毛发光泽。减少掉毛问题。	[]	{}	["Omega-3/6支持皮肤健康", "氨基酸和维生素促进毛发光泽", "减少掉毛问题"]	["报告未提供完整成分和营养数据"]	{"功能": "皮肤与被毛护理"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.240184+00	2026-05-21 11:05:20.240184+00
19	40	Royal Canin	Weight Care 体重管理配方	Weight Care	cat	调整脂肪含量，控制热量。L-肉碱促进脂肪代谢。高纤维增加饱腹感。适用于绝育后易发胖的猫咪。	[]	{}	["调整脂肪控制热量", "L-肉碱促进脂肪代谢", "高纤维增加饱腹感"]	["报告未提供完整成分和营养数据", "主要适用于需控制体重的猫咪"]	{"功能": "体重管理", "适用对象": "绝育后易发胖的猫咪"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.261072+00	2026-05-21 11:05:20.261072+00
20	40	Royal Canin	Urinary S/O 泌尿道处方粮	Urinary S/O	cat	适用于鸟粪石（磷酸铵镁结石）的溶解与预防、草酸钙结石预防、猫下泌尿道疾病（FLUTD）。尿液酸化、低镁配方。降低相对饱和度（RSS），减少结晶形成。稀释尿液，促进定期膀胱冲洗。	["米", "脱水家禽蛋白", "小麦蛋白", "玉米粉", "蔬菜纤维", "玉米蛋白", "水解动物蛋白", "矿物质", "动物脂肪", "鱼油", "大豆油", "果寡糖", "金盏花粉"]	{}	["帮助溶解和预防鸟粪石", "预防草酸钙结石", "低镁配方", "降低结晶形成风险", "稀释尿液促进膀胱冲洗"]	["需在兽医指导下使用", "不适用于所有猫咪"]	{"产品系列": "Urinary S/O / Urinary S/O Moderate Calorie / Urinary S/O Wet", "注意事项": "需在兽医指导下使用", "适用症状": "鸟粪石溶解与预防、草酸钙结石预防、FLUTD"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.279274+00	2026-05-21 11:05:20.279274+00
21	40	Royal Canin	Renal / Early Renal 肾脏处方粮	Renal	cat	适用于慢性肾病早期管理、肾功能下降。适中/低磷含量，减轻肾脏过滤负担。EPA+DHA和抗氧化复合物支持肾功能。高度易消化配方。Early Renal额外含有葡萄糖胺和软骨素支持关节功能，支持健康老龄化。	[]	{}	["适中/低磷含量减轻肾脏负担", "EPA+DHA支持肾功能", "抗氧化复合物支持肾脏", "高度易消化配方", "Early Renal支持关节功能"]	["需在兽医指导下使用", "不适用于健康猫咪"]	{"产品系列": "Renal / Early Renal", "注意事项": "需在兽医指导下使用", "适用症状": "慢性肾病早期管理、肾功能下降"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.299128+00	2026-05-21 11:05:20.299128+00
22	40	Royal Canin	Gastrointestinal GI32 肠胃处方粮	GI32	cat	标准版肠胃处方，适合消化敏感的成猫。高度易消化蛋白质（62.7%高消化蛋白来源）。平衡的纤维和益生元，支持肠道菌群。Omega-3（EPA/DHA）帮助舒缓消化道。高能量密度，减少每餐量，减轻肠道负担。S/O指数支持泌尿道健康。高适口性，适合食欲下降的猫。	["脱水家禽蛋白", "小麦蛋白", "米", "蔬菜纤维", "玉米", "动物脂肪", "水解动物蛋白", "甜菜浆", "大豆油", "鱼油", "洋车前子壳和籽（0.48%）", "果寡糖", "DHA藻油", "甘露寡糖", "金盏花粉"]	{}	["高度易消化蛋白质（62.7%）", "纤维和益生元支持肠道菌群", "Omega-3舒缓消化道", "高能量密度减少每餐量", "S/O指数支持泌尿道", "高适口性适合食欲下降"]	["需在兽医指导下使用", "仅适用于消化敏感的成猫"]	{"产品系列": "GI32 / GIM35 / Fiber Response", "注意事项": "需在兽医指导下使用", "适用情况": "标准版肠胃处方，适合消化敏感的成猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.317691+00	2026-05-21 11:05:20.317691+00
23	40	Royal Canin	Gastrointestinal GIM35 肠胃处方粮	GIM35	cat	适中卡路里版肠胃处方，适合需控制体重的肠胃敏感猫。	[]	{}	["适中卡路里适合控制体重", "专为肠胃敏感猫设计"]	["报告未提供完整成分和营养数据", "需在兽医指导下使用"]	{"产品系列": "GI32 / GIM35 / Fiber Response", "注意事项": "需在兽医指导下使用", "适用情况": "适中卡路里版，适合需控制体重的肠胃敏感猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.335528+00	2026-05-21 11:05:20.335528+00
24	40	Royal Canin	Gastrointestinal Fiber Response 肠胃处方粮	Fiber Response	cat	高纤维版肠胃处方，含洋车前子，适合需要肠道蠕动支持的猫。	[]	{}	["高纤维支持肠道蠕动", "含洋车前子促进消化"]	["报告未提供完整成分和营养数据", "需在兽医指导下使用"]	{"产品系列": "GI32 / GIM35 / Fiber Response", "注意事项": "需在兽医指导下使用", "适用情况": "高纤维版，适合需要肠道蠕动支持的猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.353075+00	2026-05-21 11:05:20.353075+00
25	40	Royal Canin	Hypoallergenic 低敏处方粮	Hypoallergenic	cat	水解蛋白处方粮，降低过敏风险。	[]	{}	["水解蛋白降低过敏风险"]	["报告未提供完整成分和营养数据", "需在兽医指导下使用"]	{"特点": "水解蛋白，降低过敏风险", "产品系列": "Hypoallergenic / Anallergenic / Sensitivity Control", "注意事项": "需在兽医指导下使用"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.37121+00	2026-05-21 11:05:20.37121+00
26	40	Royal Canin	Anallergenic 极致低敏处方粮	Anallergenic	cat	极致低敏处方粮，使用高度水解蛋白。	[]	{}	["高度水解蛋白极致低敏"]	["报告未提供完整成分和营养数据", "需在兽医指导下使用"]	{"特点": "极致低敏，使用高度水解蛋白", "产品系列": "Hypoallergenic / Anallergenic / Sensitivity Control", "注意事项": "需在兽医指导下使用"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.388876+00	2026-05-21 11:05:20.388876+00
27	40	Royal Canin	Sensitivity Control 低敏处方粮	Sensitivity Control	cat	新型蛋白源处方粮，适合食物敏感猫。	[]	{}	["新型蛋白源适合食物敏感猫"]	["报告未提供完整成分和营养数据", "需在兽医指导下使用"]	{"特点": "新型蛋白源，适合食物敏感猫", "产品系列": "Hypoallergenic / Anallergenic / Sensitivity Control", "注意事项": "需在兽医指导下使用"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.405512+00	2026-05-21 11:05:20.405512+00
28	41	Royal Canin	Mother & Babycat 慕斯肉泥	Mother & Babycat Wet	cat	适用于怀孕/哺乳期母猫、1-4个月幼猫。超软细腻质地，易于舔食。DHA支持脑部发育。维生素C和E支持免疫系统。益生元和高消化蛋白支持肠道健康。	[]	{"水分": "78.7-79%", "灰分": "1.7-1.9%", "纤维": "0.8-0.9%", "脂肪": "5.5%", "蛋白质": "10.5%"}	["超软慕斯质地易于舔食", "DHA支持脑部发育", "维生素C和E支持免疫系统", "益生元支持肠道健康"]	["水分含量高（78-79%）", "需配合干粮保证营养"]	{"规格": "195g罐头", "质地类型": "慕斯肉泥（Ultra Soft Mousse / Loaf in Sauce）", "适用对象": "怀孕/哺乳期母猫、1-4个月幼猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.423363+00	2026-05-21 11:05:20.423363+00
29	41	Royal Canin	Kitten 幼猫湿粮	Kitten Wet	cat	适用于4-12个月幼猫。肉汁薄切型和肉块浓汤型两种质地。	[]	{"水分": "78.2%", "灰分": "1.7%", "纤维": "0.7%", "脂肪": "4%", "蛋白质": "12%"}	["两种质地可选（薄切/肉块）", "适合幼猫小口食用"]	["水分含量高", "蛋白质含量相对干粮较低"]	{"质地类型": "肉汁薄切（Thin Slices in Gravy）/ 肉块浓汤（Chunks in Gravy）", "适用对象": "4-12个月幼猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.441388+00	2026-05-21 11:05:20.441388+00
30	41	Royal Canin	成猫浓汤肉块 IGP7	IGP7	cat	适用于7岁以上成猫。添加牛磺酸、葡萄糖胺和硫酸软骨素，支持心脏与关节健康。	[]	{}	["牛磺酸支持心脏健康", "葡萄糖胺和软骨素支持关节", "适合7岁以上成猫"]	["报告未提供完整成分和营养数据"]	{"质地类型": "浓汤肉块（Chunks in Gravy）", "适用对象": "7岁以上成猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.458693+00	2026-05-21 11:05:20.458693+00
31	41	Royal Canin	成猫慕斯肉泥	Adult Mousse	cat	适用于偏好柔软质地的成猫。	[]	{}	["柔软慕斯质地", "适合偏好软食的成猫"]	["报告未提供完整成分和营养数据"]	{"质地类型": "慕斯肉泥（Loaf in Sauce）", "适用对象": "成猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.47637+00	2026-05-21 11:05:20.47637+00
32	41	Royal Canin	成猫薄切肉汁	Adult Thin Slices	cat	经典成猫主食湿粮。	[]	{}	["经典薄切质地", "可作为主食喂养"]	["报告未提供完整成分和营养数据"]	{"质地类型": "薄切肉汁（Thin Slices in Gravy）", "适用对象": "成猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.494361+00	2026-05-21 11:05:20.494361+00
33	41	Royal Canin	British Shorthair 英短湿粮	British Shorthair Wet	cat	圆柱形肉块肉汁型，专门适配英短口径。	[]	{"水分": "81%", "脂肪": "3.2%", "蛋白质": "9%"}	["圆柱形肉块适配英短口径", "专为英短设计"]	["营养数据不完整", "仅适用于英短"]	{"品种专用": "英国短毛猫", "质地类型": "肉块肉汁型", "适用对象": "英国短毛猫"}	\N	\N	CNY	[]	active	2026-05-21 11:05:20.511867+00	2026-05-21 11:05:20.511867+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: petshop
--

COPY public.users (id, openid, unionid, nickname, avatar_url, pet_types, profile, created_at, updated_at, is_admin) FROM stdin;
1	admin:admin	\N	Administrator		[]	{"password_hash": "$2b$12$pcz1qD6HWmuMKJG1f3cwN./JPSvvJbN4b.8Lgqj9xmbYg7lORkv7W"}	2026-05-12 14:24:13.249965+00	2026-05-14 11:04:34.725922+00	t
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.categories_id_seq', 68, true);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 23, true);


--
-- Name: chat_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.chat_sessions_id_seq', 23, true);


--
-- Name: data_fetch_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.data_fetch_jobs_id_seq', 25, true);


--
-- Name: data_sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.data_sources_id_seq', 2, true);


--
-- Name: external_products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.external_products_id_seq', 133, true);


--
-- Name: favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.favorites_id_seq', 1, true);


--
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.price_history_id_seq', 105, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.products_id_seq', 224, true);


--
-- Name: promotion_url_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.promotion_url_cache_id_seq', 2, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.reviews_id_seq', 174, true);


--
-- Name: search_strategies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.search_strategies_id_seq', 6, true);


--
-- Name: spu_listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.spu_listings_id_seq', 1, false);


--
-- Name: spus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.spus_id_seq', 33, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: petshop
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: data_fetch_jobs data_fetch_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.data_fetch_jobs
    ADD CONSTRAINT data_fetch_jobs_pkey PRIMARY KEY (id);


--
-- Name: data_sources data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.data_sources
    ADD CONSTRAINT data_sources_pkey PRIMARY KEY (id);


--
-- Name: external_products external_products_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: promotion_url_cache promotion_url_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.promotion_url_cache
    ADD CONSTRAINT promotion_url_cache_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: search_strategies search_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.search_strategies
    ADD CONSTRAINT search_strategies_pkey PRIMARY KEY (id);


--
-- Name: spu_listings spu_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spu_listings
    ADD CONSTRAINT spu_listings_pkey PRIMARY KEY (id);


--
-- Name: spus spus_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spus
    ADD CONSTRAINT spus_pkey PRIMARY KEY (id);


--
-- Name: external_products uq_external_product; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT uq_external_product UNIQUE (product_id, platform, external_id);


--
-- Name: promotion_url_cache uq_promotion_cache_goods_pid; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.promotion_url_cache
    ADD CONSTRAINT uq_promotion_cache_goods_pid UNIQUE (goods_sign, pid);


--
-- Name: spu_listings uq_spu_listings_platform_goods_id; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spu_listings
    ADD CONSTRAINT uq_spu_listings_platform_goods_id UNIQUE (platform, goods_id);


--
-- Name: spus uq_spus_brand_category_name_model; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spus
    ADD CONSTRAINT uq_spus_brand_category_name_model UNIQUE (brand, category_id, name, model);


--
-- Name: favorites uq_user_product_favorite; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT uq_user_product_favorite UNIQUE (user_id, product_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_categories_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_categories_id ON public.categories USING btree (id);


--
-- Name: ix_categories_pet_type; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_categories_pet_type ON public.categories USING btree (pet_type);


--
-- Name: ix_chat_messages_created_at; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_chat_messages_created_at ON public.chat_messages USING btree (created_at);


--
-- Name: ix_chat_messages_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_chat_messages_id ON public.chat_messages USING btree (id);


--
-- Name: ix_chat_messages_session_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_chat_messages_session_id ON public.chat_messages USING btree (session_id);


--
-- Name: ix_chat_sessions_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_chat_sessions_id ON public.chat_sessions USING btree (id);


--
-- Name: ix_data_fetch_jobs_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_data_fetch_jobs_id ON public.data_fetch_jobs USING btree (id);


--
-- Name: ix_data_sources_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_data_sources_id ON public.data_sources USING btree (id);


--
-- Name: ix_external_products_external_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_external_products_external_id ON public.external_products USING btree (platform, external_id);


--
-- Name: ix_favorites_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_favorites_id ON public.favorites USING btree (id);


--
-- Name: ix_favorites_product_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_favorites_product_id ON public.favorites USING btree (product_id);


--
-- Name: ix_price_history_product; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_price_history_product ON public.price_history USING btree (product_id, recorded_at DESC);


--
-- Name: ix_products_age_range; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_age_range ON public.products USING btree (age_range);


--
-- Name: ix_products_brand; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_brand ON public.products USING btree (brand);


--
-- Name: ix_products_category_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_category_id ON public.products USING btree (category_id);


--
-- Name: ix_products_created_at; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_created_at ON public.products USING btree (created_at);


--
-- Name: ix_products_goods_name; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_goods_name ON public.products USING btree (goods_name);


--
-- Name: ix_products_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_id ON public.products USING btree (id);


--
-- Name: ix_products_mall_name; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_mall_name ON public.products USING btree (mall_name);


--
-- Name: ix_products_pet_type; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_pet_type ON public.products USING btree (pet_type);


--
-- Name: ix_products_search_vector; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_search_vector ON public.products USING gin (search_vector);


--
-- Name: ix_products_spec_form; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_spec_form ON public.products USING btree (spec_form);


--
-- Name: ix_products_status; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_status ON public.products USING btree (status);


--
-- Name: ix_products_status_category_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_products_status_category_id ON public.products USING btree (status, category_id);


--
-- Name: ix_promotion_url_cache_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_promotion_url_cache_id ON public.promotion_url_cache USING btree (id);


--
-- Name: ix_reviews_external_note_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_reviews_external_note_id ON public.reviews USING btree (external_note_id);


--
-- Name: ix_reviews_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_reviews_id ON public.reviews USING btree (id);


--
-- Name: ix_reviews_product_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: ix_reviews_product_id_status; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_reviews_product_id_status ON public.reviews USING btree (product_id, status);


--
-- Name: ix_reviews_status; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_reviews_status ON public.reviews USING btree (status);


--
-- Name: ix_search_strategies_ds; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_search_strategies_ds ON public.search_strategies USING btree (data_source_id);


--
-- Name: ix_spu_listings_created_at; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spu_listings_created_at ON public.spu_listings USING btree (created_at);


--
-- Name: ix_spu_listings_goods_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spu_listings_goods_id ON public.spu_listings USING btree (goods_id);


--
-- Name: ix_spu_listings_match_status; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spu_listings_match_status ON public.spu_listings USING btree (match_status);


--
-- Name: ix_spu_listings_platform; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spu_listings_platform ON public.spu_listings USING btree (platform);


--
-- Name: ix_spu_listings_spu_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spu_listings_spu_id ON public.spu_listings USING btree (spu_id);


--
-- Name: ix_spus_brand; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spus_brand ON public.spus USING btree (brand);


--
-- Name: ix_spus_category_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spus_category_id ON public.spus USING btree (category_id);


--
-- Name: ix_spus_created_at; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spus_created_at ON public.spus USING btree (created_at);


--
-- Name: ix_spus_pet_type; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spus_pet_type ON public.spus USING btree (pet_type);


--
-- Name: ix_spus_status; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_spus_status ON public.spus USING btree (status);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_openid; Type: INDEX; Schema: public; Owner: petshop
--

CREATE UNIQUE INDEX ix_users_openid ON public.users USING btree (openid);


--
-- Name: ix_users_pet_types; Type: INDEX; Schema: public; Owner: petshop
--

CREATE INDEX ix_users_pet_types ON public.users USING gin (pet_types);


--
-- Name: products products_search_vector_trigger; Type: TRIGGER; Schema: public; Owner: petshop
--

CREATE TRIGGER products_search_vector_trigger BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_search_vector_update();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: data_fetch_jobs data_fetch_jobs_data_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.data_fetch_jobs
    ADD CONSTRAINT data_fetch_jobs_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id);


--
-- Name: external_products external_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: external_products external_products_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id);


--
-- Name: favorites favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price_history price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: price_history price_history_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: search_strategies search_strategies_data_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.search_strategies
    ADD CONSTRAINT search_strategies_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES public.data_sources(id);


--
-- Name: spu_listings spu_listings_spu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spu_listings
    ADD CONSTRAINT spu_listings_spu_id_fkey FOREIGN KEY (spu_id) REFERENCES public.spus(id) ON DELETE CASCADE;


--
-- Name: spus spus_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: petshop
--

ALTER TABLE ONLY public.spus
    ADD CONSTRAINT spus_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- PostgreSQL database dump complete
--

\unrestrict kxPpw0eCUydqCQzcAP0GgHDo14IKu5j3A5zOOy1tgcYDO5QLjShqbJ0bA4CE7RG

