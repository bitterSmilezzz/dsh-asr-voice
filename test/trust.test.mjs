import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isTrusted } from '../lib/http.js'

/**
 * ⚑ 信任围栏夹具。与 dsh-asr-voice/test/trust.test.mjs、
 * dsh-email/test/settings-route.test.mjs 三仓共用同一张表（各仓独立性契约禁止
 * 跨仓 import，故表内容内联复制、逐字保持一致）——任一侧实现漂移即此表变红。
 */
const CASES = [
  { name: '回环 Host + 同源 Origin', host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080', want: true },
  { name: '回环 Host + 无 Origin（curl / 导航）', host: '127.0.0.1:3080', want: true },
  { name: 'localhost Host + 同源 Origin', host: 'localhost:3080', origin: 'http://localhost:3080', want: true },
  { name: 'IPv6 回环 + 同源 Origin', host: '[::1]:3080', origin: 'http://[::1]:3080', want: true },
  { name: 'LAN Host + LAN 同源 Origin', host: '192.168.1.20:3080', origin: 'http://192.168.1.20:3080', want: true },
  { name: '跨站 Origin 挡下', host: '127.0.0.1:3080', origin: 'http://evil.test', want: false },
  { name: 'Origin: null 挡下（沙箱 iframe / file:）', host: '127.0.0.1:3080', origin: 'null', want: false },
  { name: '畸形 Origin 挡下', host: '127.0.0.1:3080', origin: 'not a url', want: false },
  { name: 'sec-fetch-site: cross-site 直接挡下', host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080', site: 'cross-site', want: false },
  { name: 'DNS rebinding 域名挡下', host: '127.0.0.1.evil.com:3080', want: false },
  { name: 'LAN Host + 无 Origin 挡下（无 Origin 只信回环）', host: '192.168.1.20:3080', want: false },
  { name: '回环 Host 但 Origin 换端口无关（同源看主机）', host: '127.0.0.1:3080', origin: 'http://127.0.0.1:9', want: true },
  { name: '缺失 Host 头挡下', want: false },
]

function reqOf(c) {
  const headers = {}
  if (c.host !== undefined) headers.host = c.host
  if (c.origin !== undefined) headers.origin = c.origin
  if (c.site !== undefined) headers['sec-fetch-site'] = c.site
  return { headers }
}

for (const c of CASES) {
  test(`isTrusted: ${c.name} → ${c.want}`, () => {
    assert.equal(isTrusted(reqOf(c)), c.want)
  })
}
