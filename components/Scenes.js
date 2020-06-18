const Scene = require('telegraf/scenes/base')
const fs = require('fs');
const config = require('config')
const nodemailer = require('nodemailer');
const { Telegraf } = require('telegraf')
const {Extra, Markup, Stage, session} = Telegraf

// hidden props
const withHiddenProps = (target, prefix='_') => {
    return new Proxy(target, {
        has: (obj, prop) => (prop in obj) && (!prop.startsWith(prefix)),
        ownKeys: obj => Reflectf.ownKeys(obj)
            .filter(p => !p.startsWith(prefix)),
        get: (obj, prop, resiver) => {
                return (prop in resiver) ? obj[prop] : undefined
            }
        })
}
let user_data = {}
let log_data = {}
let users = require("../DataBase/users.json");

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: 'gmail',
    port: 465,
    secure: true,
    requireTLS: true,
    auth: {
        user: config.get('Admin.email'),
        pass: config.get('Admin.password')
      }
});
class SceneGen{
    sendVidios() {
        const sender = new Scene('sendVidios')

        return sender
    }
    donePass () {
        const done = new Scene('done');
        done.on('text', async msg => {
            console.log(log_data)
            if((msg.message.text === log_data.rand)){
                user_data._id = users.length,
                user_data.email = log_data.email
                msg.scene.enter('password')
            } else{
                msg.reply('Ты ошибся, введи пароль еще раз');
                msg.scene.leave()
            }
        })
        return done
    }
    getEmail() {
        const email = new Scene('email');
        const rand_pass  = Math.random().toString(36).slice(-8);
        email.enter(async (ctx) => {
            await ctx.reply('Введи email')
        })

        email.on('text', async ctx => {
            let currEmail = String(ctx.message.text)
            const secEmail = users.filter(i => i.email === currEmail)

            if (currEmail.includes('@') && secEmail.length < 1) {
                try {
                    await transporter.sendMail({
                        from: config.get('Admin.email'),
                        to: currEmail,
                        subject: "Message from Node js",
                        text: `Ваш проверочный код - ${rand_pass}`,
                      })
                    log_data.email =  currEmail
                    await ctx.reply(`Мы отправили письмо с проверочный паролем на вашу почту, введите его(${rand_pass})`);
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
                await ctx.reply('Your email bad')
                await ctx.scene.reenter()
            } else{
                await ctx.reply('Такой email уже существует, для входа введи команду /LOG')
                await email.command('LOG', ctx => ctx.scene.enter('log'));
                await ctx.scene.leave()
            }
        });

        return email
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
                user_data._password = currPass
                user_data._teleId = ctx.message.from.id
                user_data.n = 0
                user_data = withHiddenProps(user_data)
                users.push(user_data); 
                fs.writeFile("../DataBase/users.json", JSON.stringify(users, null, '    '), err => { 
                    // Checking for errors 
                    if (err) throw err;  
                    console.log("Done writing"); // Success 
                });
                await ctx.scene.leave()
            } else{
                await ctx.reply('Your password length < 8')
                await ctx.scene.reenter()
            }
        });
        return password
    }
    logEmail() {
        const log = new Scene('log')
        log.enter(async ctx => ctx.reply('Введи свою почту'))
        log.on('text',async msg => {
            const usrMail = users.filter(i => i.email === msg.message.text)
            if (usrMail.length < 1) {
                await msg.reply('Такого пользователя нет❌, зарегистрируйся используя команду /REG\nили компанду /resend для повторного ввода')
                await msg.scene.leave()
            } else {
                log_data.currData = usrMail
                await msg.scene.enter('logPassword')
            }
        })
        return log;
    }
    logPassword() {
        const logPass = new Scene('logPassword');
        logPass.enter(async ctx => ctx.reply('Введи свой пароль', Markup
        .keyboard(['/forgotPassword'])
        .oneTime()
        .resize()
        .extra()));
        logPass.command('forgotPassword',async msg => {
            await msg.scene.enter('forgot')
        })
        logPass.on('text', async msg => {
            let users = require("../../DataBase/users.json");
            console.log(log_data.currData[0].email)
            const usrPass = users.filter(i => i.password === msg.message.text && i.email === log_data.currData[0].email)
            if (usrPass.length < 1) {
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
        forgot.on('text', msg => {
            console.log(msg)
        })
    
        return forgot
    }
}
module.exports = SceneGen