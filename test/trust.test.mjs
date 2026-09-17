import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isTrusted } from '../lib/http.js'

/**
 * ⚑ 信任围栏夹具。与 dsh-asr-voice/test/trust.test.mjs、
 * dsh-email/test/settings-route.test.mjs 三仓共用同一张表（各仓独立性契约禁止
 * 跨仓 import，故表内容内联复制、逐字保持一致）——任一侧实现漂移即此表变红。
 * 同源判据 = scheme + host + **port**（浏览器口径）：只比主机名时，本机任意端口上的
 * 页面（dev server / 预览服务）都能借宿主代理花用户的 key。
 */
const CASES = [
  { name: '回环 Host + 同源 Origin', host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080', want: true },
  { name: '回环 Host + 无 Origin（curl / 导航）', host: '127.0.0.1:3080', want: true },
  { name: 'localhost Host + 同源 Origin', host: 'localhost:3080', origin: 'http://localhost:3080', want: true },
  { name: 'IPv6 回环 + 同源 Origin', host: '[::1]:3080', origin: 'http://[::1]:3080', want: true },
  { name: '非回环 Host + 同源 Origin 挡下（Host 非回环一律不可信）', host: '192.0.2.55:3080', origin: 'http://192.0.2.55:3080', want: false },
  { name: '跨站 Origin 挡下', host: '127.0.0.1:3080', origin: 'http://evil.test', want: false },
  { name: 'Origin: null 挡下（沙箱 iframe / file:）', host: '127.0.0.1:3080', origin: 'null', want: false },
  { name: '畸形 Origin 挡下', host: '127.0.0.1:3080', origin: 'not a url', want: false },
  { name: 'sec-fetch-site: cross-site 直接挡下', host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080', site: 'cross-site', want: false },
  { name: 'DNS rebinding 域名挡下', host: '127.0.0.1.evil.com:3080', want: false },
  { name: 'DNS rebinding 域名 + 同源 Origin 挡下（rebinding 惯用手法）', host: '127.0.0.1.evil.com:3080', origin: 'http://127.0.0.1.evil.com:3080', want: false },
  { name: '非回环 Host + 无 Origin 挡下（无 Origin 只信回环）', host: '192.0.2.55:3080', want: false },
  { name: '回环 Host + Origin 换端口挡下（同源 = scheme+host+port）', host: '127.0.0.1:3080', origin: 'http://127.0.0.1:9', want: false },
  { name: '回环 Host + 缺省端口等价（Host: localhost:80 / Origin: http://localhost）', host: 'localhost:80', origin: 'http://localhost', want: true },
  { name: '回环 Host + https 缺省端口等价（Host: localhost:443 / Origin: https://localhost）', host: 'localhost:443', origin: 'https://localhost', want: true },
  { name: '回环 Host + Origin 大小写归一后仍同源', host: 'LocalHost:3080', origin: 'http://LOCALHOST:3080', want: true },
  { name: '回环 Host 缺端口 + Origin 带端口挡下（端口不明 ≠ 同源）', host: '127.0.0.1', origin: 'http://127.0.0.1:3080', want: false },
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
