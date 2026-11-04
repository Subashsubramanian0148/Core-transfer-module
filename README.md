# Transfer Request v3

- `html/index.html` – standalone page; open it directly in a browser.
- `withdrawal-review.html` – standalone withdrawal review screen.
- `react-app/` – both screens as a Vite + React app:
  - `http://localhost:5173/` – Transfer request
  - `http://localhost:5173/#withdrawal` – Withdrawal review

## Run the React app
```
cd react-app
npm install
npm run dev
```
Build for production with `npm run build` (output in `react-app/dist`).
