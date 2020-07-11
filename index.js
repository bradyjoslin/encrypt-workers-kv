import { encrypt, decrypt } from './crypto.js'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const password = PASSWORD

  let data = 'secret data'

  let encryptedData = await encrypt(data, password)
  ENCRYPTED.put('data', encryptedData)

  let kvEncryptedData = await ENCRYPTED.get('data')
  let decryptedData = await decrypt(kvEncryptedData, password)

  return new Response(
    `'${data}' was encrypted to <br/> ${encryptedData} <br/> then decrypted back to '${decryptedData}'`,
    {
      headers: { 'content-type': 'text/html' },
    },
  )
}
