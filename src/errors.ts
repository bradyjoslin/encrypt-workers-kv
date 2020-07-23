export class KVError extends Error {
  constructor(message?: string, status: number = 500) {
    super(message)
    this.status = status
  }
  status: number
}

export class NotFoundError extends KVError {
  constructor(message: string = `Not Found`, status: number = 404) {
    super(message, status)
  }
}

export class PutError extends KVError {
  constructor(message: string = `Error putting value to KV`) {
    super(message)
  }
}

export class CryptoError extends Error {
  constructor(message?: string, status: number = 500) {
    super(message)
  }
}

export class DecryptionError extends CryptoError {
  constructor(message: string = `Error decrypting value`) {
    super(message)
  }
}

export class EncryptionError extends CryptoError {
  constructor(message: string = `Error encrypting value`) {
    super(message)
  }
}
