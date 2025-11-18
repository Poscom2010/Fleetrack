# Background Not Updating? Try These Steps:

## Option 1: Hard Refresh Browser (Fastest)
1. Go to `http://localhost:5173/login`
2. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
3. This forces browser to reload all files

## Option 2: Clear Browser Cache
1. Press **Ctrl + Shift + Delete**
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page

## Option 3: Restart Dev Server
1. In terminal, press **Ctrl + C** to stop server
2. Run `npm run dev` again
3. Visit `http://localhost:5173/login`

## Option 4: Incognito/Private Window
1. Open new incognito/private window
2. Go to `http://localhost:5173/login`
3. Should show new background immediately

## What Changed:
- ✅ LoginPage now uses same animated background as LandingPage
- ✅ Shared `LandingBackground` component
- ✅ Grid floor, floating charts, particles, world map animations
- ✅ Both pages have identical backgrounds

## Verify It Works:
- Landing page: `http://localhost:5173/`
- Login page: `http://localhost:5173/login`
- Both should have the SAME animated background with:
  - 3D grid floor
  - Glowing cyan/blue elements
  - Floating data visualization (bottom right)
  - Circular chart (bottom left)
  - Animated particles
  - World map silhouette
