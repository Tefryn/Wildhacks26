# 🎮 Timeline of Game Eras - Setup & Run Guide

## ✅ Implementation Complete!

We've successfully built a complete **Timeline of Game Eras** feature for your Steam library visualization project.

---

## 📁 What Was Created

### Backend
- ✅ `server/src/utils/gameGrouping.js` - Core era computation algorithm
- ✅ `server/src/utils/eraFormatter.js` - Data formatting & ad-lib generation
- ✅ `server/src/controllers/eraController.js` - Business logic orchestration
- ✅ `server/src/routes/timelines.js` - API endpoints
- ✅ Updated `server/index.js` with routes
- ✅ Updated `server/package.json` (added axios)

### Frontend
- ✅ `client/src/api/timelineApi.js` - API client
- ✅ `client/src/hooks/useTimeline.js` - React hook for data fetching
- ✅ `client/src/pages/TimelineView.jsx` - Main page
- ✅ `client/src/components/Timeline.jsx` - Timeline visualization
- ✅ `client/src/components/EraCard.jsx` - Individual era cards
- ✅ `client/src/components/EraDetail.jsx` - Era modal view
- ✅ Comprehensive CSS styling for all components
- ✅ Updated `client/src/App.jsx`

---

## 🚀 How to Run

### Step 1: Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Go back to root
cd ..
```

### Step 2: Start the Development Servers

```bash
# From the root directory, run both server and client:
npm run dev

# This runs:
# - Backend on http://localhost:5000
# - Frontend on http://localhost:5173
```

**Or separately in different terminals:**
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

### Step 3: Open in Browser

1. Go to `http://localhost:5173` (frontend)
2. You should see the Steam Gaming Timeline page
3. Enter a Steam ID and click "View Timeline"

---

## 🧪 Testing with a Steam ID

### Where to Find Your Steam ID

1. Go to your Steam profile: `https://steamcommunity.com/`
2. Click on your username (top right)
3. Look at the URL: `https://steamcommunity.com/profiles/YOUR_STEAM_ID_HERE`
4. Copy the numeric ID

### Example Steam IDs to Test
- You can use your own Steam ID
- Make sure the profile is **public** (Steam → Account → Community visibility)

---

## 📊 How It Works

```
1. User enters Steam ID
   ↓
2. Frontend sends GET /api/timeline?steamId=...
   ↓
3. Backend calls Cloud Function (getUserFeatureModel)
   ↓
4. Receives game data with genres, playtime, etc.
   ↓
5. Groups games into 6-month "eras"
   ↓
6. Identifies dominant genres per era
   ↓
7. Returns formatted eras with descriptions
   ↓
8. Frontend renders interactive timeline
   ↓
9. User clicks era → Modal shows all games
```

---

## 🎯 Key Features Implemented

✅ **Interactive Timeline** - Click eras to view details
✅ **6-Month Grouping** - Games grouped by time + genre
✅ **Auto-Generated Names** - "2015 Spring: FPS Domination"
✅ **Ad-lib Descriptions** - Story-like summaries per era
✅ **Game Lists** - Complete list of games per era
✅ **Statistics** - Hours played, game count, avg hours/game
✅ **Genre Breakdown** - Top genres per era
✅ **Responsive Design** - Works on desktop/mobile/tablet
✅ **Error Handling** - Clear error messages
✅ **Loading States** - Visual feedback during loading

---

## 🔧 Configuration

### To Change Cloud Function URL (if needed)

Edit `server/src/controllers/eraController.js`:
```javascript
const cloudFunctionUrl = process.env.CLOUD_FUNCTION_URL || 'http://localhost:5001/wildhacks26/us-central1/getUserFeatureModel';
```

### To Disable Caching

Add `?useCache=false` to the API call in frontend or set in `.env`:
```
VITE_USE_CACHE=false
```

### To Change Max Games Processed

Edit `TimelineView.jsx` when calling `getTimeline()`:
```javascript
await getTimeline(inputValue, { maxGames: 100 });
```

---

## 📱 UI/UX Features

- **Responsive Timeline** - Horizontal scrollable on mobile
- **Hover Effects** - Cards lift up on hover
- **Selected State** - Clicked era highlighted
- **Modal View** - Fullscreen era details
- **Smooth Animations** - Fade-in effects
- **Color-Coded Genres** - Visual genre identification
- **Top Game Preview** - Quick stats on era card

---

## 🐛 Troubleshooting

### Issue: "Cannot reach Cloud Function"
**Solution:** Make sure:
- Cloud Functions are deployed: `npm run deploy` in functions folder
- Steam API key is set in Firebase Secrets
- URL in `eraController.js` is correct

### Issue: "No games found"
**Solution:**
- Make sure Steam profile is **public**
- User must have played at least 1 game

### Issue: CORS error
**Solution:**
- Backend already has CORS enabled
- Make sure `npm run dev:server` is running on :5000
- Check browser console for exact error

### Issue: Localhost:5173 won't connect
**Solution:**
- Make sure `npm run dev:client` is running
- Try clearing browser cache
- Check no other app is using port 5173

---

## ✨ What's Next?

This is Phase 1: **Timeline of Game Eras**

The plan includes:
- **Phase 2:** Recommendations engine
- **Phase 3:** Player profile generation
- **Phase 4:** Fun metrics (Waste of Money, Library Sentiment, etc.)

All of these can build on this timeline foundation!

---

## 📚 File Structure Reminder

```
server/
├── src/
│   ├── controllers/
│   │   └── eraController.js      ← Main logic
│   ├── routes/
│   │   └── timelines.js          ← API endpoints
│   └── utils/
│       ├── gameGrouping.js       ← Era computation
│       └── eraFormatter.js       ← Data formatting
├── index.js                       ← Entry point
└── package.json

client/
├── src/
│   ├── api/
│   │   └── timelineApi.js        ← API calls
│   ├── components/
│   │   ├── Timeline.jsx
│   │   ├── EraCard.jsx
│   │   ├── EraDetail.jsx
│   │   └── *.css files
│   ├── hooks/
│   │   └── useTimeline.js        ← React hook
│   ├── pages/
│   │   └── TimelineView.jsx      ← Main page
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
└── package.json
```

---

## 🎓 Learning Points

### Backend Architecture
- Separation of concerns (routes → controllers → utils)
- Cloud Function integration pattern
- Error handling & logging
- In-memory caching strategy

### Frontend Architecture
- Custom hooks for async logic (`useTimeline`)
- Component composition (Page → Components)
- Prop drilling for state management
- CSS organization (component-scoped styles)

### Algorithm
- Grouping by time buckets (6-month intervals)
- Genre extraction and ranking
- Merging similar adjacent periods

---

## 📞 Ready to Deploy?

Once everything works locally, you can:

1. **Deploy backend:**
   ```bash
   cd server
   npm run build  # If needed
   # Deploy to Firebase Functions or your host
   ```

2. **Deploy frontend:**
   ```bash
   cd client
   npm run build
   # Deploy to Firebase Hosting or your host
   ```

---

## ✅ Quick Checklist Before Running

- [ ] Node.js installed
- [ ] Both `server/` and `client/` have `node_modules`
- [ ] Cloud Functions deployed with Steam API key
- [ ] Valid Steam ID ready to test
- [ ] Steam profile is set to public
- [ ] No other app using ports 5000 or 5173

---

**Happy gaming! 🎮 Your timeline awaits!**

Questions? Check the console logs (Browser DevTools F12) for detailed error messages.
