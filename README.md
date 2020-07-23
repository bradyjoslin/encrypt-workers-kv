# Encrypt Cloudflare Workers KV

This library provides wrappers on the `put` and `get` functions from the Cloudflare Workers runtime API for writing to and reading from [Workers KV](https://developers.cloudflare.com/workers/reference/apis), encrypting values before `put` and unecrypting values after `get`. Encryption is implemented using the [Web Crypto API](https://developers.cloudflare.com/workers/reference/apis/web-crypto/) to derive AES-GCM keys from a password based key (PBKDF2).

By default all data stored in Cloudflare [Workers KV](https://developers.cloudflare.com/workers/reference/storage) is encrypted at rest:

> All values are encrypted at rest with 256-bit AES-GCM, and only decrypted by the process executing your Worker scripts or responding to your API requests. ([docs](https://developers.cloudflare.com/workers/reference/storage))

However, there are a variety of reasons you may want to add your own encryption to the values stored in Workers KV. For example, permissions to access Workers KV are scoped at the account level. For those working in shared team or organizational accounts, this means you cannot limit access to specific KV namespaces, as anyone in that account with access to Workers can read the stored data in all KV namespaces in that account.

## Logic Flow

An overview of the logical steps used for encryption and decryption in `src/index.ts`.

**Encryption:**

1. Create a password based key (PBKDF2) that will be used to derive the AES-GCM key used for encryption / decryption.
1. Create an AES-GCM key using the PBKDF2 key and a randomized salt value.
1. Encrypt the input data using the AES-GCM key and a randomized initialization vector (iv).
1. The values used for the password, salt, iv for encryption are needed for decryption. Therefore, create an ArrayBuffer to be stored that includes the salt that was used when creating the password based key (PBKDF2), iv used for creating the AES key, and the encrypted content. The password should remain secret, so is stored as a [Worker Secret](https://developers.cloudflare.com/workers/reference/apis/environment-variables/#secrets).

**Decryption:**

1. Derive the salt, iv, and encrypted data from the ArrayBuffer.
1. Create a password based key (PBKDF2) that will be used to derive the AES-GCM key used for encryption / decryption. Password must be the same used for encryption and is obtained from the Workers Secret.
1. Create an AES-GCM key using the PBKDF2 key and the salt from the ArrayBuffer.
1. Decrypt the input data using the AES-GCM key and the iv from the ArrayBuffer.
1. Decode the decrypted value to a string.

## Functions

<dl>
<dt><a href="#putEncryptedKV">putEncryptedKV(namespace, key, data, password, options)</a></dt>
<dd><p>Wrapper on Workers KV put command that encrypts data prior to storage</p>
</dd>
<dt><a href="#getDecryptedKV">getDecryptedKV(namespace, key, password)</a></dt>
<dd><p>Wrapper on Workers KV get command that decrypts data after getting from storage</p>
</dd>
</dl>

<a name="putEncryptedKV"></a>

### putEncryptedKV(namespace, key, data, password, options)

Wrapper on Workers KV put command that encrypts data prior to storage

| Param      | Type                                 | Description                                                                                                          |
| ---------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| namespace  | <code>KVNamespace</code>             | the binding to the namespace that script references                                                                  |
| key        | <code>string</code>                  | the key in the namespace used to reference the stored value                                                          |
| data       | <code>string</code> or `ArrayBuffer` | the data to encrypt and store in KV                                                                                  |
| password   | <code>string</code>                  | the password used to encrypt the data                                                                                |
| iterations | <code>number</code>                  | optional number of iterations used by the PBKDF2 to derive the key. Default 10000                                    |
| options    | <code>Object</code>                  | optional KV put fields ([docs](https://developers.cloudflare.com/workers/reference/apis/kv/#creating-expiring-keys)) |

Returns encrypted value as string - `Promise<ArrayBuffer>`

Sample implementation:

```javascript
let data = await request.text()
try {
  await putEncryptedKV(ENCRYPTED, 'data', data, password)
  return new Response('Secret stored successfully')
} catch (e) {
  return new Response(e.message, { status: e.status })
}
```

<a name="getDecryptedKV"></a>

### getDecryptedKV(namespace, key, password)

Wrapper on Workers KV get command that decrypts data after getting from storage

| Param     | Type                     | Description                                                 |
| --------- | ------------------------ | ----------------------------------------------------------- |
| namespace | <code>KVNamespace</code> | the binding to the namespace that script references         |
| key       | <code>string</code>      | the key in the namespace used to reference the stored value |
| password  | <code>string</code>      | the password used to encrypt the data                       |

Returns decrypted value as string - `Promise<ArrayBuffer>`

Sample implementation:

```javascript
try {
  let decryptedData = await getDecryptedKV(ENCRYPTED, 'data', password)
  let strDecryptedData = dec.decode(decryptedData)
  return new Response(`${strDecryptedData}`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
} catch (e) {
  return new Response(e.message, { status: e.status })
}
```

## Build and Test

A test worker is used to test the library, located in `test-worker/`. Configure `wrangler.toml` in that folder with your account information. Then, create a new Workers KV namespace and add the configuration to wrangler.toml.

`wrangler kv:namespace create "ENCRYPTED"`

Add the password for PBKDF2 as a Workers Secret.

`wrangler secret put PASSWORD`

To deploy the test worker and run the the automated tests, change directory back to the project root directory and:

`npm run test:deploy && npm run test`

## References

- [Ernie Turner: Dodging Web Crypto API Landmines | Web Rebels 2018](https://www.youtube.com/watch?v=lbt2_M1hZeg)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [bradyjoslin/webcrypto-example for using in browser](https://github.com/bradyjoslin/webcrypto-example)
