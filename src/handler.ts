import { putEncryptedKV, getDecryptedKV } from './crypto'

export async function handleRequest(request: Request): Promise<Response> {
  const password = PASSWORD
  let data =
    'This is a long message with emojis 🏋️‍♀️, urls https://bradyjoslin.com, and json {"hello":"world!"}.'

  try {
    await putEncryptedKV(ENCRYPTED, 'data', data, password)
  } catch (e) {
    return new Response(e.message, { status: e.status })
  }

  try {
    let decryptedData = await getDecryptedKV(ENCRYPTED, 'data', password)
    return new Response(`input: '${data}' <br/> output: '${decryptedData}'`, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } catch (e) {
    return new Response(e.message, { status: e.status })
  }
}
