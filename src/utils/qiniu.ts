import Base64 from 'crypto-js/enc-base64'
import HmacSHA1 from 'crypto-js/hmac-sha1'
import { customRandom, random, urlAlphabet } from 'nanoid'
import * as qiniu from 'qiniu-js'

/**
 * @description: utf16 to utf8
 * @param {string} str
 * @return {*}
 */
function utf16to8(str: string) {
  var out, i, len, c
  out = ``
  len = str.length
  for (i = 0; i < len; i++) {
    c = str.charCodeAt(i)
    if (c >= 0x0001 && c <= 0x007f) {
      out += str.charAt(i)
    } else if (c > 0x07ff) {
      out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f))
      out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f))
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
    } else {
      out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f))
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f))
    }
  }
  return out
}

const base64EncodeChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`

/**
 * @description: base64encode
 * @param {string} str
 * @return {*}
 */
function base64encode(str: string) {
  var out, i, len
  var c1, c2, c3
  len = str.length
  i = 0
  out = ``
  while (i < len) {
    c1 = str.charCodeAt(i++) & 0xff
    if (i == len) {
      out += base64EncodeChars.charAt(c1 >> 2)
      out += base64EncodeChars.charAt((c1 & 0x3) << 4)
      out += `==`
      break
    }
    c2 = str.charCodeAt(i++)
    if (i == len) {
      out += base64EncodeChars.charAt(c1 >> 2)
      out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4))
      out += base64EncodeChars.charAt((c2 & 0xf) << 2)
      out += `=`
      break
    }
    c3 = str.charCodeAt(i++)
    out += base64EncodeChars.charAt(c1 >> 2)
    out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4))
    out += base64EncodeChars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6))
    out += base64EncodeChars.charAt(c3 & 0x3f)
  }
  return out
}

/**
 * @description: safe64
 * @param {string} base64
 * @return {*}
 */
function safe64(base64: string) {
  base64 = base64.replace(/\+/g, `-`)
  base64 = base64.replace(/\//g, `_`)
  return base64
}

/**
 * 根据文件名获取它以 `时间戳+uuid` 的形式
 * @param {string} filename 文件名
 * @returns
 */
function getDateFilename(filename = '') {
  const currentTimestamp = new Date().toLocaleDateString()
  const fileSuffix = filename.split(`.`)[filename.split(`.`).length - 1] || 'png'
  const customid = customRandom(urlAlphabet, 10, random)
  return `${currentTimestamp}/${customid()}.${fileSuffix}`
}

/**
 * @description: 前端进行 token 生成
 * @param {string} accessKey
 * @param {string} secretKey
 * @param {any} putPolicy
 * @return {*}
 */
function getQiniuToken(accessKey: string, secretKey: string, putPolicy: IPutPolicy) {
  const policy = JSON.stringify(putPolicy)
  const encoded = base64encode(utf16to8(policy))
  const hash = HmacSHA1(encoded, secretKey)
  const encodedSigned = hash.toString(Base64)

  return `${accessKey}:${safe64(encodedSigned)}:${encoded}`
}

interface IPutPolicy {
  scope: string
  deadline: number
}

export interface QiniuConfig {
  accessKey: string
  secretKey: string
  bucket: string
  region: 'z0' | 'z1' | 'z2' | 'na0' | 'as0' | 'cn-east-2'
  path?: string
  domain: string
  checked: boolean
  token: string
}

/**
 * @description: 上传
 * @param {File} file
 * @param {QiniuConfig} qiniuConfig
 * @return {*}
 */
export async function qiniuUpload(file: File, qiniuConfig: QiniuConfig): Promise<string> {
  const { accessKey, secretKey, bucket, region, path, domain, checked, token } = qiniuConfig

  let _token = token

  // 前端根据配置生成token
  if (checked) {
    _token = getQiniuToken(accessKey, secretKey, {
      scope: bucket,
      deadline: Math.trunc(new Date().getTime() / 1000) + 3600,
    })
  }

  const dir = path ? `${path}/` : ``
  const dateFilename = dir + getDateFilename(file.name)
  const observable = qiniu.upload(file, dateFilename, _token, {}, { region })
  return new Promise((resolve, reject) => {
    observable.subscribe({
      next: (result) => {
        console.log(result)
      },
      error: (err) => {
        reject(err.message)
      },
      complete: (result) => {
        resolve(`${domain}/${result.key}`)
      },
    })
  })
}
