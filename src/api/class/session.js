/* eslint-disable no-unsafe-optional-chaining */
const { WhatsAppInstance, db } = require('../class/instance')

const logger = require('pino')()
const config = require('../../config/config')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fs = require('fs').promises; 

class Session {
    async restoreSessions() {
        let restoredSessions = [];
        let allSessions = [];

        try {
            const sessionsRef = db.collection('sessions');
            const sessionsSnapshot = await sessionsRef.get();

            if (!sessionsSnapshot.empty) {
                sessionsSnapshot.forEach(doc => {
                    allSessions.push(doc.data());
                });
            }

            for (const sessionData of allSessions) {
                const { key, webhook, webhookUrl } = sessionData;
                const instance = new WhatsAppInstance(key, webhook, webhookUrl);
                await instance.init();
                WhatsAppInstances[key] = instance;
                restoredSessions.push(key);
                await sleep(150);
            }
        } catch (e) {
            logger.error('Error restoring sessions');
            logger.error(e);
        }

        return restoredSessions;
    }
}

exports.Session = Session;
