# PDF Bot

A simple discord bot written in `discord.js` that automatically converts pdfs sent in discord to images seamlessly.

## Usage

Send a message with a PDF attachment in any channel, and the bot will ask for confirmation to convert it (supports any number of attachments).

The bot will download, convert, and reupload the converted images (and other non-pdf attachments), along with the original message to the same channel using a webhook with the user's name and profile picture. 

## Installation

1. Clone the repository
2. Install `npm` and `node` on your system
3. Install packages with `npm i`
4. [Install required dependencies for pdf conversion](https://github.com/yakovmeister/pdf2image/blob/HEAD/docs/gm-installation.md)
5. Create a bot through discord, and enable the `Server Members` and `Message Content` intents
6. Copy the bot token, then create a file `.env` with the format:
```
TOKEN=discord.bot.token.here
```
7. Run `node index.js` to start the bot

<hr>

*Created for SoDA*