import fs from "fs"
import path from "path"
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class SessionFileManager {
  constructor() {
    this.sessionsDir = path.resolve(process.cwd(), "sessions")
    this._ensureSessionsDirectory()
  }

  _ensureSessionsDirectory() {
    try {
      if (!fs.existsSync(this.sessionsDir)) {
        fs.mkdirSync(this.sessionsDir, { recursive: true })
      }
    } catch (error) {
      throw error
    }
  }

  getSessionPath(sessionId) {
    let normalizedSessionId = sessionId

    if (sessionId.startsWith('session_')) {
      normalizedSessionId = sessionId
    } else if (sessionId.startsWith('user_')) {
      const userId = sessionId.replace('user_', '')
      normalizedSessionId = `session_${userId}`
    } else {
      normalizedSessionId = `session_${sessionId}`
    }

    const userId = normalizedSessionId.replace('session_', '')
    return path.join(this.sessionsDir, `session_${userId}`)
  }

  ensureSessionDirectory(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId)
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true })
      }
      return true
    } catch (error) {
      return false
    }
  }

  hasValidCredentials(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId)
      const credsFile = path.join(sessionPath, "creds.json")
      
      if (!fs.existsSync(credsFile)) return false
      
      const stats = fs.statSync(credsFile)
      if (stats.size === 0) return false
      
      const data = fs.readFileSync(credsFile, "utf8")
      const parsed = JSON.parse(data)
      
      return !!(parsed?.noiseKey || parsed?.signedIdentityKey || parsed?.registrationId)
    } catch (error) {
      return false
    }
  }

  readCredentials(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId)
      const credsFile = path.join(sessionPath, "creds.json")

      if (!fs.existsSync(credsFile)) return null

      const data = fs.readFileSync(credsFile, "utf8")
      if (!data.trim()) return null

      return JSON.parse(data)
    } catch (error) {
      return null
    }
  }

  writeCredentials(sessionId, credentials) {
    try {
      if (!credentials || typeof credentials !== 'object') return false

      const sessionPath = this.getSessionPath(sessionId)
      this.ensureSessionDirectory(sessionId)
      
      const credsFile = path.join(sessionPath, "creds.json")
      const tempFile = credsFile + '.tmp'

      fs.writeFileSync(tempFile, JSON.stringify(credentials, null, 2))
      fs.renameSync(tempFile, credsFile)
      
      return true
    } catch (error) {
      return false
    }
  }

  async cleanupSessionFiles(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId)
      if (!fs.existsSync(sessionPath)) return true

      return await this._removeDirectory(sessionPath)
    } catch (error) {
      return false
    }
  }

  async _removeDirectory(dirPath, maxRetries = 3) {
    let attempt = 0
    
    while (attempt < maxRetries) {
      try {
        if (fs.rmSync) {
          fs.rmSync(dirPath, { recursive: true, force: true })
          return true
        }
        
        const files = fs.readdirSync(dirPath)
        for (const file of files) {
          const filePath = path.join(dirPath, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory()) {
            await this._removeDirectory(filePath, 1)
          } else {
            fs.unlinkSync(filePath)
          }
        }
        
        fs.rmdirSync(dirPath)
        return true
        
      } catch (error) {
        attempt++
        if (attempt >= maxRetries) return false
        await new Promise(resolve => setTimeout(resolve, 500 * attempt))
      }
    }
    
    return false
  }

  async cleanupOrphanedSessions(database) {
    try {
      if (!fs.existsSync(this.sessionsDir)) return

      const sessionDirs = fs.readdirSync(this.sessionsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && 
                (dirent.name.startsWith('user_') || dirent.name.startsWith('session_')))
        .map(dirent => dirent.name)

      let cleanedCount = 0

      for (const dirName of sessionDirs) {
        try {
          let sessionId

          if (dirName.startsWith('user_')) {
            const userId = dirName.replace("user_", "")
            if (!userId) continue
            sessionId = `session_${userId}`
            
            // Rename old format to new format
            const oldPath = path.join(this.sessionsDir, dirName)
            const newPath = path.join(this.sessionsDir, sessionId)
            
            if (!fs.existsSync(newPath)) {
              fs.renameSync(oldPath, newPath)
            } else {
              await this._removeDirectory(oldPath)
            }
            
          } else if (dirName.startsWith('session_')) {
            sessionId = dirName
          } else {
            continue
          }

          // Check if session exists in database
          const hasDbSession = database && await database.getSession?.(sessionId)

          if (!hasDbSession) {
            const dirPath = path.join(this.sessionsDir, sessionId)
            if (!fs.existsSync(dirPath)) continue
            
            const stats = fs.statSync(dirPath)
            const dirAge = Date.now() - stats.mtime.getTime()
            const twoHours = 2 * 60 * 60 * 1000

            if (dirAge > twoHours) {
              await this._removeDirectory(dirPath)
              cleanedCount++
            }
          }
        } catch (error) {
          // Continue with next directory
        }
      }

      return cleanedCount
    } catch (error) {
      return 0
    }
  }

  getSessionSize(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId)
      if (!fs.existsSync(sessionPath)) return 0

      let totalSize = 0
      const files = fs.readdirSync(sessionPath)
      
      for (const file of files) {
        const filePath = path.join(sessionPath, file)
        const stats = fs.statSync(filePath)
        totalSize += stats.size
      }
      
      return totalSize
    } catch (error) {
      return 0
    }
  }

  listSessionFiles(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId)
      if (!fs.existsSync(sessionPath)) return []

      return fs.readdirSync(sessionPath).map(file => ({
        name: file,
        path: path.join(sessionPath, file),
        size: fs.statSync(path.join(sessionPath, file)).size
      }))
    } catch (error) {
      return []
    }
  }

  validateSessionDirectory(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId)
      
      return {
        exists: fs.existsSync(sessionPath),
        hasCredentials: this.hasValidCredentials(sessionId),
        size: this.getSessionSize(sessionId),
        files: this.listSessionFiles(sessionId).length
      }
    } catch (error) {
      return {
        exists: false,
        hasCredentials: false,
        size: 0,
        files: 0
      }
    }
  }
}

export { SessionFileManager }