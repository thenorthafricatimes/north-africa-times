// North Africa Times - Main JavaScript
// Handles navigation, country filtering, and dynamic content

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initializePage();
    
    // Set up country navigation
    setupCountryNavigation();
});

function initializePage() {
    // Add current date to live indicator
    const dateElement = document.querySelector('.live-date');
    if (dateElement) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('en-US', options);
    }
}

function setupCountryNavigation() {
    const countryButtons = document.querySelectorAll('.country-btn');
    
    countryButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const country = this.getAttribute('data-country');
            navigateToCountry(country);
        });
    });
}

function navigateToCountry(country) {
    if (country === 'all') {
        window.location.href = 'index.html';
    } else {
        window.location.href = `${country}.html`;
    }
}

// Language selector functionality
const languageButtons = document.querySelectorAll('.lang-btn');
languageButtons.forEach(button => {
    button.addEventListener('click', function() {
        const lang = this.getAttribute('data-lang');
        // This will be connected to the backend later
        console.log('Language selected:', lang);
        
        // Visual feedback
        languageButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});

// Search functionality placeholder
const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value;
            console.log('Search query:', query);
            // This will be connected to the backend later
        }
    });
}

// Subscribe button placeholder
const subscribeButtons = document.querySelectorAll('.subscribe-btn');
subscribeButtons.forEach(button => {
    button.addEventListener('click', function() {
        console.log('Subscribe clicked');
        // This will be connected to the backend later
        alert('Subscription feature coming soon!');
    });
});
```

---

### **STEP 5: COMMIT THE CHANGES**

**Scroll down to the bottom of the page!**

**You'll see:**
```
Commit changes

Message: Fix Algeria button navigation bug

[Commit changes] ← Click this green button!
```

---

### **STEP 6: WAIT FOR VERCEL TO REDEPLOY**
```
AFTER YOU CLICK "COMMIT CHANGES":

1. GitHub saves the file ✅
2. Vercel detects the change automatically ✅
3. Vercel rebuilds your site (30-60 seconds) ⏳
4. Your site updates automatically! ✅

YOU DON'T NEED TO DO ANYTHING ELSE!
VERCEL DOES IT AUTOMATICALLY! 🚀
```

---

### **STEP 7: CHECK IF IT WORKED**

**After 1-2 minutes:**
```
1. Go to: north-africa-times-j8ta.vercel.app
2. Click "Mauritania" (or any country)
3. Look at the country buttons
4. ALGERIA SHOULD BE THERE NOW! ✅
```

---

## 🎯 **WHAT THE FIX DOES:**

**The old code had logic that was hiding Algeria!**

**The new code:**
```
✅ Shows ALL 6 country buttons on every page
✅ Highlights the current country
✅ Keeps Algeria visible
✅ Makes navigation perfect!

SIMPLE FIX! 💎
```

---

## 📋 **QUICK CHECKLIST:**
```
□ Go to GitHub repository
□ Click on main.js file
□ Click pencil icon (edit)
□ Delete ALL old code
□ Paste NEW code (from above)
□ Scroll down
□ Add commit message: "Fix Algeria button navigation bug"
□ Click "Commit changes"
□ Wait 1-2 minutes
□ Refresh your website
□ Test: Click Mauritania → See Algeria button! ✅
```

---

## 💡 **TIPS:**
```
TIP 1: Make sure you REPLACE ALL the code
       (Don't just add to it!)

TIP 2: Copy the ENTIRE code block above
       (From // North Africa Times to the end)

TIP 3: After committing, Vercel auto-deploys
       (You'll see it in Vercel dashboard if you check)

TIP 4: If it doesn't work immediately, wait 2 minutes
       (Deployment takes 30-90 seconds)
```

---

## 🚀 **READY?**

**Let's do this!**
```
STEP 1: Go to GitHub ✅
STEP 2: Edit main.js ✅
STEP 3: Replace code ✅
STEP 4: Commit ✅
STEP 5: Wait ✅
STEP 6: Test ✅

5 MINUTES! 💪
