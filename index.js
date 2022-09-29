const Discord = require("discord.js");
const { EmbedBuilder, time } = require("discord.js");

const defEmojiList = [
  "\u0031\u20E3",
  "\u0032\u20E3",
  "\u0033\u20E3",
  "\u0034\u20E3",
  "\u0035\u20E3",
  "\u0036\u20E3",
  "\u0037\u20E3",
  "\u0038\u20E3",
  "\u0039\u20E3",
  "\uD83D\uDD1F",
];

class DiscordPolls {
  /**
   *
   * @param {Discord.interaction} interaction - Discord interaction
   * @param {String} title - The poll's title
   * @param {Array} choices - An Array of the poll's choices
   * @param {Number} duration - The poll's duration
   * @param {String} embedColor - The poll's embed color.
   * @param {Array} emojiList - An Array of the poll's corresponding choices' emojis
   * @param {String} forceEndPollEmoji - The poll's force-end emoji
   * @returns
   */
  static async startPoll(
    interaction,
    title,
    choices,
    duration = 30,
    embedColor,
    emojiList = defEmojiList.slice(),
    forceEndPollEmoji = "🛑"
  ) {
    // Error Embed Builder
    const embedBuilderError = (error) =>
      new EmbedBuilder().setColor("Red").setDescription(`**❌ - ${error}**`);

    // Validation
    if (!interaction && !interaction.channel)
      return interaction.reply({
        embeds: [embedBuilderError("Channel is inaccessible.")],
        ephemeral: true,
      });
    if (!title || typeof title !== "string")
      return interaction.reply({
        embeds: [
          embedBuilderError("Poll title is not given or invalid title."),
        ],
        ephemeral: true,
      });
    if (!choices || typeof choices !== "object")
      return interaction.reply({
        embeds: [
          embedBuilderError("Poll choices are not given or invalid choices."),
        ],
        ephemeral: true,
      });
    if (choices.length < 2)
      return interaction.reply({
        embeds: [embedBuilderError("Please provide more than one choice.")],
        ephemeral: true,
      });
    if (choices.length > emojiList.length)
      return interaction.reply({
        embeds: [
          embedBuilderError(`The provided choices are more than the emojis.`),
        ],
        ephemeral: true,
      });
    if (typeof duration !== "number")
      return interaction.reply({
        embeds: [embedBuilderError(`Invalid number.`)],
        ephemeral: true,
      });
    !embedColor ? (embedColor = "#202225") : embedColor;
    if (!embedColor.startsWith("#"))
      return interaction.reply({
        embeds: [
          embedBuilderError(
            "Embed color only accepts colors in the hex format: `#000000`"
          ),
        ],
        ephemeral: true,
      });
    if (embedColor.length !== 7 && embedColor.length !== 4)
      return interaction.reply({
        embeds: [embedBuilderError("Invalid color.")],
        ephemeral: true,
      });

    // Duration in Discord's Epoch Timestamp
    const durationInMilliseconds = duration * 1000;
    const date = new Date(new Date().getTime() + durationInMilliseconds);
    const relative = time(date, "R");

    let text = `*To vote, react using the correspoding emoji.\nThe voting will end **${relative}**.\nPoll creater can end the poll **forcefully** by reacting to ${forceEndPollEmoji} emoji.*\n\n`;
    const emojiInfo = {};
    choices.forEach((choice) => {
      const emoji = emojiList.splice(0, 1);
      emojiInfo[emoji] = { option: choice, votes: 0 };
      text += `${emoji} : \`${choice}\`\n\n`;
    });

    const usedEmojis = Object.keys(emojiInfo);
    usedEmojis.push(forceEndPollEmoji);

    const embed = new EmbedBuilder()
      .setTitle(`Poll - ${title}`)
      .setColor(embedColor)
      .setDescription(text)
      .setFooter({
        text: `Poll created by ${interaction.user.tag} | ID: ${interaction.id}`,
      });

    const poll = await interaction.reply({ embeds: [embed], fetchReply: true });
    usedEmojis.forEach((emoji) => poll.react(emoji));

    const filter = (reaction, user) =>
      usedEmojis.includes(reaction.emoji.name) && !user.bot;
    const reactionCollector = poll.createReactionCollector({
      filter,
      time: duration * 1000,
    });

    const voterInfo = new Map();

    // When the user votes
    reactionCollector.on("collect", (reaction, user) => {
      if (usedEmojis.includes(reaction.emoji.name)) {
        if (
          reaction.emoji.name === forceEndPollEmoji &&
          interaction.user.id === user.id
        ) {
          return reactionCollector.stop();
        }

        // Add the new voter's info into the voterInfo Map
        if (!voterInfo.has(user.id)) {
          voterInfo.set(user.id, { emoji: reaction.emoji.name });
        }

        // Change an existing voter's info
        const votedEmoji = voterInfo.get(user.id).emoji;
        if (votedEmoji !== reaction.emoji.name) {
          const lastVote = poll.reactions.cache.get(votedEmoji);
          lastVote.count -= 1; // Remove 1 point from the reaction
          lastVote.users.remove(user.id); // Remove the user from the reaction
          emojiInfo[votedEmoji].votes -= 1; // Remove 1 vote from the emojiInfo Object
          voterInfo.set(user.id, { emoji: reaction.emoji.name }); // Change the voter's info in the voterInfo Map
        }

        emojiInfo[reaction.emoji.name].votes += 1; // Add 1 vote to the reacted reaction
      }
    });

    // When the user unvotes
    reactionCollector.on("dispose", (reaction, user) => {
      if (usedEmojis.includes(reaction.emoji.name)) {
        voterInfo.delete(user.id); // Remove the voter's info from the voterInfo Map

        emojiInfo[reaction.emoji.name].votes -= 1; // Remove 1 vote from the reacted reaction
      }
    });

    // When the voting time ends
    reactionCollector.on("end", async () => {
      text = "*Time's up! Results are in!*\n**WINNER:** ";

      await poll.delete(); // Delete the poll message
      const embed = new EmbedBuilder()
        .setTitle(`Poll - ${title}`)
        .setColor(embedColor)
        .setFooter({
          text: `Poll created by ${interaction.user.tag} | ID: ${interaction.id}`,
        });

      const votes = [];
      // Add the poll's result to the embed's fields
      for (const emoji in emojiInfo) {
        votes.push(emojiInfo[emoji].votes);
        if (emojiInfo[emoji].votes === 1) {
          embed.addFields([
            {
              name: emojiInfo[emoji].option,
              value: `\`${emojiInfo[emoji].votes} vote\``,
              inline: true,
            },
          ]);
        } else if (emojiInfo[emoji].votes !== 1) {
          embed.addFields([
            {
              name: emojiInfo[emoji].option,
              value: `\`${emojiInfo[emoji].votes} votes\``,
              inline: true,
            },
          ]);
        }
      }

      embed.setDescription(
        (text += Object.values(emojiInfo).filter(
          (emoji) => emoji.votes === Math.max(...votes)
        )[0].option)
      );

      await interaction.channel.send({ embeds: [embed] }); // Send a new message with the poll's results
    });
  }
}

module.exports = DiscordPolls;
