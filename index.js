// libraries
const db = require('./DataBase/users.json')
const nodemailer = require("nodemailer");
const { Telegraf } = require('telegraf')
const config = require('config')
const ScenesClass = require('./components/Scenes')
// Hipper params
const CURS = config.get('CURS_PASS')
const TOCKEN = config.get('KEY')
const {Extra, Markup, Stage, session} = Telegraf
user_data = {} // data of single user
let users = require("./DataBase/users.json");
// Scenes
const currGen = new ScenesClass()
const emailScene = currGen.getEmail()
const passScene = currGen.getPassScene()
const logMail = currGen.logEmail()
const logPass = currGen.logPassword()
const done = currGen.donePass()
const sendVidios = currGen.sendVidios()
const forgot = currGen.forgotPass()

const stage = new Stage([emailScene, passScene, logMail, logPass, done, sendVidios, forgot])
// BOT BODY
const bot = new Telegraf(TOCKEN)
// bot.use(Telegraf.log())
bot.use(session())
bot.use(stage.middleware())
bot.start((ctx) => {
    console.log(`name: ${ctx.message.from.first_name}\nlast name: ${ctx.message.from.last_name}`)
    ctx.reply('Для регистрации - /REG\nДля входа - /LOG', Markup.keyboard(['/REG',  '/LOG'])
    .oneTime()
    .resize()
    .extra())
})

bot.command('REG',async ctx => {
    await ctx.reply('Введи пароль этого курса')
    bot.hears(CURS, msg => msg.scene.enter('email'))
    bot.on('message', msg => msg.reply('Ты ошибся, введи пароль еще раз'))
})

bot.command('LOG', async ctx =>{
    ctx.scene.enter('log')
})

bot.command('resend', msg => msg.scene.enter('log'))
bot.command('sendVidios', msg => {
    id = users.filter(i => i.teleId === msg.message.from.id)
    if (id.length >= 1){
        msg.scene.enter('sendVidios')
    } else {
        msg.reply('Чтобы использовать эту функцию нужно зарегистрироваться')
    }
})
bot.command('stop', msg => {
    msg.reply('Bot stoped')
    msg.scene.leave()
})
// console.log('hello heroku')
bot.launch()