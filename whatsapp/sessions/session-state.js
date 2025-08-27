// Simple state management for sessions
export class SessionState {
  constructor() {
    this.sessions = new Map()
  }

  set(sessionId, data) {
    this.sessions.set(sessionId, {
      ...data,
      lastActivity: Date.now()
    })
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
    }
    return session
  }

  delete(sessionId) {
    this.sessions.delete(sessionId)
  }

  has(sessionId) {
    return this.sessions.has(sessionId)
  }

  getAll() {
    return Array.from(this.sessions.entries())
  }

  clear() {
    this.sessions.clear()
  }
}