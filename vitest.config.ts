import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['server/controllers/**', 'server/services/**', 'server/middleware/**'],
            exclude: ['server/models/**', 'node_modules/**'],
        },
        // Don't load .env in tests — use explicit mocks
        env: {
            NODE_ENV: 'test',
            JWT_SECRET: 'test-jwt-secret-for-unit-tests-only-32chars',
        },
    },
});
