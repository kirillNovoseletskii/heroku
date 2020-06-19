const Scene = require('telegraf/scenes/base')
const fs = require('fs');
const config = require('config')
const nodemailer = require('nodemailer');
const { Telegraf } = require('telegraf')
const {Extra, Markup, Stage, session} = Telegraf

let user_data = {}
let log_data = {}
let users = require("../DataBase/users.json");

let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        accessToken:'ya29.a0AfH6SMDUZhYtMFx3WhD_VS_OGUwz8sAvmnSiMrNva3e9LUp_4H-FyFnaXfeCK4DeeNreVzahDhUeNRB9fc6ESpmEnChx_tL1K5X4BOVqzsryTw2nBQtYKJ0Z0dPabD7B5pzMhMI58IS3jGLFHWlgsB2_tpEyw3TazX0',
        type: 'OAuth2',
        user: config.get('Admin.email'),
        clientSecret: 'nF0_2UqoR6L8SOyj8kFpqJIK',
        accessUrl: "https://oauth2.googleapis.com/token",
        refreshToken: 
            '1//04JGhz-fRuTfXCgYIARAAGAQSNwF-L9Irg6l94alIr1dcRkcBQ3Rmnlu3LG9F8fcs1iOUVWQciBahQ-ojnygIt6np5Jrvvq-uPOM',
        clientId:
            '671897396582-3266n9ohgifb4bq7mi4fvdtob017np00.apps.googleusercontent.com',
       },
      from: `Mailer Test <${config.get('Admin.email')}>`
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
        let n = 0;
        sender.command('stop',async msg => {
            fs.writeFile("./DataBase/users.json", JSON.stringify(users, null, '    '), err => { 
                // Checking for errors 
                if (err) throw err;  
                console.log("Done writing"); // Success 
            });
            console.log(users.filter(i => i._id === msg.message.from.id))
            await msg.scene.leave()
        })
        sender.enter(async msg => {
            n = users.filter(i => i._id === msg.message.from.id)
            console.log(n)
            if (n < config.get('CURS_DATA.links') && n == 0){
                await msg.reply(config.get('CURS_DATA.links')[n].toString())
                n++
            } else if (n < config.get('CURS_DATA.links')){ 
                setTimeout(async () => {
                    await msg.reply(config.get('CURS_DATA.links')[n])
                    n++
                await msg.scene.reenter()
            }, 1000*60*60*24)
        } else {
            await msg.reply('Вы прошли курс')
        }

            
        })
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
                    await sendEmail(rand_pass, currEmail)
                    log_data.email =  currEmail
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
                user_datateleId = ctx.message.from.id
                user_data.n = 0
                // user_data = withHiddenProps(user_data)
                users.push(user_data); 
                fs.writeFile("./DataBase/users.json", JSON.stringify(users, null, '    '), err => { 
                    // Checking for errors 
                    if (err) throw err;  
                    console.log("Done writing"); // Success 
                });
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
            let users = require("../DataBase/users.json");
            const usrPass = users.filter(i => i._password === msg.message.text && i.email === log_data.currData[0].email)
            console.log(log_data.currData[0].email, usrPass)
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
        const rand_pass  = Math.random().toString(36).slice(-4);
        forgot.enter(msg => {
            msg.reply('Введи свою почту cнова')
        })
        forgot.on('text',async msg => {
            const usrMail = users.filter(i => i.email === msg.message.text)
            if (usrMail.length < 1) {
                await msg.reply('Такого пользователя нет❌, зарегистрируйся используя команду /REG\nили компанду /resend для повторного ввода')
                await msg.scene.leave()
            } else {
                await msg.reply(`Мы отправили пароль тебе на почту\n/LOG для входа`)
                console.log(usrMail[0].email)
                await sendEmail(usrMail[0]._password, usrMail[0].email)   
                await msg.scene.leave()
            }
        })
        return forgot
    }
}
module.exports = SceneGen