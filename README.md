```
brew --version
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

node -v
npm -v
brew install node

xcodebuild -version
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch

docker --version
brew install --cask docker

python3 --version
pip3 --version
brew install python

cd desktop/MedSync/apps
npx create-expo-app@latest mobile-web
cd mobile-web
npm install
npm run web
npx expo start
npx expo start --ios
npx expo start --android
npx expo start --web

touch .env
nano .env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

npm install @supabase/supabase-js
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-query
npm install i18next react-i18next
npm install react-native-safe-area-context

touch .gitignore
nano .gitignore
    node_modules
    .env
    .env.*
    dist
    .expo
    .expo-shared
    .DS_Store
    coverage
    *.log

echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zprofile
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zprofile
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zprofile
```