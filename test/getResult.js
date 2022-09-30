const { Discord } = require("discord.js");
const Poll = require("discord-polls");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("get-result")
    .setDescription("Gets the result of a poll")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("The ID of the poll message")
        .setRequired(true)
    ),
  async execute(interaction) {
    // Get the id input value
    const messageId = interaction.options.getString("id");

    // call the getResult method
    Polls.getResult(messageId, interaction);
  },
};
