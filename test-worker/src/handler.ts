import { putEncryptedKV, getDecryptedKV } from '../../encrypted-workers-kv'
const password = PASSWORD

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'PUT') {
    let data = await request.text()
    try {
      await putEncryptedKV(ENCRYPTED, 'data', data, password)
      return new Response('Secret stored successfully')
    } catch (e) {
      return new Response(e.message, { status: e.status })
    }
  } else if (request.method === 'GET') {
    try {
      let decryptedData = await getDecryptedKV(ENCRYPTED, 'data', password)
      return new Response(`${decryptedData}`, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    } catch (e) {
      return new Response(e.message, { status: e.status })
    }
  } else {
    return new Response('Request method not supported', { status: 500 })
  }
}
