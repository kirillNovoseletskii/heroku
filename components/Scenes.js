const Scene = require('telegraf/scenes/base')
const config = require('config')
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs') 
const { Telegraf } = require('telegraf')
const {Extra, Markup, Stage, session} = Telegraf
const Users = require('../models/userScema') // User Scema
let log_data = {}
//////////
// async function connectDB() {
//     const mongoUri = 'mongodb+srv://Kirill:Users1234@telebot.lcjgv.mongodb.net/Users'

//     await mongoose.connect(mongoUri, {
//         useNewUrlParser: true
//     })
//     .then(() => console.log("SUCCESS CONNECT TO DB"))
//     .catch(err => console.log("FAILED CONNECT TO DB", err))
// }
// connectDB()
//////////
let transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    secure: true,
    auth: {
        user:config.get('Admin.email'),
        pass: config.get('Admin.password'),
    }
});

transporter.verify((e, s) => {
    if (e) return console.log("ERORR:", e)
    transporter.on('token', token => {
        console.log('A new access token was generated');
        console.log('User: %s', token.user);
        console.log('Access Token: %s', token.accessToken);
        console.log('Expires: %s', new Date(token.expires));
    });
})

const sendEmail = (rand_pass, currEmail) => transporter.sendMail({
    from: config.get('Admin.email'),
    to: currEmail,
    subject: "Message from Node js",
    text: `Ваш проверочный код - ${rand_pass}`,
})
class SceneGen{
    sendVidios() {
        const sender = new Scene('sendVidios')
        sender.enter(async msg => {
            let send = true
            const userTo = await Users.findOne({_teleId: msg.message.from.id});
            const n = userTo.n
            setTimeout(async () => {
                const date = new Date()
                if (date.getHours() === 8-3 && date.getMinutes() === 0 && date.getSeconds() === 0 && send){
                    console.log('Vidion n:', n)
                    msg.reply(config.get("CURS_DATA.links")[n])
                    await Users.findOneAndUpdate({_teleId: msg.message.from.id}, {n: n+1})
                }
                console.log(date.getHours()+3, date.getMinutes(), date.getSeconds(), send)
                msg.scene.reenter()
                    sender.command('stop',async msg => {
                        await console.log('stop')
                        send = false
                        await msg.reply('bot stopped');
                        await msg.scene.leave()
                })
            }, 1000)  
        })

        return sender
    }
    
    getEmail() {
        const email = new Scene('email');
        const rand_pass = Math.random().toString(36).slice(-8); // create random password 
        email.enter(async (ctx) => {
            await ctx.reply('Введи email')
        })

        email.on('text', async ctx => {

            let currEmail = String(ctx.message.text)

            const secEmail = await Users.findOne({email: String(ctx.message.text)})
            console.log(secEmail)
            if (currEmail.includes('@') && secEmail === null) {
                try {
                    await sendEmail(rand_pass, currEmail)
                    log_data.email = currEmail
                    await ctx.reply(`Мы отправили письмо с проверочный паролем на вашу почту, введите его`);
                    log_data.rand = rand_pass
                    await ctx.scene.enter('done');
                } catch (error) {
                    console.log('+++++NO EMAIL+++++')
                    console.log(error)
                    await ctx.reply('Вашего email не существует\nвведите верный email');
                    await ctx.scene.reenter()
                }
            }
            else if (!currEmail.includes('@')){
                await ctx.reply('Не коректный email')
                await ctx.scene.reenter()
            } else{
                await ctx.reply('Такой email уже существует, для входа введи команду /LOG')
                await email.command('LOG', ctx => ctx.scene.enter('log'));
                await ctx.scene.leave()
            }
        });

        return email
    }
    donePass () {
        const done = new Scene('done');
        done.on('text', async msg => {
            console.log(log_data)
            if((msg.message.text === log_data.rand)){
                msg.scene.enter('password')
            } else{
                msg.reply('Ты ошибся, введи пароль еще раз');
                console.log("Random key",log_data.rand)
                msg.scene.reenter()
            }
        })
        return done
    }
    getPassScene() {
        const password = new Scene('password')
        password.enter(async (ctx) => {
            await ctx.reply('Придумай пароль')
        })
        password.on('text',async ctx => { 
            const currPass = String(ctx.message.text)
            if (currPass.length >= 8){
                await ctx.reply('Чтобы войти напиши команду /LOG')  

                log_data.password = currPass
                log_data._teleId = ctx.message.from.id
                log_data.n = 0
                
                await Users.create(log_data)
                await ctx.scene.leave()
            } else{
                await ctx.reply('Длинна твоего пароля меньше 8')
                await ctx.scene.reenter()
            }
        });
        return password
    }
    logEmail() {
        const log = new Scene('log')
        log.enter(async ctx => ctx.reply('Введи свою почту'))
        log.on('text',async msg => {
            log_data.email = msg.message.text
            const user = await Users.findOne({email: msg.message.text});
            if (user === null) {
                await msg.reply('Такого пользователя нет❌, зарегистрируйся используя команду /REG\nили компанду /resend для повторного ввода')
                await msg.scene.leave()
            } else {
                log_data.logUser = user
                console.log(log_data.logUser)
                await msg.scene.enter('logPassword')
            }
        })
        return log;
    }
    logPassword() {
        const logPass = new Scene('logPassword')
        logPass.enter(async ctx => ctx.reply('Введи свой пароль', Markup
        .keyboard(['/forgotPassword'])
        .oneTime()
        .resize()
        .extra()));
        logPass.command('forgotPassword',async msg => {
            await msg.scene.enter('forgot')
        })
        logPass.on('text', async msg => {
            const ismatch = msg.message.text === log_data.logUser.password

            if (!ismatch) {
                await msg.reply('Ваш пароль не верный🔒');
                await msg.scene.reenter()
            }else{
                await msg.reply('Вы успешно вошли ✅');
                msg.reply('Выберите действиие 👇🏼',  Markup
                    .keyboard(['/sendVidios', '/stop'])
                    .oneTime()
                    .resize()
                    .extra()
                )
                msg.scene.leave()
                // await msg.scene.leave()
            }
        })
        return logPass;
    }
    forgotPass() {
        const forgot = new Scene('forgot');
        forgot.enter(msg => {
            msg.reply('Введи свою почту cнова')
        })
        forgot.on('text',async msg => {
            const userLog = await Users.findOne({email: log_data.email});
            const usrMail = userLog.email
            if (!userLog) {
                await msg.reply('Такого пользователя нет❌, зарегистрируйся используя команду /REG\nили компанду /resend для повторного ввода')
                await msg.scene.leave()
            } else {
                await msg.reply(`Мы отправили пароль тебе на почту\n/LOG для входа`)
                console.log(usrMail)
                await sendEmail(userLog.password, usrMail)   
                await msg.scene.leave()
            }
        })
        return forgot
    }
}

module.exports = SceneGen