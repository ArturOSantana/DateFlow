# DateFlow

Aplicativo web em React + Vite com build Android via Capacitor, notificações locais/push e distribuição pelo Firebase App Distribution.

## Requisitos

- Node.js e npm
- Android Studio para gerar o APK
- Firebase CLI (`firebase-tools` já está no projeto)
- `google-services.json` do app Android em [`android/app/google-services.json`](android/app/google-services.json)
- Variável de ambiente `GOOGLE_APPLICATION_CREDENTIALS` apontando para a credencial de service account do Firebase App Distribution
- Variável de ambiente `FIREBASE_APP_DISTRIBUTION_GROUPS` com os grupos de testers

## Web

```bash
npm install
npm run dev
```

## Android

Sincronizar o web build com o projeto Android:

```bash
npm run android:sync
```

Abrir no Android Studio:

```bash
npm run android:open
```

Gerar APK release pelo Gradle:

```bash
./android/gradlew -p android assembleRelease
```

## Firebase App Distribution

Depois de configurar [`android/app/google-services.json`](android/app/google-services.json), `GOOGLE_APPLICATION_CREDENTIALS` e `FIREBASE_APP_DISTRIBUTION_GROUPS`, envie a release:

```bash
npm run android:firebase:appdistribution
```

## Notificações Android

O projeto agora usa:

- [`@capacitor/push-notifications`](package.json) para registrar token FCM no Android
- [`@capacitor/local-notifications`](package.json) para exibir notificações locais quando o app estiver em foreground
- Firestore para persistir tokens em `fcmTokens`

No Android, as permissões de notificação já foram adicionadas em [`AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml).

## Configurações Firebase necessárias

Além das variáveis web já existentes em [`.env.example`](.env.example), configure também:

- App Android no Firebase com package `com.dateflow.app`
- Cloud Messaging habilitado
- `google-services.json` baixado do console Firebase
- SHA-1/SHA-256 do keystore cadastrados para autenticação Google no Android

## Observação sobre login Google

O fluxo atual de login continua usando popup web com Firebase Auth. Para login Google nativo no Android via SDK do Google, será necessário adicionar um plugin nativo compatível com Capacitor 8 e configurar OAuth no app Android.
