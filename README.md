# Ledger North

Hack for Humanity Ottawa 2026 · Water in Canada's Northern Communities.

Ledger North reads the paper parts ledger instead of replacing it, shares stock between Nunavik communities even without internet, and tells each community what to order before the sealift leaves. See [SPEC.md](SPEC.md).

## Run

```
npm install
npm run dev
```

Open `http://localhost:5173/?as=Inukjuak` and `http://localhost:5173/?as=region` in two tabs to simulate two devices. The original single-file prototype is at `/prototype/`.

## Notes

- Truck counts (outside Inukjuak and Puvirnituq), stock, usage rates and flight frequencies are **sample data**.
- The Gemini key is entered in the app and stays in the browser's localStorage. It is never committed.
- Inuktitut is not machine-translated; that option stays disabled until community review.

License: MIT
