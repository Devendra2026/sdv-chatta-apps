import { StorageService } from "./storage.service"

describe("StorageService", () => {
  const previousDir = process.env.STORAGE_DIR
  const previousSecret = process.env.STORAGE_SIGNING_SECRET

  beforeEach(() => {
    process.env.STORAGE_DIR = "tmp/storage-test"
    process.env.STORAGE_SIGNING_SECRET = "test-storage-secret"
  })

  afterEach(() => {
    if (previousDir === undefined) delete process.env.STORAGE_DIR
    else process.env.STORAGE_DIR = previousDir
    if (previousSecret === undefined) delete process.env.STORAGE_SIGNING_SECRET
    else process.env.STORAGE_SIGNING_SECRET = previousSecret
  })

  it("rejects path traversal in object keys", () => {
    const storage = new StorageService()
    storage.onModuleInit()
    expect(() => storage.resolveObjectPath("../secret.txt")).toThrow()
  })

  it("issues and verifies a download signature", async () => {
    const storage = new StorageService()
    storage.onModuleInit()
    await storage.putObject(
      "imports/sample.txt",
      Buffer.from("ok"),
      "text/plain"
    )
    const url = await storage.getSignedUrl("imports/sample.txt", 60)
    const params = new URLSearchParams(url.split("?")[1])
    expect(() =>
      storage.assertDownloadSignature(
        params.get("key") ?? "",
        params.get("exp") ?? "",
        params.get("sig") ?? ""
      )
    ).not.toThrow()
  })
})
