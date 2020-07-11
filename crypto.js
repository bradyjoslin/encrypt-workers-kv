const buff_to_base64 = buff => btoa(String.fromCharCode.apply(null, buff))

const base64_to_buf = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(null))

const enc = new TextEncoder()
const dec = new TextDecoder()

export const encrypt = async (data, password) =>
  await encryptData(data, password)

export const decrypt = async (encryptedData, password) =>
  (await decryptData(encryptedData, password)) || 'decryption failed!'

const getPasswordKey = password =>
  crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])

const deriveKey = (passwordKey, salt, keyUsage) =>
  crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    keyUsage,
  )

async function encryptData(secretData, password) {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const passwordKey = await getPasswordKey(password)
    const aesKey = await deriveKey(passwordKey, salt, ['encrypt'])
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      enc.encode(secretData),
    )

    const encryptedContentArr = new Uint8Array(encryptedContent)
    let buff = new Uint8Array(
      salt.byteLength + iv.byteLength + encryptedContentArr.byteLength,
    )
    buff.set(new Uint8Array(salt), 0)
    buff.set(new Uint8Array(iv), salt.byteLength)
    buff.set(
      new Uint8Array(encryptedContentArr),
      salt.byteLength + iv.byteLength,
    )
    const base64Buff = buff_to_base64(buff)
    return base64Buff
  } catch (e) {
    console.log(`Error - ${e}`)
    return ''
  }
}

async function decryptData(encryptedData, password) {
  try {
    const encryptedDataBuff = base64_to_buf(encryptedData)
    const salt = encryptedDataBuff.slice(0, 16)
    const iv = encryptedDataBuff.slice(16, 16 + 12)
    const data = encryptedDataBuff.slice(16 + 12)
    const passwordKey = await getPasswordKey(password)
    const aesKey = await deriveKey(passwordKey, salt, ['decrypt'])
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      data,
    )
    return dec.decode(decryptedContent)
  } catch (e) {
    console.log(`Error - ${e}`)
    return ''
  }
}
