// Local development helper: runs the Vite dev server and routes /api/* to the
// Netlify Function modules in netlify/functions, so the whole app (including
// server endpoints) can be exercised without the Netlify CLI.
//   npm run dev:full
// Server env vars are read from your shell / a local .env (never committed).

import { defineConfig, loadEnv, mergeConfig, type Plugin } from 'vite'
import base from '../vite.config'

const functions: Plugin = {
  name: 'netlify-functions-local',
  configureServer(server) {
    Object.assign(process.env, loadEnv('development', process.cwd(), ''))
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (!url.pathname.startsWith('/api/')) return next()
      const name = url.pathname.slice(5).replace(/[^a-z0-9-]/g, '')
      let mod: { default: (r: Request, c: { ip: string }) => Promise<Response> }
      try {
        mod = await server.ssrLoadModule(`/netlify/functions/${name}.mts`)
      } catch {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ code: 'NOT_FOUND', message: `No function ${name}` }))
        return
      }
      try {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
        const request = new Request(url, {
          method: req.method,
          headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
        })
        const response = await mod.default(request, { ip: '127.0.0.1' })
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await response.arrayBuffer()))
      } catch (e) {
        console.error(e)
        res.statusCode = 500
        res.end(JSON.stringify({ code: 'FUNCTION_ERROR', message: String(e) }))
      }
    })
  },
}

export default mergeConfig(base, defineConfig({ plugins: [functions] }))
