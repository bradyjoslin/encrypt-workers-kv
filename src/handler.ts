import { putEncryptedKV, getDecryptedKV } from './crypto'

export async function handleRequest(request: Request): Promise<Response> {
  const password = PASSWORD
  let data =
    'This is a long message with emojis 🏋️‍♀️, urls https://bradyjoslin.com, and json {"hello":"world!"}.'

  let encryptedData = await putEncryptedKV(ENCRYPTED, 'data', data, password)
  if (encryptedData === null) {
    return new Response('Encryption failed', { status: 500 })
  }

  let decryptedData = await getDecryptedKV(ENCRYPTED, 'data', password)
  if (decryptedData === null) {
    return new Response('Decryption failed', { status: 500 })
  }

  return new Response(`input: '${data}' <br/> output: '${decryptedData}'`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
