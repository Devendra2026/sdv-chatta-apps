export async function hashPassword(password: string) {
  return `hashed:${password}`
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string
  password: string
}) {
  return hash === `hashed:${password}`
}

export async function hash(password: string) {
  return `hashed:${password}`
}
