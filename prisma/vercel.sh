#!/bin/sh
echo "Running prisma migrations..."
npx prisma migrate deploy
