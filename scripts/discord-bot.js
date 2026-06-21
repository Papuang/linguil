import { 
  Client, GatewayIntentBits, Partials, SlashCommandBuilder, 
  PermissionFlagsBits, ChannelType, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle 
} from 'discord.js';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN in environment variables.");
  process.exit(1);
}

// Save server preferences in a local JSON file so they survive bot restarts.
const CONFIG_FILE = path.resolve('./server-configs.json');
let serverConfigs = {};

if (fs.existsSync(CONFIG_FILE)) {
  serverConfigs = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} else {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({}));
}

function saveConfig(guildId, channelId) {
  serverConfigs[guildId] = channelId;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(serverConfigs, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// In-memory store. Key: guildId, Value: Map<userId, { userId, username, score, total, bear }>.
const guildScores = new Map();

const linguilRegex = /linguil\s+\|\s+\d{2}\/\d{2}\/\d{2}[\s\S]*?(\d+)\/(\d+)\s+\|\s+(.*?)(?=\n|$)/;

// Generate leaderboard text.
function buildLeaderboardText(guildId) {
  const serverMap = guildScores.get(guildId);
  
  if (!serverMap || serverMap.size === 0) {
    return "No one shared a linguil score today! ʕノ•ᴥ•ʔノ ︵ ┻━┻";
  }

  // Convert Map to Array.
  const allScores = Array.from(serverMap.values());

  // Group by score (handles ties).
  const groupedScores = allScores.reduce((acc, curr) => {
    if (!acc[curr.score]) acc[curr.score] = [];
    acc[curr.score].push(curr);
    return acc;
  }, {});

  // Sort unique scores descending.
  const sortedScoreKeys = Object.keys(groupedScores).map(Number).sort((a, b) => b - a);

  let leaderboardText = "<:linguil:1473408144259678444> **linguil leaderboard**\n\n";
  const medals = ["🥇", "🥈", "🥉"];

  sortedScoreKeys.forEach((score, index) => {
    const players = groupedScores[score];
    const rank = index < 3 ? medals[index] : `${index + 1}.`;
    const playerNames = players.map(p => `<@${p.userId}>`).join(', ');
    
    const bear = players[0].bear;
    const total = players[0].total;

    leaderboardText += `${rank} ${playerNames} • ${score}/${total} | ${bear}\n`;
  });

  return leaderboardText;
}

// Generate play button.
function getPlayButtonRow() {
  const playButton = new ButtonBuilder()
    .setLabel('Play linguil')
    .setEmoji('1473408144259678444')
    .setStyle(ButtonStyle.Primary)
    .setCustomId('play_linguil_btn'); 

  return new ActionRowBuilder().addComponents(playButton);
}

client.once('clientReady', async () => {
  console.log(`linguil bot is online as ${client.user.tag}`);

  // 1. Register the slash commands globally.
  const setChannelCmd = new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set the channel where the bot will listen for and post linguil scores.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Only admins can use this.
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to use')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    );

  const leaderboardCmd = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the current daily linguil leaderboard for this server.');

  try {
    await client.application.commands.create(setChannelCmd);
    await client.application.commands.create(leaderboardCmd);
    console.log('Global slash commands registered.');
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }

  // 2. Schedule the leaderboard to post every day at midnight UTC.
  cron.schedule('0 0 * * *', () => {
    postLeaderboardsToAllServers();
  }, { timezone: "UTC" });
});

// Handle the slash commands and button interactions.
client.on('interactionCreate', async (interaction) => {
  // Intercept the button click before the chat command check.
  if (interaction.isButton() && interaction.customId === 'play_linguil_btn') {
    try {
      // Respond to the button click by launching the Discord Activity.
      await interaction.launchActivity();
    } catch (err) {
      console.error("Failed to launch activity:", err);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setchannel') {
    const selectedChannel = interaction.options.getChannel('channel');
    
    // Save to our local JSON file.
    saveConfig(interaction.guildId, selectedChannel.id);

    await interaction.reply({ 
      content: `Setup complete! I will now track scores and post the daily leaderboard in <#${selectedChannel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (interaction.commandName === 'leaderboard') {
    const configuredChannelId = serverConfigs[interaction.guildId];
    if (!configuredChannelId) {
      return interaction.reply({ 
        content: "An admin hasn't set up the tracking channel yet! Tell them to run `/setchannel`.", 
        flags: MessageFlags.Ephemeral 
      });
    }

    const text = buildLeaderboardText(interaction.guildId);
    
    // Play button.
    await interaction.reply({ content: text, components: [getPlayButtonRow()] });
  }
});

// Listen for scores.
client.on('messageCreate', async (message) => {
  // Ignore bots and DMs.
  if (message.author.bot || !message.guildId) return;

  // Check if this server has configured a channel.
  const configuredChannelId = serverConfigs[message.guildId];
  if (!configuredChannelId || message.channel.id !== configuredChannelId) return;

  const match = message.content.match(linguilRegex);
  
  if (match) {
    const score = parseInt(match[1], 10);

    // Scores must be 0, 1, 2, or 3.
    if (score < 0 || score > 3) {
      return;
    }
    
    const total = parseInt(match[2], 10);
    const bear = match[3].trim();

    // Ensure a Map exists for this specific server.
    if (!guildScores.has(message.guildId)) {
      guildScores.set(message.guildId, new Map());
    }

    // Store the user's first score of the day for this server.
    const serverMap = guildScores.get(message.guildId);
    if (!serverMap.has(message.author.id)) {
      serverMap.set(message.author.id, {
        userId: message.author.id,
        username: message.author.displayName || message.author.username,
        score: score,
        total: total,
        bear: bear
      });

      try {
        await message.react('🐻'); 
      } catch (err) {
        console.error("Failed to react. Ensure bot has 'Add Reactions' permission.");
      }
    }
  }
});

async function postLeaderboardsToAllServers() {
  // Loop through every server that has configured the bot.
  for (const [guildId, channelId] of Object.entries(serverConfigs)) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) continue;

      const text = buildLeaderboardText(guildId);
      
      // Play button.
      await channel.send({ content: text, components: [getPlayButtonRow()] });

    } catch (error) {
      console.error(`Failed to post leaderboard to guild ${guildId}:`, error);
    }
  }

  // Clear memory for all servers for the next day.
  guildScores.clear();
}

client.login(TOKEN);