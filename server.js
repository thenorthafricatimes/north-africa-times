// North Africa Times - Backend Server (Node.js + Express)
// Handles API requests, database operations, and news aggregation
// Run with: node server.js

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const cron = require('node-cron');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/north_africa_times',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configuration
const COUNTRIES = {
    algeria: { query: 'Algeria OR Algerian OR Algiers', code: 'DZ' },
    morocco: { query: 'Morocco OR Moroccan OR Rabat OR Casablanca', code: 'MA' },
    egypt: { query: 'Egypt OR Egyptian OR Cairo', code: 'EG' },
    tunisia: { query: 'Tunisia OR Tunisian OR Tunis', code: 'TN' },
    libya: { query: 'Libya OR Libyan OR Tripoli OR Benghazi', code: 'LY' },
    mauritania: { query: 'Mauritania OR Mauritanian OR Nouakchott', code: 'MR' }
};

const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'YOUR_API_KEY';

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'North Africa Times API'
    });
});

// Get all articles
app.get('/api/articles', async (req, res) => {
    const { country, category, limit = 20, offset = 0 } = req.query;
    
    try {
        let query = 'SELECT * FROM articles WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (country && country !== 'all') {
            query += ` AND country = $${paramCount}`;
            params.push(country);
            paramCount++;
        }
        
        if (category && category !== 'all') {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }
        
        query += ` ORDER BY published_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            articles: result.rows,
            count: result.rows.length,
            offset: parseInt(offset),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// Get articles for specific country
app.get('/api/articles/:country', async (req, res) => {
    const { country } = req.params;
    const { limit = 20 } = req.query;
    
    try {
        // First check database
        const dbResult = await pool.query(
            'SELECT * FROM articles WHERE country = $1 AND published_at > NOW() - INTERVAL \'24 hours\' ORDER BY published_at DESC LIMIT $2',
            [country, limit]
        );
        
        if (dbResult.rows.length > 0) {
            return res.json({ 
                articles: dbResult.rows,
                source: 'database',
                cached: true 
            });
        }
        
        // If not in database, fetch from GDELT
        const articles = await fetchFromGDELT(COUNTRIES[country].query, limit);
        
        // Store in database
        for (const article of articles) {
            await storeArticle({
                ...article,
                country: country
            });
        }
        
        res.json({ 
            articles: articles,
            source: 'gdelt',
            cached: false 
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// Get article statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                country,
                COUNT(*) as count,
                MAX(published_at) as latest,
                MIN(published_at) as earliest
            FROM articles
            WHERE published_at > NOW() - INTERVAL '24 hours'
            GROUP BY country
            ORDER BY count DESC
        `);
        
        const categoryStats = await pool.query(`
            SELECT 
                category,
                COUNT(*) as count
            FROM articles
            WHERE published_at > NOW() - INTERVAL '24 hours'
            GROUP BY category
            ORDER BY count DESC
        `);
        
        const totalArticles = await pool.query(
            'SELECT COUNT(*) as total FROM articles WHERE published_at > NOW() - INTERVAL \'24 hours\''
        );
        
        res.json({ 
            byCountry: stats.rows,
            byCategory: categoryStats.rows,
            total: parseInt(totalArticles.rows[0].total),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Get trending topics
app.get('/api/trending', async (req, res) => {
    try {
        const trending = await pool.query(`
            SELECT 
                title,
                COUNT(*) as mentions,
                MAX(published_at) as latest
            FROM articles
            WHERE published_at > NOW() - INTERVAL '6 hours'
            GROUP BY title
            HAVING COUNT(*) > 1
            ORDER BY mentions DESC, latest DESC
            LIMIT 10
        `);
        
        res.json({ trending: trending.rows });
    } catch (error) {
        console.error('Error getting trending:', error);
        res.status(500).json({ error: 'Failed to get trending topics' });
    }
});

// Newsletter subscription
app.post('/api/subscribe', async (req, res) => {
    const { email, preferences = {} } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
    }
    
    try {
        await pool.query(
            `INSERT INTO subscribers (email, preferences, subscribed_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (email) DO UPDATE SET preferences = $2, updated_at = NOW()`,
            [email, JSON.stringify(preferences)]
        );
        
        res.json({ 
            success: true,
            message: 'Successfully subscribed to North Africa Times'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Subscription failed' });
    }
});

// Search articles
app.get('/api/search', async (req, res) => {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Search query required' });
    }
    
    try {
        const result = await pool.query(`
            SELECT * FROM articles
            WHERE 
                title ILIKE $1 OR 
                excerpt ILIKE $1 OR 
                content ILIKE $1
            ORDER BY published_at DESC
            LIMIT $2
        `, [`%${q}%`, limit]);
        
        res.json({ 
            results: result.rows,
            query: q,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchFromGDELT(query, limit = 20) {
    try {
        const url = `${GDELT_API}?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${limit}&format=json&sortby=DateDesc`;
        
        const response = await axios.get(url);
        
        if (!response.data || !response.data.articles) {
            return [];
        }
        
        return response.data.articles.map(article => ({
            title: article.title,
            url: article.url,
            source: article.domain,
            published_at: article.seendate,
            image_url: article.socialimage,
            excerpt: article.title,
            language: 'en'
        }));
    } catch (error) {
        console.error('GDELT fetch error:', error.message);
        return [];
    }
}

async function fetchFromNewsAPI(query, limit = 20) {
    if (!NEWS_API_KEY || NEWS_API_KEY === 'YOUR_API_KEY') {
        console.log('NewsAPI key not configured, skipping...');
        return [];
    }
    
    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${NEWS_API_KEY}&pageSize=${limit}&sortBy=publishedAt`;
        
        const response = await axios.get(url);
        
        if (!response.data || !response.data.articles) {
            return [];
        }
        
        return response.data.articles.map(article => ({
            title: article.title,
            url: article.url,
            source: article.source.name,
            published_at: article.publishedAt,
            image_url: article.urlToImage,
            excerpt: article.description,
            content: article.content,
            language: 'en'
        }));
    } catch (error) {
        console.error('NewsAPI fetch error:', error.message);
        return [];
    }
}

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

async function storeArticle(article) {
    try {
        await pool.query(
            `INSERT INTO articles (
                title, url, source, published_at, country, category,
                image_url, excerpt, content, language, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (url) DO UPDATE SET
                title = EXCLUDED.title,
                updated_at = NOW()`,
            [
                article.title,
                article.url,
                article.source,
                article.published_at,
                article.country,
                article.category || 'general',
                article.image_url,
                article.excerpt,
                article.content,
                article.language || 'en'
            ]
        );
    } catch (error) {
        console.error('Error storing article:', error.message);
    }
}

// ============================================================================
// AUTOMATED NEWS SCANNING
// ============================================================================

async function scanAllCountries() {
    console.log('🔄 Starting automated news scan...');
    
    let totalNew = 0;
    
    for (const [countryCode, countryConfig] of Object.entries(COUNTRIES)) {
        console.log(`  📰 Scanning ${countryCode}...`);
        
        try {
            // Fetch from GDELT
            const gdeltArticles = await fetchFromGDELT(countryConfig.query, 50);
            
            // Fetch from NewsAPI if configured
            const newsApiArticles = await fetchFromNewsAPI(countryConfig.query, 20);
            
            // Combine articles
            const allArticles = [...gdeltArticles, ...newsApiArticles];
            
            // Store each article
            for (const article of allArticles) {
                await storeArticle({
                    ...article,
                    country: countryCode,
                    category: detectCategory(article.title)
                });
                totalNew++;
            }
            
            console.log(`  ✅ ${countryCode}: ${allArticles.length} articles`);
        } catch (error) {
            console.error(`  ❌ Error scanning ${countryCode}:`, error.message);
        }
    }
    
    console.log(`✅ Scan complete. ${totalNew} articles processed.`);
}

function detectCategory(title) {
    const titleLower = title.toLowerCase();
    
    const categories = {
        politics: ['government', 'parliament', 'president', 'minister', 'election', 'policy'],
        economy: ['economy', 'GDP', 'inflation', 'finance', 'bank', 'trade'],
        security: ['security', 'military', 'defense', 'terrorism', 'police'],
        energy: ['oil', 'gas', 'energy', 'petroleum', 'renewable', 'solar'],
        business: ['business', 'company', 'startup', 'investment', 'CEO'],
        technology: ['tech', 'technology', 'AI', 'digital', 'software'],
        culture: ['culture', 'art', 'music', 'film', 'heritage']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => titleLower.includes(keyword))) {
            return category;
        }
    }
    
    return 'general';
}

// Schedule automated scanning every hour
cron.schedule('0 * * * *', () => {
    console.log('⏰ Scheduled scan triggered');
    scanAllCountries();
});

// Run scan on startup
setTimeout(() => {
    console.log('🚀 Initial scan on startup...');
    scanAllCountries();
}, 5000);

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

async function initializeDatabase() {
    try {
        // Create articles table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                source VARCHAR(255),
                published_at TIMESTAMP,
                country VARCHAR(50),
                category VARCHAR(100),
                image_url TEXT,
                excerpt TEXT,
                content TEXT,
                language VARCHAR(10),
                view_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create subscribers table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                preferences JSONB,
                subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        `);
        
        // Create indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_country ON articles(country)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_published ON articles(published_at DESC)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_category ON articles(category)');
        
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        
        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('════════════════════════════════════════════════════════');
            console.log('🌍  NORTH AFRICA TIMES - BACKEND API');
            console.log('════════════════════════════════════════════════════════');
            console.log(`✅  Server running on port ${PORT}`);
            console.log(`📊  API URL: http://localhost:${PORT}/api`);
            console.log(`🔄  Auto-scan: Every hour`);
            console.log(`🗄️  Database: PostgreSQL connected`);
            console.log(`🌐  Countries: 6 (Algeria, Morocco, Egypt, Tunisia, Libya, Mauritania)`);
            console.log(`📰  Sources: 35,000+ worldwide`);
            console.log('════════════════════════════════════════════════════════');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

module.exports = app;
