import { KVNamespace } from '@cloudflare/workers-types'

const enc = new TextEncoder()
const dec = new TextDecoder()

/**
 * Wrapper on Workers KV put command that encrypts data prior to storage
 *
 * @param {KVNamespace} namespace the binding to the namespace that script references
 * @param {string} key the key in the namespace used to reference the stored value
 * @param {string} data the data to encrypt and store in KV
 * @param {string} password the password used to encrypt the data
 * @param {Object} options optional KV put fields
 * @returns {Promise<ArrayBuffer | null>} encrypted value as ArrayBuffer or null for exceptions
 * */
async function putEncryptedKV(
  namespace: KVNamespace,
  key: string,
  data: string,
  password: string,
  options?: {
    expiration?: string | number
    expirationTtl?: string | number
  },
): Promise<ArrayBuffer | null> {
  try {
    const encryptedData = await encryptData(data, password)
    if (!encryptedData) {
      throw new Error('Encryption failed, nothing written to KV!')
    }
    if (options) {
      await namespace.put(key, encryptedData)
    } else {
      await namespace.put(key, encryptedData, options)
    }
    return encryptedData
  } catch (e) {
    console.log(`Error - ${e}`)
    return null
  }
}

/**
 * Wrapper on Workers KV get command that decrypts data after getting from storage
 *
 * @param {KVNamespace} namespace the binding to the namespace that script references
 * @param {string} key the key in the namespace used to reference the stored value
 * @param {string} password the password used to encrypt the data
 * @returns {Promise<string | null>} decrypted value as string or null for exceptions
 * */
async function getDecryptedKV(
  namespace: KVNamespace,
  key: string,
  password: string,
): Promise<string | null> {
  let kvEncryptedData = await namespace.get(key, 'arrayBuffer')
  if (kvEncryptedData === null) {
    console.log(`could not find ${key} in your namespace`)
    return null
  }
  let decryptedData = await decryptData(kvEncryptedData, password)
  if (decryptedData === null) {
    console.log(`decryption failed for ${key} in your namespace`)
    return null
  }
  return decryptedData
}

const getPasswordKey = (password: string): PromiseLike<CryptoKey> =>
  crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])

const deriveKey = (
  passwordKey: CryptoKey,
  salt: Uint8Array,
  keyUsage: CryptoKey['usages'],
): PromiseLike<CryptoKey> =>
  crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    keyUsage,
  )

async function encryptData(
  secretData: string,
  password: string,
): Promise<ArrayBuffer | null> {
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
    return buff.buffer
  } catch (e) {
    console.log(`Error - ${e}`)
    return null
  }
}

async function decryptData(
  encryptedData: ArrayBuffer,
  password: string,
): Promise<string | null> {
  try {
    const encryptedDataBuff = new Uint8Array(encryptedData)
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
    return null
  }
}

export { putEncryptedKV, getDecryptedKV }
