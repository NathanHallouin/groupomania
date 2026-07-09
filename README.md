# Groupomania

Enterprise social network platform — full-stack monorepo.

This repository combines the backend and frontend of Groupomania into a single codebase.

## Structure

| Path        | Description                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `backend/`  | Microservices API — Node.js, TypeScript, Express, PostgreSQL, Redis.        |
| `frontend/` | Web client — React 19, TypeScript, Vite, Tailwind CSS.                      |

## Getting started

Each package manages its own dependencies and scripts. See the README in each folder for detailed instructions:

- [`backend/README.md`](backend/README.md)
- [`frontend/README.md`](frontend/README.md)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## License

See [LICENSE](LICENSE).
