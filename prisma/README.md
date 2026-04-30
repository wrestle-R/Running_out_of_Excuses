# Prisma Migration Flow

This project now includes SQL-based Prisma migrations under `prisma/migrations/`.

## Local

```bash
cd next
npx prisma generate
npx prisma migrate deploy
```

If you are creating a new migration locally:

```bash
cd next
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

## Production

```bash
cd next
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` only applies checked-in SQL migrations and is the safe command for CI/CD environments.
