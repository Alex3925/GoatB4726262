const fs = require('fs');
const axios = require('axios');

module.exports = {
    config: {
        name: "spotify",
        version: "4.6",
        author: "Alex",  //fixed by Alex orig source by Aryan
        countDown: 10,
        role: 0,
        shortDescription: { en: 'Search and download music from Spotify' },
        longDescription: { en: "Search for music on Spotify and download your favorite tracks with detailed information." },
        category: "music",
        guide: { 
            en: '{p}s <song name> - Search for a song on Spotify\n'
                + 'After receiving the search results, reply with the song ID to download the track.\n'
                + 'Example:\n'
                + '  {p}spotify Blinding Lights\n'
                + '  Reply with "1 to 10" for download the first track in the list.'
        }
    },

    onStart: async function ({ api, event, args }) {
        const listensearch = encodeURIComponent(args.join(" "));
        const apiUrl = `https://deku-rest-api.gleeze.com/spotify?q=${listensearch}`;
        
        if (!listensearch) {
            return api.sendMessage("Please provide the name of the song you want to search.", event.threadID, event.messageID);
        }

        try {
            api.sendMessage("Ã°Å¸Å½Âµ | Searching music on Spotify. Please wait...", event.threadID, event.messageID);
            const response = await axios.get(apiUrl);
            const tracks = response.data;

            if (tracks.length > 0) {
                const topTracks = tracks.slice(0, 10);
                let message = "Ã°Å¸Å½Â¶ Ã°Ââ€”Â¦Ã°Ââ€”Â½Ã°Ââ€”Â¼Ã°ÂËœÂÃ°Ââ€”Â¶Ã°Ââ€”Â³Ã°ÂËœâ€ \n\nÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€Â\nÃ°Å¸Å½Â¶ | Here is the top 10 Tracks\n\n";
                
                topTracks.forEach((track, index) => {
                    message += `Ã°Å¸â€ â€ ID: ${index + 1}\n`;
                    message += `Ã°Å¸â€œÂ Title: ${track.name}\n`;
                    message += `Ã°Å¸â€œâ€¦ Release Date: ${track.release_date}\n`;
                    message += `Ã¢ÂÂ±Ã¯Â¸Â Duration: ${formatDuration(track.duration_ms)}\n`;
                    message += `Ã°Å¸â€œâ‚¬ Album: ${track.album}\n`;
                    message += `Ã°Å¸Å½Â§ Preview URL: ${track.preview_url}\n`;
                    message += `Ã¢Å¡â„¢Ã¯Â¸Â URL: ${track.external_url}\n`;
                    message += "Ã¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€ÂÃ¢â€Â\n"; // Separator between tracks
                });

                message += "\nReply with the number of the song ID you want to download.";
                api.sendMessage(message, event.threadID, (err, info) => {
                    if (err) return console.error(err);
                    global.GoatBot.onReply.set(info.messageID, { commandName: this.config.name, messageID: info.messageID, author: event.senderID, tracks: topTracks });
                });
            } else {
                api.sendMessage("Ã¢Ââ€œ | Sorry, couldn't find the requested music on Spotify.", event.threadID);
            }
        } catch (error) {
            console.error(error);
            api.sendMessage("Ã°Å¸Å¡Â§ | An error occurred while processing your request.", event.threadID);
        }
    },

    onReply: async function ({ api, event, Reply, args, message }) {
        const reply = parseInt(args[0]);
        const { author, tracks } = Reply;

        if (event.senderID !== author) return;

        try {
            if (isNaN(reply) || reply < 1 || reply > tracks.length) {
                throw new Error("Invalid selection. Please reply with a number corresponding to the track.");
            }

            const selectedTrack = tracks[reply - 1];
            const downloadUrl = selectedTrack.external_url;
            const downloadApiUrl = `https://deku-rest-api.gleeze.com/download?q=${encodeURIComponent(downloadUrl)}`;

// Send waiting message and react to it
            api.sendMessage("Ã¢ÂÂ³ | Downloading your song request. Please wait.....", event.threadID, (err, info) => {
                if (err) return console.error(err);

                // React to the waiting message with a waiting emoji
                api.setMessageReaction("â³", info.messageID);

                (async () => {
                    try {
                        // First API call to get the download link
                        const downloadLinkResponse = await axios.get(downloadApiUrl);
                        const downloadLink = downloadLinkResponse.data;

                        // Now download the actual audio file using the obtained link
                        const filePath = `${__dirname}/cache/${Date.now()}.mp3`;
                        const writeStream = fs.createWriteStream(filePath);
                        const audioResponse = await axios.get(downloadLink, { responseType: 'stream' });

                        audioResponse.data.pipe(writeStream);

                        writeStream.on('finish', () => {
                            // React with checkmark emoji to indicate download completion
                            api.setMessageReaction("âœ”ï¸", info.messageID);

                            // Send detailed message with attachment
                            api.sendMessage({
                                body: `ðŸŽ¶ ðŸŽµï¸ Your music ${selectedTrack.name} from Spotify is ready! ðŸŽµï¸\n\nEnjoy listening!\n\nðŸ“ Title: ${selectedTrack.name}\nðŸ‘‘ Artist: ${selectedTrack.artists}\nðŸ“† Release Date: ${selectedTrack.release_date}\nâ±ï¸ Duration: ${formatDuration(selectedTrack.duration_ms)}`,
                                attachment: fs.createReadStream(filePath)
                            }, event.threadID, (err, info) => {
                                if (err) return console.error(err);
                                fs.unlinkSync(filePath); // Remove the temporary file
                            });
                        });
                    } catch (error) {
                        console.error(error);
                        api.sendMessage("ðŸš§ | An error occurred while downloading your song request.", event.threadID);
                    }
                })();
            });
        } catch (error) {
            console.error(error);
            api.sendMessage("ðŸš§ | An error occurred while processing your request.", event.threadID);
        }
    }
};
