-- North Africa Times - PostgreSQL Database Schema
-- Run with: psql -U postgres -f schema.sql

-- Create database
CREATE DATABASE north_africa_times;

-- Connect to database
\c north_africa_times;

-- ============================================================================
-- ARTICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    title_ar TEXT,
    title_fr TEXT,
    slug VARCHAR(255),
    url TEXT UNIQUE NOT NULL,
    source VARCHAR(255),
    source_url TEXT,
    author VARCHAR(255),
    published_at TIMESTAMP,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    country VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    image_url TEXT,
    image_local TEXT,
    excerpt TEXT,
    excerpt_ar TEXT,
    excerpt_fr TEXT,
    content TEXT,
    language VARCHAR(10) DEFAULT 'en',
    relevance_score INTEGER DEFAULT 50,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    is_breaking BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7),
    icon VARCHAR(50),
    description TEXT,
    article_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, name_ar, slug, color, icon) VALUES
    ('Politics', 'سياسة', 'politics', '#D52B1E', 'government'),
    ('Economy', 'اقتصاد', 'economy', '#006233', 'trending-up'),
    ('Security', 'أمن', 'security', '#8B0000', 'shield'),
    ('Energy', 'طاقة', 'energy', '#FF8C00', 'zap'),
    ('Business', 'أعمال', 'business', '#C9A961', 'briefcase'),
    ('Technology', 'تكنولوجيا', 'technology', '#0066cc', 'cpu'),
    ('Culture', 'ثقافة', 'culture', '#9b59b6', 'music'),
    ('Regional', 'إقليمي', 'regional', '#16a085', 'globe')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ARTICLE_TAGS TABLE (Junction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- ============================================================================
-- SUBSCRIBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    preferences JSONB DEFAULT '{}',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP
);

-- ============================================================================
-- SOCIAL_POSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_posts (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    post_id VARCHAR(255),
    content TEXT,
    language VARCHAR(2),
    video_url TEXT,
    thumbnail_url TEXT,
    posted_at TIMESTAMP,
    engagement JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VIDEO_QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_queue (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    language VARCHAR(2) NOT NULL,
    script TEXT,
    video_path TEXT,
    thumbnail_path TEXT,
    duration INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- ============================================================================
-- ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    articles_read INTEGER DEFAULT 0,
    avg_time_on_site INTEGER,
    bounce_rate DECIMAL(5,2),
    top_articles JSONB DEFAULT '[]',
    top_categories JSONB DEFAULT '[]',
    traffic_sources JSONB DEFAULT '{}',
    country_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_articles_country ON articles(country);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_score ON articles(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_breaking ON articles(is_breaking) WHERE is_breaking = true;
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_articles_title_search ON articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_articles_content_search ON articles USING gin(to_tsvector('english', content));

-- Social posts indexes
CREATE INDEX IF NOT EXISTS idx_social_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_article ON social_posts(article_id);
CREATE INDEX IF NOT EXISTS idx_social_status ON social_posts(status);

-- Video queue indexes
CREATE INDEX IF NOT EXISTS idx_video_status ON video_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_priority ON video_queue(priority DESC);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Latest articles by country
CREATE OR REPLACE VIEW latest_by_country AS
SELECT 
    country,
    COUNT(*) as count,
    MAX(published_at) as latest,
    MIN(published_at) as earliest
FROM articles
WHERE published_at > NOW() - INTERVAL '24 hours'
GROUP BY country;

-- Category statistics
CREATE OR REPLACE VIEW category_stats AS
SELECT 
    c.name,
    c.slug,
    COUNT(a.id) as article_count,
    MAX(a.published_at) as latest_article
FROM categories c
LEFT JOIN articles a ON a.category = c.slug
GROUP BY c.id, c.name, c.slug
ORDER BY article_count DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update article count for categories
CREATE OR REPLACE FUNCTION update_category_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE categories
    SET article_count = (
        SELECT COUNT(*) FROM articles WHERE category = NEW.category
    )
    WHERE slug = NEW.category;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update category counts
CREATE TRIGGER trigger_update_category_count
AFTER INSERT OR UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_category_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for articles
CREATE TRIGGER trigger_articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trigger for subscribers
CREATE TRIGGER trigger_subscribers_updated_at
BEFORE UPDATE ON subscribers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SAMPLE DATA (FOR TESTING)
-- ============================================================================

-- Insert sample article
INSERT INTO articles (
    title, url, source, published_at, country, category, 
    image_url, excerpt, language
) VALUES (
    'North Africa Times Launches Comprehensive Regional Coverage',
    'https://northafricatimes.com/launch',
    'North Africa Times',
    NOW(),
    'algeria',
    'regional',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800',
    'The most comprehensive news and intelligence platform covering 6 North African countries launches today.',
    'en'
) ON CONFLICT (url) DO NOTHING;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'analytics_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Grant permissions to web application user
-- CREATE USER webapp_user WITH PASSWORD 'webapp_password';
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO webapp_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO webapp_user;

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Schedule cleanup of old articles (run via cron)
-- DELETE FROM articles WHERE published_at < NOW() - INTERVAL '90 days';

-- Vacuum and analyze
VACUUM ANALYZE;

-- Show table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

\echo ''
\echo '✅ Database schema created successfully!'
\echo ''
\echo 'Tables created:'
\echo '  - articles'
\echo '  - categories'
\echo '  - tags'
\echo '  - article_tags'
\echo '  - subscribers'
\echo '  - social_posts'
\echo '  - video_queue'
\echo '  - analytics'
\echo ''
\echo 'Ready to start North Africa Times!'
\echo ''
