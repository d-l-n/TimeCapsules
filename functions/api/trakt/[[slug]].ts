interface TraktProxyContext {
  request: Request
  params: Record<string, string | string[]>
}

export async function onRequest(context: TraktProxyContext): Promise<Response> {
  const { request, params } = context
  const segments = Array.isArray(params.slug) ? params.slug : [params.slug].filter(Boolean)
  const path = segments.join("/")
  const url = new URL(request.url)
  const target = `https://api.trakt.tv/${path}${url.search}`

  const clientId = request.headers.get("trakt-api-key")
  const auth = request.headers.get("Authorization")

  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  headers.set("trakt-api-version", "2")
  if (clientId) headers.set("trakt-api-key", clientId)
  if (auth) headers.set("Authorization", auth)

  const init: RequestInit = {
    method: request.method,
    headers,
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text()
  }

  const res = await fetch(target, init)
  const resHeaders = new Headers()
  resHeaders.set("Content-Type", res.headers.get("Content-Type") || "application/json")
  resHeaders.set("Cache-Control", "no-store")
  return new Response(res.body, {
    status: res.status,
    headers: resHeaders,
  })
}

