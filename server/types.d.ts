declare namespace NodeJS {
  interface Process {
    pkg?: boolean
  }
}

declare module 'multicast-dns' {
  interface MdnsOptions {
    multicast?: boolean
    interface?: string
    port?: number
    ip?: string
    ttl?: number
    loopback?: boolean
    reuseAddr?: boolean
  }

  interface Question {
    name: string
    type: string
  }

  interface Answer {
    name: string
    type: string
    ttl: number
    data: any
  }

  interface Query {
    questions: Question[]
  }

  interface MdnsInstance {
    on(event: 'query', callback: (query: Query) => void): void
    respond(response: { answers: Answer[] }): void
    destroy(): void
  }

  function multicastdns(options?: MdnsOptions): MdnsInstance
  export = multicastdns
}
