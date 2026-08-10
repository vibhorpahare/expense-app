# Splitly Mobile

React Native (Expo) app for the Splitly expense-splitting backend. Full feature parity with `../frontend`, restyled in the dark "Obsidian" theme.

## Running

1. Start the backend (`cd ../backend`, then whatever your usual dev-server command is) so it's listening on `http://localhost:8000`.
2. `npm install`
3. Set `EXPO_PUBLIC_API_URL` in `.env` (copy `.env.example` if you haven't already):
   - iOS Simulator: `http://localhost:8000` (default, shares the Mac's network namespace, zero config)
   - Android emulator: `http://10.0.2.2:8000`
   - Expo Go on a physical phone: your Mac's LAN IP, e.g. `http://192.168.1.23:8000` (get it with `ipconfig getifaddr en0`) -- phone and Mac must be on the same Wi-Fi
4. `npx expo start`, then press `i` (iOS Simulator), `a` (Android emulator), or scan the QR code with Expo Go.
5. Log in with a seeded demo account: `priya@example.com` / `password123` (also `rahul@`, `ana@`, `wei@example.com`).

## Notes

- Backend routes are top-level (`/get_groups`, not `/api/get_groups`) -- there's no dev-server proxy like the web app has, `src/api/client.ts` points straight at `EXPO_PUBLIC_API_URL`.
- Auth tokens live in `expo-secure-store`, last 24h, and there's no refresh endpoint -- a 401 clears the stored token and the app falls back to the login screen.
- No automated test suite (matches `frontend/`'s testing posture -- it doesn't have one either).
