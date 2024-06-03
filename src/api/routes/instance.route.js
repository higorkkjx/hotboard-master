const express = require('express')
const controller = require('../controllers/instance.controller')
const keyVerify = require('../middlewares/keyCheck')
const loginVerify = require('../middlewares/loginCheck')

const router = express.Router()
router.route('/init').post(controller.init)
router.route('/editar').post(controller.editar)
router.route('/qr').get(keyVerify, controller.qr)
router.route('/qrbase64').get(keyVerify, controller.qrbase64)
router.route('/info').get(keyVerify, controller.info)
router.route('/gchats').get(keyVerify, controller.gchats)
router.route('/gconfig').get(keyVerify, controller.gconfig)
router.route('/editconfig').post(keyVerify, controller.editconfig)
router.route('/gchatsById').get(keyVerify, controller.gchatsById)
router.route('/restore').get(controller.restore)
router.route('/logout').get(keyVerify, loginVerify, controller.logout)
router.route('/delete').get(keyVerify, controller.delete)
router.route('/list').get(controller.list)
router.route('/deleteInactives').get(controller.deleteInactives)
router.route('/deleteAll').get(controller.deleteAll)
router.route('/getcode').post(controller.getcode)

//TYPEBOT FUNIS
router.route('/addtofirestore').post(keyVerify, controller.addtofirestore)
router.route('/displayallfunis').get(keyVerify, controller.displayllfunis)
router.route('/deletefunil').get(keyVerify, controller.deletefunil)
router.route('/sendfunil').get(keyVerify, controller.sendfunil)

//ASSINATURA
router.route('/addmail').get(keyVerify, controller.addmail)
router.route('/getmail').get(keyVerify, controller.getmail)


//GERAR GP
router.route('/gerargp').get(keyVerify, controller.gerargp)
module.exports = router
