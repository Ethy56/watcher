const { MessageEmbed } = require("discord.js");

module.exports = async (client, { title = "", description = "", fields = [] }) => {
    var embed = new MessageEmbed();
    if (title != "") {
        embed.setTitle(title);
    }
    if (description != "") {
        embed.setDescription(description);
    }
    if (fields != []) {
        embed.addFields(fields);
    }
    embed.setColor("#00ffff");
    embed.setTimestamp(Date.now());
    embed.setThumbnail(client.user.displayAvatarURL());
    return embed;
};