import { defineConfig } from 'vite'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, relative } from 'path'

const JS_FILES_TO_COPY = [
    'app.js',
    'auth-security.js',
    'dados-mestres.js',
    'forms-data.js',
    'forms-engine.js',
    'laudo-ia.js',
    'notificacoes-engine.js',
    'turno-engine.js',
    'analytics.js',
    'vev-improvements.js',
    'relatorio-inconformidade.js',
]

const STATIC_FILES_TO_COPY = [
    'service-worker.js',
    'offline.html',
    'manifest.json',
    'ford_logo_icon_145825.png',
    'icon-192.png',
    'icon-512.png',
]

function copyStaticFiles() {
    const rootDir = resolve(__dirname, '.')
    const outDir = resolve(__dirname, 'dist')
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
    const allFiles = [...JS_FILES_TO_COPY, ...STATIC_FILES_TO_COPY]
    for (const file of allFiles) {
        const src = resolve(rootDir, file)
        const dest = resolve(outDir, file)
        if (existsSync(src)) {
            copyFileSync(src, dest)
        }
    }
}

export default defineConfig({
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        esbuild: {
            drop: ['console', 'debugger'],
        },
    },
    css: {
        devSourcemap: false,
    },
    plugins: [
        {
            name: 'copy-static-files',
            closeBundle() {
                copyStaticFiles()
            },
        },
    ],
})
