$ErrorActionPreference = "Stop"

# Local Windows tester APK.
# React Native + Reanimated CMake fails on long paths (this repo lives under
# Downloads\repositories\...). Build from a short physical copy in the user temp directory.

$mobileRoot = Split-Path -Parent $PSScriptRoot
$shortRoot = Join-Path $env:TEMP "c2c-mobile-build"

$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { "C:\Program Files\Android\Android Studio\jbr" }
$env:NODE_ENV = "production"
$env:CI = "1"
$env:EXPO_NO_GIT_STATUS = "1"
$env:Path = @(
  (Join-Path $env:JAVA_HOME "bin"),
  (Join-Path $env:ANDROID_HOME "platform-tools"),
  (Join-Path $env:ANDROID_HOME "cmdline-tools\latest\bin"),
  $env:Path
) -join ";"

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"

if (-not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  throw "JAVA_HOME does not contain a JDK. Set JAVA_HOME to Android Studio's jbr folder."
}
if (-not (Test-Path $env:ANDROID_HOME)) {
  throw "ANDROID_HOME not found at $env:ANDROID_HOME"
}

Write-Host "Syncing sources to $shortRoot (short path for CMake)..."
New-Item -ItemType Directory -Force -Path $shortRoot | Out-Null
robocopy $mobileRoot $shortRoot /E /XD node_modules android .expo dist .cxx .gradle /NFL /NDL /NJH /NP /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit $LASTEXITCODE" }

if (-not (Test-Path (Join-Path $shortRoot "node_modules\expo"))) {
  $sourceModules = Join-Path $mobileRoot "node_modules"
  if (-not (Test-Path (Join-Path $sourceModules "expo"))) {
    throw "Install mobile dependencies in $mobileRoot before building the APK."
  }

  Write-Host "Copying installed dependencies into the short build path..."
  robocopy $sourceModules (Join-Path $shortRoot "node_modules") /E /XD .cache /NFL /NDL /NJH /NP /R:1 /W:1 | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "node_modules copy failed with exit $LASTEXITCODE" }
}

Write-Host "Generating native Android project..."
Push-Location $shortRoot
try {
  npx expo prebuild --platform android --clean --no-install
  if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed with exit $LASTEXITCODE" }
} finally {
  Pop-Location
}
if (-not (Test-Path (Join-Path $shortRoot "android\gradlew.bat"))) {
  throw "Expo prebuild did not produce an Android project."
}

Write-Host "Building standalone release APK (debug-signed, no Metro required)..."
Push-Location (Join-Path $shortRoot "android")
try {
  & .\gradlew.bat assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
  if ($LASTEXITCODE -ne 0) { throw "gradlew assembleRelease failed with exit $LASTEXITCODE" }
} finally {
  Pop-Location
}

$apk = Join-Path $shortRoot "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apk)) {
  throw "APK not found at $apk"
}

$dist = Join-Path $mobileRoot "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$dest = Join-Path $dist "click2call-android-test.apk"
Copy-Item $apk $dest -Force

Write-Host ""
Write-Host "Test APK ready:"
Write-Host $dest
Write-Host ""
Write-Host "Sideload with: adb install -r `"$dest`""
