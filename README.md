# Turbo Rush - APK + Website

## Folder mein kya hai
- site/            -> website (ye deploy karni hai). site/play/ mein game ki files hain.
- site/downloads/  -> yahan turbo-rush.apk rakhni hai
- package.json, capacitor.config.json, .github/ -> APK banane ka setup

## APK kaise banegi (free, Android Studio ke baghair)
1. github.com par naya repository banao aur is poore folder ki files upload karo (branch: main).
2. Repository mein Actions tab kholo, "Build APK" chuno, "Run workflow" dabao.
3. 3-5 minute baad run ke Artifacts mein "turbo-rush-apk" download karo (zip hogi, andar app-debug.apk).
4. app-debug.apk ka naam turbo-rush.apk karo aur site/downloads/ mein rakh do.

## Website deploy
site folder ko Netlify Drop (app.netlify.com/drop), Vercel ya GitHub Pages par deploy karo.
APK rakhne ke baad dobara deploy karna, tab Download button kaam karega.

## Laptop par test
Folder mein terminal kholo: npx serve site   (jo link dikhe wo browser mein kholo)

## Phone par install
APK download karo. Android poochay to "unknown sources se install" allow karo, phir Install dabao.
Note: ye debug APK hai, direct install ke liye theek hai. Play Store ke liye signed release build chahiye.
