const test = require('ava')
const fetch = require('node-fetch')

const url = 'https://encrypted-workers-kv.bradyjoslin.workers.dev/'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function it_encrypts(t, url, input) {
  let res = await fetch(url, {
    method: 'PUT',
    body: input,
    headers: { 'Content-Type': 'text/plain' },
  })
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
  'it encrypts text with urls',
  it_encrypts,
  url,
  'This is a message with urls https://bradyjoslin.com/blog/ms-teams-webhook-bot/?hello=world',
)

test.serial(
  'it decrypts text with urls',
  it_decrypts,
  url,
  'This is a message with urls https://bradyjoslin.com/blog/ms-teams-webhook-bot/?hello=world',
)

test.serial(
  'it encrypts text with emojis and special chars',
  it_encrypts,
  url,
  'Some text with emojis 🏂 and special characters å',
)

test.serial(
  'it decrypts text with emojis and special chars',
  it_decrypts,
  url,
  'Some text with emojis 🏂 and special characters å',
)

test.serial(
  'it encrypts long text',
  it_encrypts,
  url,
  `Sint velit eveniet. Rerum atque repellat voluptatem quia rerum. Numquam excepturi
   beatae sint laudantium consequatur. Magni occaecati itaque sint et sit tempore. Nesciunt
   amet quidem. Iusto deleniti cum autem ad quia aperiam.
   A consectetur quos aliquam. In iste aliquid et aut similique suscipit. Consequatur qui
   quaerat iste minus hic expedita. Consequuntur error magni et laboriosam. Aut aspernatur
   voluptatem sit aliquam. Dolores voluptatum est.
   Aut molestias et maxime. Fugit autem facilis quos vero. Eius quibusdam possimus est.
   Ea quaerat et quisquam. Deleniti sunt quam. Adipisci consequatur id in occaecati.
   Et sint et. Ut ducimus quod nemo ab voluptatum.`,
)

test.serial(
  'it decrypts long text',
  it_decrypts,
  url,
  `Sint velit eveniet. Rerum atque repellat voluptatem quia rerum. Numquam excepturi
   beatae sint laudantium consequatur. Magni occaecati itaque sint et sit tempore. Nesciunt
   amet quidem. Iusto deleniti cum autem ad quia aperiam.
   A consectetur quos aliquam. In iste aliquid et aut similique suscipit. Consequatur qui
   quaerat iste minus hic expedita. Consequuntur error magni et laboriosam. Aut aspernatur
   voluptatem sit aliquam. Dolores voluptatum est.
   Aut molestias et maxime. Fugit autem facilis quos vero. Eius quibusdam possimus est.
   Ea quaerat et quisquam. Deleniti sunt quam. Adipisci consequatur id in occaecati.
   Et sint et. Ut ducimus quod nemo ab voluptatum.`,
)

test.serial('it encrypts simple json', it_encrypts, url, '{"hello":"world"}')

test.serial('it decrypts simple json', it_decrypts, url, '{"hello":"world"}')

test.serial('it encrypts large json', async (t) => {
  let input = await fetch(
    'https://api.github.com/search/repositories?q=workers%20kv',
  ).then((res) => res.text())
  let res = await fetch(url, {
    method: 'PUT',
    body: input,
    headers: { 'Content-Type': 'text/plain' },
  })
  t.is(res.status, 200)
  t.is(await res.text(), 'Secret stored successfully')
})

test.serial('it decrypts large json', async (t) => {
  let input = await fetch(
    'https://api.github.com/search/repositories?q=workers%20kv',
  ).then((res) => res.text())
  sleep(1000)
  let res = await fetch(url)
  t.is(res.status, 200)
  t.is(await res.text(), input)
})
