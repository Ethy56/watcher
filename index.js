require("dotenv").config();
const Discord = require("discord.js");
const ms = require("ms");
const fs = require("fs");

const intents = new Discord.Intents();
for (var intent of Object.keys(Discord.Intents.FLAGS)) {
    if (intent.includes("GUILD")) {
        intents.add(intent);
    }
}

const client = new Discord.Client({ intents });
client.commands = new Discord.Collection();
client.db = new (require("exact.db"))("data.json");

var builders = [];
var coms = fs.readdirSync("./commands").filter(file=>file.endsWith(".js"));
for (var file of coms) {
    var req = require(`./commands/${file}`);
    builders.push(req.builder.toJSON());
    client.commands.set(req.name, req);
}

// only need this once (require("./utils/slash.js"))(builders, process.env.token, process.env.id);

client.on("ready", () => {
    var users = client.db.get("watched");
    var guild = client.guilds.cache.get(client.db.get("guild"));
    users.forEach(async user => {
        await guild.members.fetch(user.id);
    });
    console.log(client.user.tag + " ready!");
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    var command = client.commands.get(interaction.commandName);
    if (command) {
        await interaction.deferReply({ ephemeral: true });
        command.callback(client, interaction);
    } else {
        await interaction.reply({ ephemeral: true, content: "Unrecognized command." });
    }
});

function isOffline(member) {
    return member ? member.status === "offline" : false;
}

client.on("presenceUpdate", async(oldmember, newmember) => {
    if (!client.db.get("isEnabled")) return;
    if (client.db.get("watched").filter(item=>item.id===newmember.user.id).length === 0) return;
    var held = client.db.get("watched");
    var user = held.filter(item=>item.id===newmember.user.id)[0];
    var channel = await newmember.guild.channels.fetch(client.db.get("channel"));
    if (isOffline(newmember) || isOffline(oldmember)) {
        if (isOffline(newmember)) {
            var timedifference = Date.now() - Number(user.timestamp);
            var dif = ms(timedifference, {long: true}), startdate = (new Date(user.timestamp)).toLocaleString();
            var fields = [
                {name: "User", value: `\`${newmember.user.tag}\``, inline: true},
                {name: "ID", value: `\`${newmember.user.id}\``, inline: true},
                {name: "Duration", value: `\`${dif}\``, inline:true},
                {name: "Timestamp", value: `\`${startdate}\``, inline:true}
            ]
            var embed =  await (require("./utils/defaultEmbed.js"))(client, {
                title: "Offline Notification",
                fields
            });
            channel.send({ embeds: [embed] });
        } else if (isOffline(oldmember)) {
            var fields = [
                {name: "User", value: `\`${newmember.user.tag}\``, inline: true},
                {name: "ID", value: `\`${newmember.user.id}\``, inline: true}
            ]
            var embed =  await (require("./utils/defaultEmbed.js"))(client, {
                title: "Online Notification",
                fields
            });
            channel.send({ embeds: [embed] });
        }
    }
});

client.login(process.env.token);