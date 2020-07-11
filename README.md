# Workers KV Web Crypto Encryption and Decryption Example

Demonstrates a way to encrypt and decrypt data using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) with [Cloudflare Workers](https://developers.cloudflare.com/workers/reference/apis/web-crypto/) to store encrypted data in [Workers KV](https://developers.cloudflare.com/workers/reference/storage).

This basic example encrypts a value and stores it in Workers KV as an ArrayBuffer, then gets the stored value and decrypts it. The AES-GCM encryption and decryption keys are derived from a password based key (PBKDF2).

## Logic Flow

An overview of the logical steps used for encryption and decryption in `crypto.js`.

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

## Deploying

Configure wrangler.toml with your account information.

Create a new Workers KV namespace and add the configuration to wrangler.toml

`wrangler kv:namespace create "ENCRYPTED"`

Add the password for PBKDF2 as a Workers Secret

`wrangler secret put PASSWORD`

Deploy

`wrangler publish`

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

| Param     | Type                | Description                                                                                                          |
| --------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| namespace | <code>any</code>    | the binding to the namespace that script references                                                                  |
| key       | <code>string</code> | the key in the namespace used to reference the stored value                                                          |
| data      | <code>any</code>    | the data to encrypt and store in KV                                                                                  |
| password  | <code>string</code> | the password used to encrypt the data                                                                                |
| options   | <code>Object</code> | optional KV put fields ([docs](https://developers.cloudflare.com/workers/reference/apis/kv/#creating-expiring-keys)) |

<a name="getDecryptedKV"></a>

### getDecryptedKV(namespace, key, password)

Wrapper on Workers KV get command that decrypts data after getting from storage

| Param     | Type                | Description                                                 |
| --------- | ------------------- | ----------------------------------------------------------- |
| namespace | <code>any</code>    | the binding to the namespace that script references         |
| key       | <code>string</code> | the key in the namespace used to reference the stored value |
| password  | <code>string</code> | the password used to encrypt the data                       |

## References

- [Ernie Turner: Dodging Web Crypto API Landmines | Web Rebels 2018](https://www.youtube.com/watch?v=lbt2_M1hZeg)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [bradyjoslin/webcrypto-example for using in browser](https://github.com/bradyjoslin/webcrypto-example)
