import { KVNamespace } from '@cloudflare/workers-types'
import {
  PutError,
  NotFoundError,
  DecryptionError,
  EncryptionError,
} from './errors'

const enc = new TextEncoder()
const dec = new TextDecoder()

/**
 * Wrapper on Workers KV put command that encrypts data prior to storage
 *
 * @param {KVNamespace} namespace the binding to the namespace that script references
 * @param {string} key the key in the namespace used to reference the stored value
 * @param {string} data the data to encrypt and store in KV
 * @param {string} password the password used to encrypt the data
 * @param {number} iterations optional number of iterations used by the PBKDF2 to derive the key.  Default 10000
 * @param {Object} options optional KV put fields
 * @returns {Promise<ArrayBuffer>} a promise for an encrypted value as ArrayBuffer
 * */
async function putEncryptedKV(
  namespace: KVNamespace,
  key: string,
  data: string,
  password: string,
  iterations: number = 10000,
  options?: {
    expiration?: string | number
    expirationTtl?: string | number
  },
): Promise<ArrayBuffer> {
  let encryptedData
  try {
    encryptedData = await encryptData(data, password, iterations)
  } catch (e) {
    throw e
  }

  try {
    if (options) {
      await namespace.put(key, encryptedData)
    } else {
      await namespace.put(key, encryptedData, options)
    }
    return encryptedData
  } catch (e) {
    throw new PutError(`Error putting value to kv: ${e.message}`)
  }
}

/**
 * Wrapper on Workers KV get command that decrypts data after getting from storage
 *
 * @param {KVNamespace} namespace the binding to the namespace that script references
 * @param {string} key the key in the namespace used to reference the stored value
 * @param {string} password the password used to encrypt the data
 * @param {number} iterations optional number of iterations used by the PBKDF2 to derive the key.  Default 10000
 * @returns {Promise<string>} a promise for a decrypted value as string
 * */
async function getDecryptedKV(
  namespace: KVNamespace,
  key: string,
  password: string,
  iterations: number = 10000,
): Promise<string> {
  let kvEncryptedData = await namespace.get(key, 'arrayBuffer')
  if (kvEncryptedData === null) {
    throw new NotFoundError(`could not find ${key} in your namespace`)
  }
  try {
    let decryptedData = await decryptData(kvEncryptedData, password, iterations)
    return decryptedData
  } catch (e) {
    throw e
  }
}

const getPasswordKey = (password: string): PromiseLike<CryptoKey> =>
  crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])

const deriveKey = (
  passwordKey: CryptoKey,
  salt: Uint8Array,
  keyUsage: CryptoKey['usages'],
  iterations: number = 10000,
): PromiseLike<CryptoKey> =>
  crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
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
  iterations: number = 10000,
): Promise<ArrayBuffer> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const passwordKey = await getPasswordKey(password)
    const aesKey = await deriveKey(passwordKey, salt, ['encrypt'], iterations)
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
    throw new EncryptionError(`Error encrypting value: ${e.message}`)
  }
}

async function decryptData(
  encryptedData: ArrayBuffer,
  password: string,
  iterations: number = 10000,
): Promise<string> {
  try {
    const encryptedDataBuff = new Uint8Array(encryptedData)
    const salt = encryptedDataBuff.slice(0, 16)
    const iv = encryptedDataBuff.slice(16, 16 + 12)
    const data = encryptedDataBuff.slice(16 + 12)
    const passwordKey = await getPasswordKey(password)
    const aesKey = await deriveKey(passwordKey, salt, ['decrypt'], iterations)
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
    throw new DecryptionError(`Error decrypting value: ${e.message}`)
  }
}

export { putEncryptedKV, getDecryptedKV }
