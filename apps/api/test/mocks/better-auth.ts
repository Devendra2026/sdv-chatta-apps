export function betterAuth() {
  return {
    handler: async () => new Response("{}"),
    api: {
      getSession: async () => null,
    },
  }
}
