// libraries
const Users = require('./models/userScema') // User Scema
const express = require('express')
const { Telegraf } = require('telegraf')
const mongoose = require('mongoose');
const config = require('config')
const ScenesClass = require('./components/Scenes')
// Hipper params
const CURS = config.get('CURS_PASS')
const TOCKEN = config.get('KEY')
const {Extra, Markup, Stage, session} = Telegraf
user_data = {} // data of single user
var port = process.env.PORT || 8080;
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
// Connect to mongoDB
async function connectDB() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://Kirill:Users1234@telebot.lcjgv.mongodb.net/Users'

    await mongoose.connect(mongoUri, {
        useNewUrlParser: true, 
        useUnifiedTopology: true, 
        useCreateIndex: false,
        useFindAndModify: false
    })
    .then(() => console.log("SUCCESS CONNECT TO DB"))
    .catch(err => console.log("FAILED CONNECT TO DB", err))
}
connectDB()
// BOT BODY
var db = mongoose.connection
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
bot.command('stop', async ctx =>{
    ctx.reply('бот остановлен')
})

bot.command('resend', msg => msg.scene.enter('log'))
bot.command('sendVidios', async msg => {
    const usId = await Users.findOne({_teleId: msg.message.from.id})
    console.log(usId)
    if (usId){
        msg.scene.enter('sendVidios')
    } else {
        msg.reply('Чтобы использовать эту функцию нужно зарегистрироваться')
    }
})
bot.command('stop', msg => {
    msg.reply('Bot stoped')
    msg.scene.leave()
})
const app = express()
app.get('/', (reg, res) => {
    res.send('TELEGRAMM')
})
app.listen(port, () => console.log(port))
// console.log('hello heroku')
bot.launch()