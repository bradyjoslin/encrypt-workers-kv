import { putEncryptedKV, getDecryptedKV } from '../../'
const password = PASSWORD

const enc = new TextEncoder()
const dec = new TextDecoder()

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'PUT') {
    let data = await request.text()
    try {
      await putEncryptedKV(ENCRYPTED, 'data', data, password, 10001, {
        expirationTtl: 60,
      })
      return new Response('Secret stored successfully')
    } catch (e) {
      return new Response(e.message, { status: e.status })
    }
  } else if (request.method === 'GET') {
    try {
      let decryptedData = await getDecryptedKV(ENCRYPTED, 'data', password)
      let strDecryptedData = dec.decode(decryptedData)
      return new Response(`${strDecryptedData}`, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    } catch (e) {
      return new Response(e.message, { status: e.status })
    }
  } else {
    return new Response('Request method not supported', { status: 500 })
  }
}
