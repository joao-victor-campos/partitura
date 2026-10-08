# Partitura client

Vite + React app, wrapped with Capacitor for Android. The interface is in Brazilian Portuguese; every
on-screen string lives in `src/i18n/pt-BR.ts`. The training rules are in `packages/core`.

All commands run from the repository root.

## Develop

```sh
pnpm install
pnpm dev                              # Vite dev server
```

The offline piano samples are committed in `apps/client/public/samples/piano/`. To download them again:

```sh
node apps/client/scripts/fetch-piano-samples.mjs
```

## Test, check, build

```sh
pnpm test                             # core + client tests
pnpm --filter @partitura/client typecheck
pnpm --filter @partitura/client lint
pnpm --filter @partitura/client build
```

## Android

Needs JDK 21 and the Android SDK.

```sh
pnpm --filter @partitura/client android   # build, sync and run on a device or emulator
```

On a fresh clone, prepare the project before opening it in Android Studio:

```sh
pnpm install
pnpm --filter @partitura/client build
cd apps/client && npx cap sync android
```

To build an APK from the command line:

```sh
cd apps/client/android
JAVA_HOME=$(/usr/libexec/java_home -v 21) ANDROID_HOME=~/Library/Android/sdk ./gradlew assembleDebug
```

## Credits

Piano sounds: Salamander Grand Piano by Alexander Holm, licensed
[CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/), from <https://tonejs.github.io/audio/salamander/>.
