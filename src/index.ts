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
 * @param {string | ArrayBuffer} data the data to encrypt and store in KV
 * @param {string} password the password used to encrypt the data
 * @param {number} iterations optional number of iterations used by the PBKDF2 to derive the key.  Default 10000
 * @param {Object} options optional KV put fields
 * @returns {Promise<ArrayBuffer>} a promise for an encrypted value as ArrayBuffer
 * */
async function putEncryptedKV(
  namespace: KVNamespace,
  key: string,
  data: string | ArrayBuffer,
  password: string,
  iterations: number = 10000,
  options?: {
    expiration?: string | number
    expirationTtl?: string | number
  },
): Promise<ArrayBuffer> {
  data = typeof data === 'string' ? enc.encode(data) : data
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
 * @returns {Promise<ArrayBuffer>} a promise for a decrypted value as ArrayBuffer
 * */
async function getDecryptedKV(
  namespace: KVNamespace,
  key: string,
  password: string,
): Promise<ArrayBuffer> {
  let kvEncryptedData = await namespace.get(key, 'arrayBuffer')
  if (kvEncryptedData === null) {
    throw new NotFoundError(`could not find ${key} in your namespace`)
  }

  try {
    let decryptedData = await decryptData(kvEncryptedData, password)
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
  secretData: ArrayBuffer,
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
      secretData,
    )

    const encryptedContentArr = new Uint8Array(encryptedContent)
    let iterationsArr = new Uint8Array(enc.encode(iterations.toString()))

    let buff = new Uint8Array(
      iterationsArr.byteLength +
        salt.byteLength +
        iv.byteLength +
        encryptedContentArr.byteLength,
    )
    let bytes = 0
    buff.set(iterationsArr, bytes)
    buff.set(salt, (bytes += iterationsArr.byteLength))
    buff.set(iv, (bytes += salt.byteLength))
    buff.set(encryptedContentArr, (bytes += iv.byteLength))

    return buff.buffer
  } catch (e) {
    throw new EncryptionError(`Error encrypting value: ${e.message}`)
  }
}

async function decryptData(
  encryptedData: ArrayBuffer,
  password: string,
): Promise<ArrayBuffer> {
  try {
    const encryptedDataBuff = new Uint8Array(encryptedData)

    let bytes = 0
    const iterations = Number(
      dec.decode(encryptedDataBuff.slice(bytes, (bytes += 5))),
    )

    const salt = new Uint8Array(encryptedDataBuff.slice(bytes, (bytes += 16)))
    const iv = new Uint8Array(encryptedDataBuff.slice(bytes, (bytes += 12)))
    const data = new Uint8Array(encryptedDataBuff.slice(bytes))

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
    return decryptedContent
  } catch (e) {
    throw new DecryptionError(`Error decrypting value: ${e.message}`)
  }
}

export { putEncryptedKV, getDecryptedKV }
