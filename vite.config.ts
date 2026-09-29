import Uni from '@uni-helper/plugin-uni'
import Components from '@uni-helper/vite-plugin-uni-components'
import Manifest from '@uni-helper/vite-plugin-uni-manifest'
import Pages, { PageContext } from '@uni-helper/vite-plugin-uni-pages'
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, extname, join, posix, resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { WotResolver } from './src/resolver'
export default defineConfig(async ({ command, mode }) => {
  const pagesOptions = { dts: 'src/uni-pages.d.ts' }
  // uni-app reads page feature flags before configResolved. Generate the full
  // config first so clean builds do not strip the router using a one-page stub.
  await new PageContext(pagesOptions, process.cwd()).updatePagesJSON()
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const bosBase = (env.VITE_ASSET_BASE_URL || '').trim().replace(/\/+$/, '')
  const useBOS = command === 'build' && process.env.UNI_PLATFORM === 'h5' && bosBase !== ''
  if (useBOS) {
    const url = new URL(bosBase)
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new Error('VITE_ASSET_BASE_URL must be an HTTPS origin, for example https://mirrora.bj.bcebos.com')
    }
  }
  const bosStaticPlugin: Plugin = {
    name: 'mirrora-bos-static',
    enforce: 'pre',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    transform(code, id) {
      if (!useBOS || !id.endsWith('.vue')) return
      return code.replaceAll('/static/', `${bosBase}/static/`)
    },
    generateBundle(_, bundle) {
      if (!useBOS) return
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || !item.fileName.endsWith('.css') || typeof item.source !== 'string') continue
        item.source = item.source.replace(/url\((['"]?)(?!data:|https?:|\/)([^)'"?#]+)([^)'"]*)\1\)/g, (match, quote, file, suffix) => {
          if (!mediaExtensions.has(extname(file).toLowerCase())) return match
          const target = posix.normalize(posix.join(posix.dirname(item.fileName), file))
          return `url(${quote}${bosBase}/${target}${suffix}${quote})`
        })
      }
    },
    closeBundle() {
      if (!useBOS) return
      const uploadDirectory = resolve(outputDirectory, '../../bos-upload')
      rmSync(uploadDirectory, { recursive: true, force: true })
      cpSync(join(outputDirectory, 'static'), join(uploadDirectory, 'static'), { recursive: true })
      const assetsDirectory = join(outputDirectory, 'assets')
      for (const name of readdirSync(assetsDirectory)) {
        const source = join(assetsDirectory, name)
        if (!statSync(source).isFile() || !mediaExtensions.has(extname(name).toLowerCase())) continue
        const destination = join(uploadDirectory, 'assets', name)
        mkdirSync(dirname(destination), { recursive: true })
        cpSync(source, destination)
      }
    },
  }

  let outputDirectory = ''
  const mediaExtensions = new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.otf', '.eot'])

  return {
    base: '/',
    build: { assetsDir: 'assets' },
    server: { port: 5173, proxy: { '/api': {
      target: 'http://127.0.0.1:8080', changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api/, ''),
    } } },
    plugins: [bosStaticPlugin, Manifest(), Pages(pagesOptions),
      Components({ resolvers: [WotResolver()], dts: 'src/components.d.ts' }), Uni()],
  }
})
