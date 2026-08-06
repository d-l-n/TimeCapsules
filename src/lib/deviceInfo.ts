export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
}

const has = (ua: string, re: RegExp) => re.test(ua)

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent
  const isIpad = /macintel/i.test(navigator.platform) && navigator.maxTouchPoints > 1
  const tablet = isIpad || has(ua, /ipad|tablet/i) || (has(ua, /android/i) && !has(ua, /mobile/i))
  const mobile = !tablet && has(ua, /mobile|iphone|ipod|android/i)

  let browser = 'Browser'
  if (has(ua, /edg\//i)) browser = 'Edge'
  else if (has(ua, /opr\/|opera/i)) browser = 'Opera'
  else if (has(ua, /samsungbrowser/i)) browser = 'Samsung Internet'
  else if (has(ua, /chrome|crios/i)) browser = 'Chrome'
  else if (has(ua, /firefox|fxios/i)) browser = 'Firefox'
  else if (has(ua, /safari/i)) browser = 'Safari'

  let os = 'Unknown OS'
  if (isIpad) os = 'iOS'
  else if (has(ua, /windows/i)) os = 'Windows'
  else if (has(ua, /mac os x|macintosh/i)) os = 'macOS'
  else if (has(ua, /android/i)) os = 'Android'
  else if (has(ua, /iphone|ipod/i)) os = 'iOS'
  else if (has(ua, /linux/i)) os = 'Linux'

  return { type: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', browser, os }
}
