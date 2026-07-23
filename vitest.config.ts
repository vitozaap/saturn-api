import { resolve } from "path"
import swc from "unplugin-swc"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
    test: {
        globals: true,
        root: './',
        env: loadEnv(mode, process.cwd(), ""),
        setupFiles: ["reflect-metadata"]
    },
    plugins: [
        swc.vite({ module: { type: "es6" } })
    ],
    resolve: {
        alias: {
            'src': resolve(__dirname, './src')
        }
    }
}))