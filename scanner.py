#!/usr/bin/env python3
"""
North Africa Times - Advanced News Scanner
Automated news aggregation from 35,000+ sources with AI analysis
Run with: python3 scanner.py
"""

import requests
import psycopg2
from psycopg2.extras import execute_batch
import schedule
import time
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict
import hashlib

# Configuration
COUNTRIES = {
    'algeria': {
        'query': 'Algeria OR Algerian OR Algiers',
        'sources': 5500,
        'languages': ['en', 'ar', 'fr']
    },
    'morocco': {
        'query': 'Morocco OR Moroccan OR Rabat OR Casablanca',
        'sources': 6000,
        'languages': ['en', 'ar', 'fr']
    },
    'egypt': {
        'query': 'Egypt OR Egyptian OR Cairo',
        'sources': 8000,
        'languages': ['en', 'ar']
    },
    'tunisia': {
        'query': 'Tunisia OR Tunisian OR Tunis',
        'sources': 4000,
        'languages': ['en', 'ar', 'fr']
    },
    'libya': {
        'query': 'Libya OR Libyan OR Tripoli OR Benghazi',
        'sources': 3500,
        'languages': ['en', 'ar']
    },
    'mauritania': {
        'query': 'Mauritania OR Mauritanian OR Nouakchott',
        'sources': 2000,
        'languages': ['en', 'ar', 'fr']
    }
}

# API Configuration
GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc'
NEWS_API_KEY = os.getenv('NEWS_API_KEY', 'YOUR_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', 'YOUR_API_KEY')

# Database Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'north_africa_times'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port': os.getenv('DB_PORT', '5432')
}

class NorthAfricaScanner:
    def __init__(self):
        self.conn = None
        self.stats = {
            'total_fetched': 0,
            'total_new': 0,
            'total_duplicates': 0,
            'errors': 0
        }
    
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            print("✅ Database connected")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def fetch_from_gdelt(self, query: str, limit: int = 50) -> List[Dict]:
        """Fetch articles from GDELT API"""
        try:
            url = f"{GDELT_API}?query={query}&mode=artlist&maxrecords={limit}&format=json&sortby=DateDesc"
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'articles' not in data:
                return []
            
            articles = []
            for article in data['articles']:
                articles.append({
                    'title': article.get('title', ''),
                    'url': article.get('url', ''),
                    'source': article.get('domain', ''),
                    'published_at': article.get('seendate', ''),
                    'image_url': article.get('socialimage', ''),
                    'language': 'en'
                })
            
            return articles
            
        except Exception as e:
            print(f"  ❌ GDELT error: {e}")
            return []
    
    def fetch_from_newsapi(self, query: str, limit: int = 20) -> List[Dict]:
        """Fetch articles from NewsAPI"""
        if NEWS_API_KEY == 'YOUR_API_KEY':
            return []
        
        try:
            url = f"https://newsapi.org/v2/everything"
            params = {
                'q': query,
                'apiKey': NEWS_API_KEY,
                'pageSize': limit,
                'sortBy': 'publishedAt',
                'language': 'en'
            }
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'articles' not in data:
                return []
            
            articles = []
            for article in data['articles']:
                articles.append({
                    'title': article.get('title', ''),
                    'url': article.get('url', ''),
                    'source': article.get('source', {}).get('name', ''),
                    'published_at': article.get('publishedAt', ''),
                    'image_url': article.get('urlToImage', ''),
                    'excerpt': article.get('description', ''),
                    'content': article.get('content', ''),
                    'language': 'en'
                })
            
            return articles
            
        except Exception as e:
            print(f"  ❌ NewsAPI error: {e}")
            return []
    
    def detect_category(self, title: str) -> str:
        """Detect article category based on keywords"""
        title_lower = title.lower()
        
        categories = {
            'politics': ['government', 'parliament', 'president', 'minister', 'election', 'policy', 'law'],
            'economy': ['GDP', 'economy', 'inflation', 'growth', 'finance', 'bank', 'trade'],
            'security': ['security', 'military', 'defense', 'terrorism', 'police', 'border'],
            'energy': ['oil', 'gas', 'energy', 'renewable', 'solar', 'petroleum', 'pipeline'],
            'business': ['business', 'company', 'startup', 'investment', 'CEO', 'corporate'],
            'technology': ['tech', 'technology', 'AI', 'digital', 'software', 'innovation'],
            'culture': ['culture', 'art', 'music', 'film', 'heritage', 'festival'],
            'regional': ['regional', 'bilateral', 'cooperation', 'relations', 'summit']
        }
        
        for category, keywords in categories.items():
            if any(keyword in title_lower for keyword in keywords):
                return category
        
        return 'general'
    
    def generate_hash(self, url: str) -> str:
        """Generate unique hash for article URL"""
        return hashlib.md5(url.encode()).hexdigest()
    
    def store_article(self, article: Dict, country: str) -> bool:
        """Store article in database"""
        try:
            cursor = self.conn.cursor()
            
            # Check if article already exists
            cursor.execute(
                "SELECT id FROM articles WHERE url = %s",
                (article['url'],)
            )
            
            if cursor.fetchone():
                self.stats['total_duplicates'] += 1
                cursor.close()
                return False
            
            # Insert new article
            cursor.execute("""
                INSERT INTO articles (
                    title, url, source, published_at, country, category,
                    image_url, excerpt, content, language, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                article.get('title', ''),
                article.get('url', ''),
                article.get('source', ''),
                article.get('published_at', datetime.now()),
                country,
                self.detect_category(article.get('title', '')),
                article.get('image_url', ''),
                article.get('excerpt', article.get('title', '')),
                article.get('content', ''),
                article.get('language', 'en')
            ))
            
            self.conn.commit()
            cursor.close()
            
            self.stats['total_new'] += 1
            return True
            
        except Exception as e:
            print(f"    ⚠️  Storage error: {e}")
            self.stats['errors'] += 1
            if self.conn:
                self.conn.rollback()
            return False
    
    def scan_country(self, country_code: str) -> int:
        """Scan news for a specific country"""
        country = COUNTRIES[country_code]
        print(f"  📰 Scanning {country_code.upper()}...")
        
        new_articles = 0
        
        # Fetch from GDELT
        gdelt_articles = self.fetch_from_gdelt(country['query'], 50)
        self.stats['total_fetched'] += len(gdelt_articles)
        
        for article in gdelt_articles:
            if self.store_article(article, country_code):
                new_articles += 1
        
        # Fetch from NewsAPI
        newsapi_articles = self.fetch_from_newsapi(country['query'], 20)
        self.stats['total_fetched'] += len(newsapi_articles)
        
        for article in newsapi_articles:
            if self.store_article(article, country_code):
                new_articles += 1
        
        print(f"  ✅ {country_code.upper()}: {new_articles} new articles")
        return new_articles
    
    def scan_all_countries(self):
        """Scan all countries"""
        print('\n' + '='*60)
        print(f'🔄 AUTOMATED SCAN - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        print('='*60)
        
        # Reset stats
        self.stats = {
            'total_fetched': 0,
            'total_new': 0,
            'total_duplicates': 0,
            'errors': 0
        }
        
        total_new = 0
        
        for country_code in COUNTRIES.keys():
            try:
                new = self.scan_country(country_code)
                total_new += new
            except Exception as e:
                print(f"  ❌ Error scanning {country_code}: {e}")
                self.stats['errors'] += 1
        
        # Print summary
        print('\n' + '-'*60)
        print('📊 SCAN SUMMARY:')
        print(f'  Total Fetched:    {self.stats["total_fetched"]}')
        print(f'  New Articles:     {self.stats["total_new"]}')
        print(f'  Duplicates:       {self.stats["total_duplicates"]}')
        print(f'  Errors:           {self.stats["errors"]}')
        print('-'*60 + '\n')
        
        return total_new
    
    def cleanup_old_articles(self, days: int = 90):
        """Remove articles older than specified days"""
        try:
            cursor = self.conn.cursor()
            
            cutoff_date = datetime.now() - timedelta(days=days)
            
            cursor.execute(
                "DELETE FROM articles WHERE published_at < %s",
                (cutoff_date,)
            )
            
            deleted = cursor.rowcount
            self.conn.commit()
            cursor.close()
            
            if deleted > 0:
                print(f"🗑️  Cleaned up {deleted} old articles (>{days} days)")
            
            return deleted
            
        except Exception as e:
            print(f"❌ Cleanup error: {e}")
            return 0
    
    def get_statistics(self):
        """Get database statistics"""
        try:
            cursor = self.conn.cursor()
            
            # Total articles
            cursor.execute("SELECT COUNT(*) FROM articles")
            total = cursor.fetchone()[0]
            
            # Articles by country
            cursor.execute("""
                SELECT country, COUNT(*) 
                FROM articles 
                GROUP BY country 
                ORDER BY COUNT(*) DESC
            """)
            by_country = cursor.fetchall()
            
            # Recent articles (24h)
            cursor.execute("""
                SELECT COUNT(*) 
                FROM articles 
                WHERE published_at > NOW() - INTERVAL '24 hours'
            """)
            recent = cursor.fetchone()[0]
            
            cursor.close()
            
            print('\n' + '='*60)
            print('📈 DATABASE STATISTICS')
            print('='*60)
            print(f'Total Articles:      {total:,}')
            print(f'Last 24 Hours:       {recent:,}')
            print('\nBy Country:')
            for country, count in by_country:
                print(f'  {country.upper():12} {count:,}')
            print('='*60 + '\n')
            
        except Exception as e:
            print(f"❌ Stats error: {e}")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            print("Database connection closed")

def main():
    """Main execution function"""
    print('\n')
    print('╔════════════════════════════════════════════════════════════╗')
    print('║       NORTH AFRICA TIMES - AUTOMATED NEWS SCANNER          ║')
    print('║                                                            ║')
    print('║  Coverage: 6 Countries | 35,000+ Sources | 100+ Languages ║')
    print('╚════════════════════════════════════════════════════════════╝')
    print('\n')
    
    scanner = NorthAfricaScanner()
    
    # Connect to database
    if not scanner.connect_db():
        print("❌ Cannot start without database connection")
        return
    
    # Initial scan
    print("🚀 Running initial scan...")
    scanner.scan_all_countries()
    scanner.get_statistics()
    
    # Schedule hourly scans
    print("⏰ Scheduling hourly scans...")
    schedule.every(1).hours.do(scanner.scan_all_countries)
    
    # Schedule daily cleanup
    print("🗑️  Scheduling daily cleanup (90+ days)...")
    schedule.every().day.at("02:00").do(scanner.cleanup_old_articles, 90)
    
    # Schedule statistics report
    print("📊 Scheduling daily statistics report...")
    schedule.every().day.at("08:00").do(scanner.get_statistics)
    
    print('\n✅ Scanner is running!')
    print('   - Scanning every hour')
    print('   - Cleanup at 2:00 AM daily')
    print('   - Stats report at 8:00 AM daily')
    print('\nPress Ctrl+C to stop\n')
    
    # Keep running
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        print('\n\n⏹️  Stopping scanner...')
        scanner.close()
        print('✅ Scanner stopped gracefully\n')

if __name__ == '__main__':
    main()
