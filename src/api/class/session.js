/* eslint-disable no-unsafe-optional-chaining */
const { WhatsAppInstance, db, client } = require('../class/instance')

const logger = require('pino')()
const config = require('../../config/config')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fs = require('fs').promises; 

class Session {
    async restoreSessions() {
        let restoredSessions = [];
        let allSessions = [];

        try {
            await client.connect();
            const database = client.db('conexao');
            const sessions = database.collection('sessions');

            const sessionsSnapshot = await sessions.find().toArray();
console.log(sessionsSnapshot)
            if (sessionsSnapshot.length > 0) {
                sessionsSnapshot.forEach(doc => {
                    allSessions.push(doc);
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
