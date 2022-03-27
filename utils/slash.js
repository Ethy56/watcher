const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

module.exports = async (commands, token, id) => {
    var rest = new REST({ version: '9' }).setToken(token);
    await rest.put(
        Routes.applicationCommands(id),
        { body: commands }
    );
}