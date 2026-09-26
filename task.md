# Task: Prompt Builder / O'Bend

Репозиторій: https://github.com/ozymandi/A2 (публічний, дефолтна гілка `main`).

## Опис

Node-based конструктор промптів для AI-генераторів зображень (Midjourney, Stable Diffusion, DALL-E, Ideogram).
Три частини в одному репозиторії:

| Частина | Стек | Де живе |
|---|---|---|
| `backend/` | Node.js, Express 5, ws, MCP SDK. Один файл `index.js`, слухає `127.0.0.1:3001` (HTTP + WebSocket) і одночасно є MCP-сервером через stdio для LM Studio. Усі LLM-запити йдуть у локальний LM Studio (порт 1234). Генерація вектора може іти через ComfyUI (порт 8188). | `main`, `mobile-app` |
| `frontend/` | Vite + React 19 + TypeScript, @xyflow/react, Tailwind 4. Ноди: Input, Component, Mixer, Output, ImageVision, Palette, Grid, VectorOutput. | `main`, `mobile-app` |
| `mobile/` (O'Bend) | Expo SDK 52, React Native 0.76, React Navigation. Без локального бекенду: виклики LLM ідуть напряму до Groq / OpenRouter / Gemini з ключем користувача в AsyncStorage. Екрани: Login, Builder, Settings, ModelSelector. | тільки `mobile-app` |

Детальний опис функцій — у [README.md](README.md) (десктоп) та [mobile/README.md](mobile/README.md) (мобільний).

## Поточний статус (на 2026-09-26)

**Десктопна частина (backend + frontend)** — робоча, використовувалась щонайменше до 6 вересня 2026 (за логом `backend/mcp_debug.log`). Активної розробки немає.

**Мобільна частина (`mobile-app`)** — у стадії стабілізації збірки:
- Гілка `mobile-app` випереджає `main` на 15 комітів, у `main` не злита. Локальна гілка синхронізована з `origin`.
- Останній пуш — 8 червня 2026. З того часу проєкт не рухався.
- Історія комітів — боротьба зі збіркою: SDK 54 → 52, babel, Hermes, expo-file-system, Google Sign-In прибрали і повернули.
- CI ([.github/workflows/build.yml](.github/workflows/build.yml)) збирає APK через `expo prebuild` + `gradlew assembleRelease` на пуш у `mobile-app` або вручну (workflow_dispatch). Останні дві збірки (8 червня) — успішні. Артефакти APK вже видалені (термін зберігання 90 днів минув).
- Google Sign-In: нативний модуль підключений, у `LoginScreen.tsx` заповнений реальний `WEB_CLIENT_ID`. Поряд є кнопка Mock Login для тестування без ключів.
- Чи запускається зібраний APK на реальному пристрої без крашу — **не підтверджено**. Останні коміти перед успішною збіркою були саме про нативні краші на старті.

## Зроблено

- Десктоп: node-based UI, збереження/завантаження графів, декомпіляція зображень через Vision-модель, оптимізація промпту під цільовий двигун, палітра, композиційна сітка, вектор через ComfyUI, MCP-інтеграція з LM Studio.
- Мобільний: UI всіх екранів, інтеграція з Groq / OpenRouter / Gemini, декомпіляція зображень з галереї/камери, палітри, Ideogram JSON, Google Auth + mock, Error Boundary, CI-збірка APK.

## Наступний крок

1. Перезапустити workflow «Build Android APK» вручну (або зробити пуш у `mobile-app`), щоб отримати свіжий APK.
2. Встановити APK на реальний Android-пристрій і перевірити: старт без крашу, Google Sign-In, виклик LLM з ключем.
3. За результатом — або злити `mobile-app` у `main`, або продовжити фікси.

## Відомі проблеми / технічний борг

- `mobile/AGENTS.md` наказує читати документацію Expo v56, а проєкт на SDK 52. Суперечність, потрібно виправити на v52.
- `mobile/README.md` посилається на `npm run dev`, якого немає в `package.json` (є `npm start`).
- `CHANGELOG.md`: розділ «Ітерація 3» побитий кодуванням, «Ітерація 2» відсутня.
- `backend/vector_workflow.json` має нестандартне кодування (не читається як UTF-8 / UTF-16).
- `backend/mcp_debug.log` і кореневий `mcp_debug.log` відстежуються git і постійно змінюються, тому статус завжди «modified». Варто додати в `.gitignore`.
- Адреса бекенду `127.0.0.1:3001` захардкоджена в кожній ноді фронтенду; у `VectorOutputNode.tsx` використовується `localhost` замість `127.0.0.1`.
- Пресети дубльовані: `frontend/src/constants/presets.ts` і `mobile/src/constants/presets.ts`.

## Відкриті питання до клієнта

- Немає зафіксованих вимог клієнта у проєкті. Незрозуміло, чи мобільний застосунок — це клієнтське замовлення чи внутрішній продукт, і який цільовий результат: APK для тесту, публікація в Google Play, iOS.
- Чи потрібна взагалі десктопна частина далі, чи фокус лише на мобільному.

## Історія сесій

- **2026-09-26** — аналіз проєкту, перевірка стану GitHub і CI, створено `task.md` і `team.md`. Код не змінювався.
