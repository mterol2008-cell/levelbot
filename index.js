require('dotenv').config();

const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  AttachmentBuilder
} = require('discord.js');

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { GlobalFonts } = require('@napi-rs/canvas');

console.log('Fontlar:', GlobalFonts.families);
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

  const width = 500;
  const height = 180;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Arka plan
  ctx.fillStyle = '#18181f';
  ctx.fillRect(0, 0, width, height);

  // Kullanıcı profil fotoğrafı
  const avatar = await loadImage(
    message.author.displayAvatarURL({ extension: 'png', size: 256 })
  );

  ctx.save();
  ctx.beginPath();
  ctx.arc(75, 75, 50, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 25, 25, 100, 100);
  ctx.restore();

  // Kullanıcı adı
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(message.author.username, 145, 55);

  // Level
  ctx.fillStyle = '#b9bbbe';
  ctx.font = '18px Arial';
  ctx.fillText(`Level ${data.level}`, 145, 85);

  // XP bar arka planı
  ctx.fillStyle = '#303038';
  ctx.beginPath();
  ctx.roundRect(145, 105, 310, 22, 11);
  ctx.fill();

  // XP yüzdesi
  const progress = Math.min(data.xp / required, 1);

  // Mor XP bar
  if (progress > 0) {
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.roundRect(145, 105, 310 * progress, 22, 11);
    ctx.fill();
  }

  // XP yazısı
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText(`${data.xp} / ${required} XP`, 145, 155);

  const attachment = new AttachmentBuilder(
    canvas.toBuffer('image/png'),
    { name: 'level.png' }
  );

  return message.reply({
    files: [attachment]
  });
}

  // 30 saniyelik XP bekleme süresi
  const now = Date.now();
  const lastXp = cooldowns.get(userId) || 0;

  if (now - lastXp < 30000) return;

  cooldowns.set(userId, now);

  // 5-15 XP arası
  const gainedXp = Math.floor(Math.random() * 11) + 5;

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
