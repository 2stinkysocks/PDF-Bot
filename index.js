const Discord = require('discord.js')
// https://github.com/yakovmeister/pdf2image, MIT licence 
// requires packages `ghostscript` and `graphicsmagick` (i used apt on wsl)
const pdf = require('pdf2pic')

require('dotenv').config()

const client = new Discord.Client({ intents: [
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildWebhooks,
    Discord.GatewayIntentBits.GuildMessageReactions
] })

client.on('ready', () => {
    console.log(`Logged in!`)
})

client.on('messageCreate', async message => {
    if(message.webhookId) return
    if(message.author.bot) return
    if(message.attachments.size === 0) return
    let pdfs = 0
    for(const attachment of message.attachments.values()) {
        if(attachment.contentType === 'application/pdf') {
            pdfs++
        }
    }
    if(pdfs === 0) return
    const question = await message.reply(`This message contains pdfs! Do you want me to automatically convert them to images?`)
    const filter = (reaction, user) => user.id === message.author.id
    const collector = question.createReactionCollector({filter: filter, time: 60000})
    collector.on('collect', async (reaction, user) => {
        if(reaction.emoji.name === '✅') {
            doConversion(message)
        }
        question.delete()
    })
    collector.on('end', (collected, reason) => {
        if(reason === 'time') {
            question.delete()
        }
    })
    question.react('✅')
    question.react('❌')
})

/**
 * @param {Discord.Message} message 
 */
async function doConversion(message) {
    let attachmentCounter = 0
    /** @type {Discord.Attachment[]} */
    let otherAttachments = []
    for(const attachment of message.attachments.values()) {
        if(attachment.contentType === 'application/pdf') {
            const infoMsg = await message.channel.send(`:clock2: Downloading PDF ${attachmentCounter+1}...`)
            const httpResponse = await fetch(attachment.url)
            const pdfBuf = await httpResponse.arrayBuffer() // this is type ArrayBuffer
            await infoMsg.edit(`:clock2: Converting PDF ${attachmentCounter+1} to images...`)
            const imageBufArray = await pdf.fromBuffer(Buffer.from(pdfBuf), {format: 'png', density: 100, quality: 100, preserveAspectRatio: true}).bulk(-1, {responseType: 'buffer'}) // -1 means all pages
            await sendWebhookMessage(message, infoMsg, message.channel, imageBufArray, attachmentCounter)
            await infoMsg.edit(`:white_check_mark: Finished converting PDF ${attachmentCounter+1}!`)
            attachmentCounter++
            setTimeout(() => infoMsg.delete(), 2000)
        } else {
            otherAttachments.push(attachment)
        }
    }
    if(otherAttachments.length === 0) return
    // send remaining attachments (non-pdfs)
    const finalMsg = await message.channel.send(`:clock2: Sending remaining attachments...`)
    const webhook = await getWebhook(message.channel)
    await webhook.send({
        username: message.member.nickname || message.author.username,
        avatarURL: message.author.avatarURL(),
        files: otherAttachments
    })
    await finalMsg.edit(`:white_check_mark: Finished sending remaining attachments!`)
    setTimeout(() => finalMsg.delete(), 2000)
}

/**
 * @param {Discord.Message<boolean>} message
 * @param {Discord.Message<boolean>} infoMsg
 * @param {Discord.TextChannel} channel
 * @param {BufferResponse[]} imageBuffers
 * @param {number} attachmentCounter
 */
async function sendWebhookMessage(message, infoMsg, channel, imageBuffers, attachmentCounter) {
    const webhook = await getWebhook(channel)
    let counter = 1
    let images = []
    let imageSet = 0
    const imageCount = imageBuffers.length
    await infoMsg.edit(`:clock2: Processing ${imageCount} images for PDF ${attachmentCounter+1}...`)
    for(const imageBuffer of imageBuffers) {
        const imageAttachment = new Discord.AttachmentBuilder(imageBuffer.buffer, {name: `image${counter}.png`})
        images.push(imageAttachment)
        if(counter === 10 || counter == imageCount % 10) {
            await webhook.send({
                content: attachmentCounter == 0 && imageSet == 0 ? message.content : undefined,
                username: message.member.nickname || message.author.username,
                avatarURL: message.author.avatarURL(),
                files: images
            })
            counter = 1
            images = []
            imageSet++
        } else {
            counter++
        }
    }
}

/**
 * @param {Discord.TextChannel} channel 
 * @returns {Discord.Webhook}
 */
async function getWebhook(channel) {
    const webhooks = await channel.fetchWebhooks()
    /** @type {Discord.Webhook} */
    let webhook = null 
    if(webhooks.size === 0) {
        webhook = await channel.createWebhook({
            name: 'PDF Bot',
            avatar: client.user.avatarURL(),
        })
    } else {
        webhook = webhooks.first()
    }
    return webhook
}

client.login(process.env.TOKEN)