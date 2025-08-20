import { logger } from "../../utils/logger.js"
import { WhatsAppHelpers } from "../utils/helpers.js"
import AdminChecker from "../utils/admin-checker.js"
import pluginLoader from "../../utils/plugin-loader.js"

export class GroupHandler {
  constructor() {
    this.adminChecker = new AdminChecker()
  }

  async handleGroupJoin(sock, groupJid, participants) {
    logger.info(`[Groups] Users joined group ${groupJid}: ${participants.join(", ")}`)

    try {
      // Get group metadata
      const groupMetadata = await sock.groupMetadata(groupJid)

      // Check if welcome plugin is enabled
      const groupeventsPlugin = pluginLoader.getPluginByCommand("groupevents")
      if (groupeventsPlugin && await groupeventsPlugin.isWelcomeEnabled(groupJid)) {
        const welcomeMessage = await groupeventsPlugin.createWelcomeMessage(groupMetadata, participants)
        await sock.sendMessage(groupJid, { text: welcomeMessage })
        logger.info(`[Groups] Welcome message sent for ${participants.length} new members`)
      }

      // Log join event
      await this.logGroupEvent(groupJid, "join", participants)
    } catch (error) {
      logger.error(`[Groups] Error handling group join: ${error.message}`)
    }
  }

  async handleGroupLeave(sock, groupJid, participants) {
    logger.info(`[Groups] Users left group ${groupJid}: ${participants.join(", ")}`)

    try {
      // Get group metadata
      const groupMetadata = await sock.groupMetadata(groupJid)

      // Check if goodbye plugin is enabled
      const groupeventsPlugin = pluginLoader.getPluginByCommand("groupevents")
      if (groupeventsPlugin && await groupeventsPlugin.isGoodbyeEnabled(groupJid)) {
        const goodbyeMessage = await groupeventsPlugin.createGoodbyeMessage(groupMetadata, participants)
        await sock.sendMessage(groupJid, { text: goodbyeMessage })
        logger.info(`[Groups] Goodbye message sent for ${participants.length} members who left`)
      }

      // Log leave event
      await this.logGroupEvent(groupJid, "leave", participants)
    } catch (error) {
      logger.error(`[Groups] Error handling group leave: ${error.message}`)
    }
  }

  async handleGroupPromote(sock, groupJid, participants, promoter) {
    logger.info(`[Groups] Users promoted in group ${groupJid}: ${participants.join(", ")}`)

    try {
      // Clear admin cache for promoted users
      for (const participant of participants) {
        // Note: AdminChecker no longer has clearCache method, using new system
        logger.debug(`[Groups] Admin status updated for ${participant} in ${groupJid}`)
      }

      // Send promotion message using groupevents plugin
      const groupeventsPlugin = pluginLoader.getPluginByCommand("groupevents")
      if (groupeventsPlugin) {
        const promotionMessage = await groupeventsPlugin.createPromotionMessage(participants)
        await sock.sendMessage(groupJid, { text: promotionMessage })
        logger.info(`[Groups] Promotion message sent for ${participants.length} members`)
      }

      // Log promotion event
      await this.logGroupEvent(groupJid, "promote", participants, promoter)
    } catch (error) {
      logger.error(`[Groups] Error handling group promotion: ${error.message}`)
    }
  }

  async handleGroupDemote(sock, groupJid, participants, demoter) {
    logger.info(`[Groups] Users demoted in group ${groupJid}: ${participants.join(", ")}`)

    try {
      // Clear admin cache for demoted users
      for (const participant of participants) {
        // Note: AdminChecker no longer has clearCache method, using new system
        logger.debug(`[Groups] Admin status updated for ${participant} in ${groupJid}`)
      }

      // Send demotion message using groupevents plugin
      const groupeventsPlugin = pluginLoader.getPluginByCommand("groupevents")
      if (groupeventsPlugin) {
        const demotionMessage = await groupeventsPlugin.createDemotionMessage(participants)
        await sock.sendMessage(groupJid, { text: demotionMessage })
        logger.info(`[Groups] Demotion message sent for ${participants.length} members`)
      }

      // Log demotion event
      await this.logGroupEvent(groupJid, "demote", participants, demoter)
    } catch (error) {
      logger.error(`[Groups] Error handling group demotion: ${error.message}`)
    }
  }

  async logGroupEvent(groupJid, eventType, participants, actor = null) {
    try {
      // Log to database if needed
      logger.info(`[Groups] Logged ${eventType} event for ${participants.length} participants in ${groupJid}`)
    } catch (error) {
      logger.error(`[Groups] Error logging group event: ${error.message}`)
    }
  }
}
