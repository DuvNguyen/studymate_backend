# Render Backend Env Checklist

Use this when filling `studymate-backend` environment variables on Render.

## Fill now (available)

- `NODE_ENV=production`
- `DATABASE_URL=<use your Neon production URL>`
- `REDIS_PORT=6379`
- `REDIS_TTL=3600`

## Fill from deployed frontend

- `FRONTEND_URL=https://<your-vercel-production-domain>`

## Fill from Upstash Redis

- `REDIS_URL=rediss://default:<password>@<host>:6379`
- `REDIS_HOST` can be left empty when `REDIS_URL` is set.

## Fill from Meilisearch

- `MEILISEARCH_HOST=https://<your-meili-host>`
- `MEILISEARCH_API_KEY=<your-meili-api-key>`

## Fill from existing secrets

- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `CLERK_JWT_KEY`
- `CLOUDINARY_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

## After saving env vars on Render

1. Trigger a redeploy.
2. Check boot logs for database + redis connection.
3. Verify search endpoint and any course/user search features.
