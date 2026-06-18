const COMMON_WEAK_PASSWORDS = new Set([
  'password123',
  '12345678a',
  '123456789a',
  'qwerty123',
  'abc123456',
  'password1',
  '12345678',
  '123456789',
  'qwertyuiop',
  'admin1234',
  'letmein123',
  'welcome1',
  'monkey123',
  'dragon123',
  'master123',
  'sunshine1',
  'princess1',
  'football1',
  'baseball1',
  'iloveyou1',
  'trustno1',
  'shadow123',
  'superman1',
  'batman123',
  'harley12',
  'hunter12',
  'ranger12',
  'thomas12',
  'robert12',
  'michael1',
  'jordan23',
  'maggie12',
  'buster12',
  'daniel12',
  'andrew12',
  'joshua12',
  '1q2w3e4r',
  '1qaz2wsx',
  'zaq12wsx',
  '!qaz2wsx',
  'qwe12345',
  'asdf1234',
  'zxcv1234',
  'qazwsx12',
  'password!',
  'passw0rd',
  'p@ssw0rd',
  'pass1234',
  'adminadmin',
  'root1234',
  'test1234',
  'demo1234',
  'guest123',
  'user1234',
  'login123',
  'changeme',
  'secret12',
  'default1'
])

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, message: 'Password is too common or weak' }
  }
  // 拒绝简单重复模式或纯键盘序列
  if (new Set(password).size === 1) {
    return { valid: false, message: 'Password must not be repetitive characters' }
  }
  return { valid: true }
}
