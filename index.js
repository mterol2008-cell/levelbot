require('dotenv').config();

const fs = require('fs');
const {
  Client,
  GatewayIntentBits
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ] 
});

const LEVEL_CHANNEL_ID = '1536057096301191168';
const BOOST_CHANNEL_ID = '1536077701935276084';
const DATA_FILE = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/levels.json`
  : './levels.json';

let xpData = {};
const cooldowns = new Map();

if (fs.existsSync(DATA_FILE)) {
  try {
    xpData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    xpData = {};
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(xpData, null, 2));
}

function neededXp(level) {
  return 100 + (level * 50);
}

client.once('clientReady', () => {
  console.log(`${client.user.tag} aktif oldu!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const userId = message.author.id;

  if (!xpData[userId]) {
    xpData[userId] = {
      xp: 0,
      level: 0
    };
  }

  const data = xpData[userId];

  // !level komutu
  if (message.content.toLowerCase() === '!level') {
    const required = neededXp(data.level);

    return message.reply(
      `📊 Levelin: **${data.level}** | XP: **${data.xp}/${required}**`
    );
  }

  // 30 saniyelik XP bekleme süresi
  const now = Date.now();
  const lastXp = cooldowns.get(userId) || 0;

  if (now - lastXp < 30000) return;

  cooldowns.set(userId, now);

  // 5-15 XP arası
  const gainedXp = 150;;

  data.xp += gainedXp;

  const requiredXp = neededXp(data.level);

  if (data.xp >= requiredXp) {
    data.level += 1;
    data.xp -= requiredXp;

    const levelChannel = message.guild.channels.cache.get(LEVEL_CHANNEL_ID);

    if (levelChannel) {
    await levelChannel.send({
        embeds: [{
            color: 0x5865F2,
            title: '🎉 LEVEL ATLADIN!',
            description: `${message.author} tebrikler!\n\n🏆 **Yeni Level: ${data.level}**`,
            thumbnail: {
                url: message.author.displayAvatarURL()
            },
            footer: {
                text: '🔥 Mesaj yazmaya devam et!'
            },
            timestamp: new Date()
        }]
    });
}
  }
  
  saveData();
});


client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const oncekiBoost = oldMember.premiumSince;
  const yeniBoost = newMember.premiumSince;

  if (!oncekiBoost && yeniBoost) {
    const boostChannel = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);
    if (!boostChannel) return;

    try {
      const mesaj = await boostChannel.send(
        `💗 ${newMember} az önce sunucuya takviye yaptı!`
      );

      await mesaj.react('🎀');
    } catch (error) {
      console.error('Boost bildirimi gönderilemedi:', error);
    }
  }
});
client.login(process.env.TOKEN);
