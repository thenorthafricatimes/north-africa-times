// North Africa Times - Main Application Logic
// Handles all frontend functionality for 6-country platform

console.log('🌍 North Africa Times Loading...');

// Global state
let currentCountryFilter = 'all';
let currentPage = 1;
let allArticles = [];
let isLoading = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ DOM Ready');
    
    // Initial setup
    updateCurrentDate();
    setupEventListeners();
    
    // Load all data
    await Promise.all([
        loadAllCountryStats(),
        loadBreakingNews(),
        loadHeroSection(),
        loadLatestNews(),
        loadTrendingTopics()
    ]);
    
    // Set up auto-refresh for breaking news
    setInterval(loadBreakingNews, CONFIG.UPDATE_FREQUENCY.breaking * 60 * 1000);
    
    console.log('🚀 North Africa Times Ready!');
});

// ============================================================================
// DATE & TIME FUNCTIONS
// ============================================================================

function updateCurrentDate() {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });
    
    // Country stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', handleStatCardClick);
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

function handleFilterClick(e) {
    // Remove active from all buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active to clicked button
    e.target.classList.add('active');
    
    // Filter articles
    currentCountryFilter = e.target.dataset.country;
    currentPage = 1;
    filterAndDisplayArticles();
}

function handleStatCardClick(e) {
    const card = e.currentTarget;
    const country = card.dataset.country;
    
    // Update filter
    currentCountryFilter = country;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.country === country) {
            btn.classList.add('active');
        }
    });
    
    // Scroll to articles and filter
    document.getElementById('newsGrid').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => filterAndDisplayArticles(), 500);
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    if (!query) {
        filterAndDisplayArticles();
        return;
    }
    
    const filtered = allArticles.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.source.toLowerCase().includes(query)
    );
    
    displayArticles(filtered.slice(0, 12));
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================================
// COUNTRY STATISTICS
// ============================================================================

async function loadAllCountryStats() {
    const countries = Object.keys(CONFIG.COUNTRIES);
    
    for (const countryCode of countries) {
        const count = await getArticleCountForCountry(countryCode);
        animateCount(`${countryCode}-count`, count);
    }
}

async function getArticleCountForCountry(countryCode) {
    // This would normally fetch from your backend
    // For demo, generate realistic random numbers
    const baseCount = {
        algeria: 45,
        morocco: 52,
        egypt: 78,
        tunisia: 34,
        libya: 28,
        mauritania: 18
    };
    
    const variance = Math.floor(Math.random() * 20) - 10;
    return baseCount[countryCode] + variance;
}

function animateCount(elementId, targetCount) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let currentCount = 0;
    const increment = Math.ceil(targetCount / 30);
    const duration = 1000;
    const stepTime = duration / 30;
    
    const timer = setInterval(() => {
        currentCount += increment;
        if (currentCount >= targetCount) {
            element.textContent = targetCount;
            clearInterval(timer);
        } else {
            element.textContent = currentCount;
        }
    }, stepTime);
}

// ============================================================================
// BREAKING NEWS
// ============================================================================

async function loadBreakingNews() {
    const breakingElement = document.getElementById('breakingNews');
    if (!breakingElement) return;
    
    try {
        // Fetch latest breaking news from all countries
        const breakingNews = await fetchBreakingNews();
        
        if (breakingNews.length > 0) {
            const newsText = breakingNews.map(news => 
                `${CONFIG.COUNTRIES[news.country].flag} ${news.title}`
            ).join(' • ');
            
            breakingElement.innerHTML = newsText + ' • ';
            
            // Animate scrolling
            animateBreakingNews(breakingElement);
        }
    } catch (error) {
        console.error('Error loading breaking news:', error);
    }
}

function animateBreakingNews(element) {
    // Clone the text for seamless loop
    const text = element.textContent;
    element.innerHTML = text + text;
    
    let position = 0;
    const speed = 50; // pixels per second
    
    function scroll() {
        position -= 1;
        if (Math.abs(position) >= element.scrollWidth / 2) {
            position = 0;
        }
        element.style.transform = `translateX(${position}px)`;
        requestAnimationFrame(scroll);
    }
    
    scroll();
}

async function fetchBreakingNews() {
    // This would fetch from your backend API
    // For demo, return sample breaking news
    const allCountries = Object.keys(CONFIG.COUNTRIES);
    const breaking = [];
    
    for (let i = 0; i < 5; i++) {
        const country = allCountries[Math.floor(Math.random() * allCountries.length)];
        breaking.push({
            country: country,
            title: `Latest development in ${CONFIG.COUNTRIES[country].name}`,
            time: new Date()
        });
    }
    
    return breaking;
}

// ============================================================================
// HERO SECTION
// ============================================================================

async function loadHeroSection() {
    const heroSection = document.getElementById('heroSection');
    if (!heroSection) return;
    
    try {
        console.log('📰 Loading hero section...');
        
        // Fetch top stories
        const topStories = await fetchTopStories(4);
        
        if (topStories.length === 0) {
            heroSection.innerHTML = '<p class="loading-indicator">No articles available</p>';
            return;
        }
        
        const mainArticle = topStories[0];
        const sideArticles = topStories.slice(1, 4);
        
        heroSection.innerHTML = `
            <article class="hero-main" onclick="openArticle('${mainArticle.url}')">
                <img src="${mainArticle.image}" alt="${escapeHtml(mainArticle.title)}">
                <div class="hero-overlay">
                    <span class="hero-category country-${mainArticle.country}">
                        ${CONFIG.COUNTRIES[mainArticle.country].flag} 
                        ${CONFIG.COUNTRIES[mainArticle.country].name}
                    </span>
                    <h1 class="hero-title">${escapeHtml(mainArticle.title)}</h1>
                    <p class="hero-excerpt">${escapeHtml(mainArticle.excerpt)}</p>
                    <div class="article-meta">
                        <span>${escapeHtml(mainArticle.source)}</span>
                        <span>•</span>
                        <span>${formatDate(mainArticle.publishedAt)}</span>
                    </div>
                </div>
            </article>
            
            <div class="hero-side">
                ${sideArticles.map(article => `
                    <article class="side-article" onclick="openArticle('${article.url}')">
                        <img src="${article.image}" alt="${escapeHtml(article.title)}">
                        <span class="side-article-category country-${article.country}">
                            ${CONFIG.COUNTRIES[article.country].flag}
                            ${CONFIG.COUNTRIES[article.country].name}
                        </span>
                        <h3 class="side-article-title">${escapeHtml(article.title)}</h3>
                        <p class="side-article-meta">${formatDate(article.publishedAt)}</p>
                    </article>
                `).join('')}
            </div>
        `;
        
        console.log('✅ Hero section loaded');
    } catch (error) {
        console.error('Error loading hero section:', error);
        heroSection.innerHTML = '<p class="loading-indicator">Error loading top stories</p>';
    }
}

async function fetchTopStories(limit = 4) {
    // Fetch top stories from all countries
    const query = Object.values(CONFIG.COUNTRIES)
        .map(c => c.name)
        .join(' OR ');
    
    return await fetchArticlesFromAPI(query, limit);
}

// ============================================================================
// LATEST NEWS GRID
// ============================================================================

async function loadLatestNews() {
    const newsGrid = document.getElementById('newsGrid');
    if (!newsGrid) return;
    
    if (isLoading) return;
    isLoading = true;
    
    try {
        console.log('📰 Loading latest news...');
        
        newsGrid.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner"></div>
                <p>Loading news from 35,000+ sources worldwide...</p>
            </div>
        `;
        
        // Fetch articles from all countries
        allArticles = await fetchAllCountryArticles(100);
        
        console.log(`✅ Loaded ${allArticles.length} articles`);
        
        // Display first page
        displayArticles(allArticles.slice(0, 12));
        
        isLoading = false;
    } catch (error) {
        console.error('Error loading news:', error);
        newsGrid.innerHTML = '<p class="loading-indicator">Error loading articles. Please try again.</p>';
        isLoading = false;
    }
}

async function fetchAllCountryArticles(limit = 100) {
    const articles = [];
    const countries = Object.keys(CONFIG.COUNTRIES);
    const perCountry = Math.ceil(limit / countries.length);
    
    // Fetch articles for each country in parallel
    const promises = countries.map(countryCode => 
        fetchCountryArticles(countryCode, perCountry)
    );
    
    const results = await Promise.all(promises);
    
    // Combine and shuffle
    results.forEach(countryArticles => {
        articles.push(...countryArticles);
    });
    
    // Sort by date
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    return articles.slice(0, limit);
}

async function fetchCountryArticles(countryCode, limit = 20) {
    const country = CONFIG.COUNTRIES[countryCode];
    const query = country.searches.english;
    
    const articles = await fetchArticlesFromAPI(query, limit);
    
    // Tag each article with the country
    return articles.map(article => ({
        ...article,
        country: countryCode
    }));
}

async function fetchArticlesFromAPI(query, limit = 20) {
    // This uses GDELT API - replace with your backend when ready
    const url = `${CONFIG.APIS.GDELT}?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${limit}&format=json&sortby=DateDesc`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.articles || data.articles.length === 0) {
            return [];
        }
        
        return data.articles.map(article => ({
            id: generateId(article.url),
            title: article.title,
            url: article.url,
            source: article.domain,
            publishedAt: article.seendate,
            image: article.socialimage || getPlaceholderImage(),
            excerpt: truncateText(article.title, 150),
            category: detectCategory(article.title),
            language: 'en'
        }));
    } catch (error) {
        console.error('Error fetching from API:', error);
        return [];
    }
}

function displayArticles(articles) {
    const newsGrid = document.getElementById('newsGrid');
    if (!newsGrid) return;
    
    if (articles.length === 0) {
        newsGrid.innerHTML = '<p class="loading-indicator">No articles found</p>';
        return;
    }
    
    newsGrid.innerHTML = articles.map(article => `
        <article class="article-card" onclick="openArticle('${article.url}')">
            <img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy">
            <div class="article-card-content">
                <span class="article-card-category country-${article.country}">
                    ${CONFIG.COUNTRIES[article.country].flag}
                    ${CONFIG.COUNTRIES[article.country].name}
                </span>
                <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
                <p class="article-card-excerpt">${escapeHtml(article.excerpt)}</p>
                <div class="article-card-meta">
                    <span>${formatDate(article.publishedAt)}</span>
                    <span>•</span>
                    <span>${escapeHtml(article.source)}</span>
                </div>
            </div>
        </article>
    `).join('');
}

function filterAndDisplayArticles() {
    let filtered = allArticles;
    
    if (currentCountryFilter !== 'all') {
        filtered = allArticles.filter(a => a.country === currentCountryFilter);
    }
    
    displayArticles(filtered.slice(0, 12));
    currentPage = 1;
}

// Load more articles
window.loadMoreArticles = function() {
    const start = currentPage * 12;
    const end = start + 12;
    
    let articlesToShow = allArticles;
    if (currentCountryFilter !== 'all') {
        articlesToShow = allArticles.filter(a => a.country === currentCountryFilter);
    }
    
    const moreArticles = articlesToShow.slice(start, end);
    
    if (moreArticles.length > 0) {
        const newsGrid = document.getElementById('newsGrid');
        const currentHTML = newsGrid.innerHTML;
        
        const newHTML = moreArticles.map(article => `
            <article class="article-card" onclick="openArticle('${article.url}')">
                <img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy">
                <div class="article-card-content">
                    <span class="article-card-category country-${article.country}">
                        ${CONFIG.COUNTRIES[article.country].flag}
                        ${CONFIG.COUNTRIES[article.country].name}
                    </span>
                    <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
                    <p class="article-card-excerpt">${escapeHtml(article.excerpt)}</p>
                    <div class="article-card-meta">
                        <span>${formatDate(article.publishedAt)}</span>
                        <span>•</span>
                        <span>${escapeHtml(article.source)}</span>
                    </div>
                </div>
            </article>
        `).join('');
        
        newsGrid.innerHTML = currentHTML + newHTML;
        currentPage++;
    }
    
    if (end >= articlesToShow.length) {
        document.getElementById('loadMoreContainer').innerHTML = 
            '<p style="color: var(--text-light); text-align: center;">No more articles to load</p>';
    }
};

// ============================================================================
// TRENDING TOPICS
// ============================================================================

async function loadTrendingTopics() {
    const trendingDiv = document.getElementById('trendingTopics');
    if (!trendingDiv) return;
    
    try {
        // Fetch trending topics
        const trending = await fetchTrendingTopics(5);
        
        trendingDiv.innerHTML = trending.map((topic, index) => `
            <div class="trending-item" onclick="searchTopic('${escapeHtml(topic.title)}')">
                <span class="trending-number">${index + 1}</span>
                <div class="trending-content">
                    <h4>${escapeHtml(topic.title)}</h4>
                    <span class="trending-time">${formatDate(topic.time)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading trending:', error);
    }
}

async function fetchTrendingTopics(limit = 5) {
    // This would normally analyze article frequency
    // For demo, return sample trending topics
    const topics = [
        { title: 'Energy cooperation in North Africa', time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { title: 'Regional security summit announced', time: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        { title: 'Economic reforms gain momentum', time: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        { title: 'Tech startups attract investment', time: new Date(Date.now() - 8 * 60 * 60 * 1000) },
        { title: 'Cultural exchange programs expand', time: new Date(Date.now() - 10 * 60 * 60 * 1000) }
    ];
    
    return topics.slice(0, limit);
}

function searchTopic(topic) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = topic;
        handleSearch({ target: searchInput });
    }
}

// ============================================================================
// NEWSLETTER SUBSCRIPTION
// ============================================================================

window.subscribeNewsletter = async function() {
    const emailInput = document.getElementById('newsletterEmail');
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        // This would send to your backend
        // await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) });
        
        showNotification('✅ Thank you for subscribing to North Africa Times Daily Briefing!');
        emailInput.value = '';
    } catch (error) {
        showNotification('❌ Subscription failed. Please try again.', 'error');
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function openArticle(url) {
    window.open(url, '_blank');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function generateId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

function getPlaceholderImage() {
    const images = [
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop'
    ];
    return images[Math.floor(Math.random() * images.length)];
}

function detectCategory(title) {
    const titleLower = title.toLowerCase();
    
    for (const [categoryKey, category] of Object.entries(CONFIG.CATEGORIES)) {
        const hasKeyword = category.keywords.some(keyword => 
            titleLower.includes(keyword.toLowerCase())
        );
        if (hasKeyword) {
            return categoryKey;
        }
    }
    
    return 'general';
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#006233' : '#D52B1E'};
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        font-family: 'IBM Plex Sans', sans-serif;
        font-weight: 600;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('✅ Main.js loaded successfully');
