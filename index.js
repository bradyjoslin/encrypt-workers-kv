import { putEncryptedKV, getDecryptedKV } from './crypto.js'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const password = PASSWORD
  let data =
    'This is a long message with emojis 🏋️‍♀️, urls https://bradyjoslin.com, and json {"hello":"world!"}.'

  await putEncryptedKV(ENCRYPTED, 'data', data, password)
  let decryptedData = await getDecryptedKV(ENCRYPTED, 'data', password)

  return new Response(`input: '${data}' <br/> output: '${decryptedData}'`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
