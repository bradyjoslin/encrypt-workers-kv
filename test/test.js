const test = require('ava')
const fetch = require('node-fetch')

const url = 'https://encrypted-workers-kv.bradyjoslin.workers.dev/'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function it_encrypts(t, url, input) {
  let res = await fetch(url, { method: 'PUT', body: input })
  t.is(res.status, 200)
  t.is(await res.text(), 'Secret stored successfully')
}

it_encrypts.title = (providedTitle = '', input) => `${providedTitle} ${input}`

async function it_decrypts(t, url, input) {
  sleep(1000)
  let res = await fetch(url)
  t.is(res.status, 200)
  t.is(await res.text(), input)
}

it_decrypts.title = (providedTitle = '', input) => `${providedTitle} ${input}`

test.serial(
  'encrypt 1',
  it_encrypts,
  url,
  'This is a long message with urls https://bradyjoslin.com.',
)

test.serial(
  'decrypt 1',
  it_decrypts,
  url,
  'This is a long message with urls https://bradyjoslin.com.',
)

test.serial(
  'encrypt 2',
  it_encrypts,
  url,
  'This is a long message with urls https://bradyjoslin.com...',
)

test.serial(
  'decrypt 2',
  it_decrypts,
  url,
  'This is a long message with urls https://bradyjoslin.com...',
)
