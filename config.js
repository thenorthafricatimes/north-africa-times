// North Africa Times - Configuration
// 6 Countries: Algeria, Morocco, Egypt, Tunisia, Libya, Mauritania

const CONFIG = {
    // API Endpoints
    APIS: {
        GDELT: 'https://api.gdeltproject.org/api/v2/doc/doc',
        NEWS_API: 'https://newsapi.org/v2/everything',
        NEWS_API_KEY: 'YOUR_API_KEY', // Replace with your key
        BACKEND: 'http://localhost:3000/api', // Your backend when ready
        ANTHROPIC: 'https://api.anthropic.com/v1/messages'
    },

    // Country Configurations
    COUNTRIES: {
        algeria: {
            name: 'Algeria',
            code: 'DZ',
            flag: '🇩🇿',
            color: '#006233',
            population: 45000000,
            languages: ['Arabic', 'French', 'Berber'],
            searches: {
                english: 'Algeria OR Algerian OR Algiers',
                arabic: 'الجزائر OR جزائري OR جزائرية',
                french: 'Algérie OR algérien OR algérienne'
            },
            sources: {
                national: ['Algerie Presse Service', 'El Watan', 'Echourouk', 'El Khabar'],
                international: 5500
            }
        },
        morocco: {
            name: 'Morocco',
            code: 'MA',
            flag: '🇲🇦',
            color: '#C1272D',
            population: 37000000,
            languages: ['Arabic', 'French', 'Berber'],
            searches: {
                english: 'Morocco OR Moroccan OR Rabat OR Casablanca',
                arabic: 'المغرب OR مغربي OR مغربية',
                french: 'Maroc OR marocain OR marocaine'
            },
            sources: {
                national: ['MAP (Maghreb Arabe Presse)', 'Le Matin', 'TelQuel', 'Hespress'],
                international: 6000
            }
        },
        egypt: {
            name: 'Egypt',
            code: 'EG',
            flag: '🇪🇬',
            color: '#CE1126',
            population: 105000000,
            languages: ['Arabic', 'English'],
            searches: {
                english: 'Egypt OR Egyptian OR Cairo',
                arabic: 'مصر OR مصري OR مصرية OR القاهرة',
                french: 'Égypte OR égyptien OR égyptienne'
            },
            sources: {
                national: ['MENA', 'Al-Ahram', 'Egypt Independent', 'Daily News Egypt'],
                international: 8000
            }
        },
        tunisia: {
            name: 'Tunisia',
            code: 'TN',
            flag: '🇹🇳',
            color: '#E70013',
            population: 12000000,
            languages: ['Arabic', 'French'],
            searches: {
                english: 'Tunisia OR Tunisian OR Tunis',
                arabic: 'تونس OR تونسي OR تونسية',
                french: 'Tunisie OR tunisien OR tunisienne'
            },
            sources: {
                national: ['TAP (Tunis Afrique Presse)', 'La Presse', 'Le Temps'],
                international: 4000
            }
        },
        libya: {
            name: 'Libya',
            code: 'LY',
            flag: '🇱🇾',
            color: '#239E46',
            population: 7000000,
            languages: ['Arabic', 'English', 'Italian'],
            searches: {
                english: 'Libya OR Libyan OR Tripoli OR Benghazi',
                arabic: 'ليبيا OR ليبي OR ليبية OR طرابلس',
                french: 'Libye OR libyen OR libyenne'
            },
            sources: {
                national: ['LANA', 'Libya Observer', 'Libya Herald'],
                international: 3500
            }
        },
        mauritania: {
            name: 'Mauritania',
            code: 'MR',
            flag: '🇲🇷',
            color: '#006233',
            population: 5000000,
            languages: ['Arabic', 'French'],
            searches: {
                english: 'Mauritania OR Mauritanian OR Nouakchott',
                arabic: 'موريتانيا OR موريتاني OR موريتانية',
                french: 'Mauritanie OR mauritanien OR mauritanienne'
            },
            sources: {
                national: ['AMI (Agence Mauritanienne d\'Information)'],
                international: 2000
            }
        }
    },

    // Category Configurations
    CATEGORIES: {
        politics: {
            name: 'Politics',
            keywords: ['government', 'parliament', 'president', 'minister', 'election', 'policy', 'law'],
            color: '#D52B1E'
        },
        economy: {
            name: 'Economy',
            keywords: ['GDP', 'economy', 'inflation', 'growth', 'finance', 'bank', 'trade'],
            color: '#006233'
        },
        security: {
            name: 'Security',
            keywords: ['security', 'military', 'defense', 'terrorism', 'police', 'border'],
            color: '#8B0000'
        },
        energy: {
            name: 'Energy',
            keywords: ['oil', 'gas', 'energy', 'renewable', 'solar', 'petroleum', 'pipeline'],
            color: '#FF8C00'
        },
        business: {
            name: 'Business',
            keywords: ['business', 'company', 'startup', 'investment', 'CEO', 'corporate'],
            color: '#C9A961'
        },
        technology: {
            name: 'Technology',
            keywords: ['tech', 'technology', 'AI', 'digital', 'software', 'innovation', 'internet'],
            color: '#0066cc'
        },
        culture: {
            name: 'Culture',
            keywords: ['culture', 'art', 'music', 'film', 'heritage', 'festival', 'artist'],
            color: '#9b59b6'
        },
        regional: {
            name: 'Regional Relations',
            keywords: ['regional', 'bilateral', 'cooperation', 'relations', 'summit', 'agreement'],
            color: '#16a085'
        }
    },

    // Regional Groupings
    REGIONS: {
        maghreb: ['algeria', 'morocco', 'tunisia', 'libya', 'mauritania'],
        northAfrica: ['algeria', 'morocco', 'egypt', 'tunisia', 'libya', 'mauritania'],
        mediterranean: ['algeria', 'morocco', 'egypt', 'tunisia', 'libya']
    },

    // Update Frequencies (in minutes)
    UPDATE_FREQUENCY: {
        breaking: 5,      // Breaking news
        hourly: 60,       // Regular updates
        daily: 1440       // Daily summaries
    },

    // Language Codes
    LANGUAGES: {
        en: 'English',
        ar: 'Arabic',
        fr: 'French',
        es: 'Spanish',
        ru: 'Russian',
        zh: 'Chinese',
        de: 'German',
        it: 'Italian'
    },

    // Social Media Platforms
    SOCIAL_PLATFORMS: {
        youtube: {
            videosPerDay: 12, // 6 countries × 2 languages
            maxDuration: 600  // 10 minutes
        },
        tiktok: {
            postsPerDay: 15,
            maxDuration: 60
        },
        instagram: {
            postsPerDay: 12,
            reelsPerDay: 6
        },
        twitter: {
            tweetsPerDay: 30
        }
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
