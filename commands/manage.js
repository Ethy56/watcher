const { SlashCommandBuilder } = require("@discordjs/builders");
const Discord = require("discord.js");

module.exports = {
    builder: new SlashCommandBuilder()
        .setName("manage")
        .setDescription("Manage the Watcher"),
    name: "manage",
    callback: async (client, interaction) => {
        // { name, value, inline }
        // user -> { tag, id, timestamp }
        var fields = [], changes = false;
        var mapped = client.db.get("watched").map(user=>user.tag).join(", ");
        var parms = [["`Enabled`", client.db.get("isEnabled") === true ? "<:Toggle_on:957308926322430032>" : "<:Toggle_OFF:957309046866726952>"], ["`Users`", mapped !== "" ? "```" + mapped + "```" : "`None`"]];
        parms.push(["`Log Channel`", `<#${client.db.get("channel")}>`]);
        parms.forEach(parm=>{
            fields.push({name: parm[0], value: parm[1], inline: true});
        });
        var defaultEmbed = await (require("../utils/defaultEmbed.js"))(client, {
            title: "Manage Watcher",
            description: "Configure with the buttons below",
            fields
        });
        var row = new Discord.MessageActionRow();
        var enabled = new Discord.MessageButton({
            label: "Toggle " + (client.db.get("isEnabled") === true ? "off" : "on"),
            customId: "toggle-enable",
            style: "PRIMARY"
        });
        var editUserButton = new Discord.MessageButton({
            label: "Edit Watched Accounts",
            customId: "edit-user",
            style: "PRIMARY"
        });
        var channelButton = new Discord.MessageButton({
            label: "Edit Log Channel",
            customId: "edit-channel",
            style: "PRIMARY"
        });
        var closebtn = new Discord.MessageButton({
            label: "Close Manager",
            customId: "close",
            style: "DANGER"
        });
        var comps = [enabled, editUserButton, channelButton, closebtn];
        row.setComponents(comps);
        await interaction.editReply({ embeds: [defaultEmbed], components: [row] });
        const filter = interaction => ["toggle-enable","edit-user","edit-channel","close"].includes(interaction.customId) && interaction.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
        collector.on('collect', async (inter) => {
            if (inter.customId === "close") {
                collector.stop();
                defaultEmbed.setFields([]);
                defaultEmbed.setDescription("Put" + (changes ? " ": " No ") + "Changes.");
                await interaction.editReply({ embeds: [defaultEmbed], components: [] });
            } else if (inter.customId === "edit-channel") {
                defaultEmbed.setFields([]);
                defaultEmbed.setDescription("Mention a channel to send logs to");
                await interaction.editReply({ embeds: [defaultEmbed], components: [] });
                var newcol = interaction.channel.createMessageCollector({ filter: (m) => m.author.id === interaction.user.id, time: 15_000, max: 1 });
                newcol.on("collect", async (m)=>{
                    if (!m.mentions.channels.first()) {
                        defaultEmbed.setDescription("Error, invalid message recieved.");
                        newcol.stop();
                        collector.stop();
                        await interaction.editReply({ embeds: [defaultEmbed] });
                        return;
                    }
                    var { id } = m.mentions.channels.first();
                    client.db.set("channel", id);
                    changes = true;
                    fields[2].value = `<#${id}>`;
                    defaultEmbed.setFields(fields);
                    defaultEmbed.setDescription("Logs Channel set to <#" + id + ">");
                    m.delete();
                    await interaction.editReply({ embeds: [defaultEmbed], components: [row] });
                });
            } else if (inter.customId == "toggle-enable") {
                client.db.set("isEnabled", !client.db.get("isEnabled"));
                changes = true;
                enabled = new Discord.MessageButton({
                    label: "Toggle " + (client.db.get("isEnabled") === true ? "off" : "on"),
                    customId: "toggle-enable",
                    style: "PRIMARY"
                });
                comps[0] = enabled;
                row.setComponents(comps);
                fields[0].value = client.db.get("isEnabled") === true ? "<:Toggle_on:957308926322430032>" : "<:Toggle_OFF:957309046866726952>";
                defaultEmbed.setFields(fields);
                await interaction.editReply({ embeds: [defaultEmbed], components: [row] });
            } else if (inter.customId == "edit-user") {
                defaultEmbed.setFields([fields[1], {name: "Use one of the following to add or remove a user", value: "```-add <userid>\n-remove <userid>```"}]);
                await interaction.editReply({ embeds: [defaultEmbed], components: [] });
                var newcol = interaction.channel.createMessageCollector({ filter: (m) => m.author.id === interaction.user.id, time: 15_000, max: 1 });
                newcol.on("collect", async (m) => {
                    if (!m.content.startsWith("-add") && !m.content.startsWith("-remove")) {
                        defaultEmbed.setDescription("Error, invalid message recieved.");
                        newcol.stop();
                        collector.stop();
                        await interaction.editReply({ embeds: [defaultEmbed] });
                        return;
                    } else if (m.content.startsWith("-add")) {
                        var args = m.content.split(/ +/);
                        if (!args[1]) {
                            collector.stop();
                            defaultEmbed.setFields([]);
                            defaultEmbed.setDescription("Error, no userid provided");
                            await interaction.editReply({ embeds: [defaultEmbed] });
                            return;
                        } else {
                            var current = client.db.get("watched");
                            var guild = client.guilds.cache.get(client.db.get("guild"));
                            var topush = await guild.members.fetch(args[1]);
                            var isoff = topush.presence === null ? true : false;
                            var items = {tag: topush.user.tag, id: topush.id, status: isoff ? "offline" : topush.presence.status, timestamp: Date.now()};
                            m.delete();
                            current.push(items);
                            console.log(current);
                            changes = true;
                            client.db.set("watched", current);
                            mapped = current.map(user=>user.tag).join(", ");
                            fields[1].value = mapped !== "" ? "```" + mapped + "```" : "`None`";
                            defaultEmbed.setFields(fields);
                            defaultEmbed.setDescription("Added " + args[1]);
                            await interaction.editReply({ embeds: [defaultEmbed], components: [row] });
                        }
                    } else if (m.content.startsWith("-remove")) {
                        var args = m.content.split(/ +/);
                        if (!args[1]) {
                            collector.stop();
                            defaultEmbed.setFields([]);
                            defaultEmbed.setDescription("Error, no userid provided");
                            await interaction.editReply({ embeds: [defaultEmbed] });
                            return;
                        } else {
                            var current = client.db.get("watched");
                            var tosearch = await interaction.guild.members.fetch(args[1]);
                            if (current.filter(item => item.id===tosearch.id).length === 0) {
                                defaultEmbed.setDescription("Cannot find " + args[1]);
                                defaultEmbed.setFields([]);
                                await interaction.editReply({ embeds: [defaultEmbed], components: [row]});
                                collector.stop();
                                return;
                            } else {
                                var newarr = [];
                                current.forEach(item=>{
                                    if (item.id !== items.id) newarr.push(item);
                                });
                                current = newarr;
                                changes = true;
                                m.delete();
                                client.db.set("watched", current);
                                defaultEmbed.setDescription("Removed " + args[1]);
                                mapped = current.map(user=>user.tag).join(", ");
                                fields[1].value = mapped !== "" ? "```" + mapped + "```" : "`None`";
                                defaultEmbed.setFields(fields);
                                await interaction.editReply({ embeds: [defaultEmbed], components: [row] });
                            }
                        }
                    }
                });
            }
        });
    }
}