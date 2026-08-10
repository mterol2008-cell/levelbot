require('dotenv').config();

const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  AttachmentBuilder
} = require('discord.js');

const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const fontPath = path.join(__dirname, 'Roboto-VariableFont_wdth,wght.ttf');
const fontLoaded = GlobalFonts.registerFromPath(fontPath, 'Roboto');

console.log('Font yolu:', fontPath);
console.log('Font yüklendi mi:', fontLoaded);
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
const BOOST_EMOJI = '<:boost:1414631701589790761>';
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
 // !level komutu - gelişmiş mor kart
if (message.content.toLowerCase() === '!level') {
  const required = neededXp(data.level);

  // Rank hesaplama
  const ranking = Object.entries(xpData)
    .sort((a, b) => {
      if (b[1].level !== a[1].level) {
        return b[1].level - a[1].level;
      }
      return b[1].xp - a[1].xp;
    });

  const rankIndex = ranking.findIndex(([id]) => id === userId);
  const rank = rankIndex + 1;
  const totalUsers = ranking.length;
  const topPercent = Math.max(1, Math.ceil((rank / totalUsers) * 100));

  const width = 720;
  const height = 200;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Arka plan
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#171225');
  bg.addColorStop(0.5, '#121321');
  bg.addColorStop(1, '#10131d');

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 18);
  ctx.fill();

  // Mor kenarlık
  ctx.strokeStyle = '#4f2b7a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, width - 2, height - 2, 18);
  ctx.stroke();

  // Profil fotoğrafı
  const avatar = await loadImage(
    message.author.displayAvatarURL({
      extension: 'png',
      size: 256
    })
  );

  // Profil mor dış çember
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.arc(90, 95, 59, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Profil fotoğrafını yuvarlak yap
  ctx.save();
  ctx.beginPath();
  ctx.arc(90, 95, 55, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatar, 35, 40, 110, 110);
  ctx.restore();

  // LVL rozeti
  ctx.fillStyle = '#21172f';
  ctx.strokeStyle = '#a66cff';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(137, 137, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Roboto"';
  ctx.textAlign = 'center';
  ctx.fillText('LVL', 137, 134);

  ctx.font = 'bold 15px "Roboto"';
  ctx.fillText(`${data.level}`, 137, 150);

  ctx.textAlign = 'left';

  // Kullanıcı adı
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 27px "Roboto"';
  ctx.fillText(message.author.username, 180, 63);

  // Level
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 20px "Roboto"';
  ctx.fillText(`Level ${data.level}`, 180, 98);

  // XP bar arka plan
  ctx.fillStyle = '#292b38';
  ctx.beginPath();
  ctx.roundRect(180, 116, 300, 25, 13);
  ctx.fill();

  // XP oranı
  const progress = Math.min(data.xp / required, 1);

  // Mor XP bar
  if (progress > 0) {
    const xpGradient = ctx.createLinearGradient(180, 0, 480, 0);
    xpGradient.addColorStop(0, '#7c3aed');
    xpGradient.addColorStop(1, '#9333ea');

    ctx.fillStyle = xpGradient;
    ctx.beginPath();
    ctx.roundRect(180, 116, 300 * progress, 25, 13);
    ctx.fill();
  }

  // XP yazısı
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 18px "Roboto"';
  ctx.fillText(`${data.xp}`, 180, 170);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(` / ${required} XP`, 180 + ctx.measureText(`${data.xp}`).width, 170);

  // Sağdaki ayırıcı çizgi
  ctx.strokeStyle = '#292637';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(520, 30);
  ctx.lineTo(520, 170);
  ctx.stroke();

  // RANK
  ctx.textAlign = 'center';

  ctx.fillStyle = '#8f8b9d';
  ctx.font = 'bold 14px "Roboto"';
  ctx.fillText('RANK', 620, 55);

  ctx.fillStyle = '#9b5cff';
  ctx.font = 'bold 42px "Roboto"';
  ctx.fillText(`#${rank}`, 620, 100);

  ctx.fillStyle = '#b9b6c5';
  ctx.font = '18px "Roboto"';
  ctx.fillText(`/ ${totalUsers}`, 620, 128);

  // Top yüzdesi
  ctx.fillStyle = '#a855f7';
  ctx.font = '16px "Roboto"';
  ctx.fillText(`◆ Top %${topPercent}`, 620, 160);

  ctx.textAlign = 'left';

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
        `${BOOST_EMOJI} ${newMember} az önce sunucuya takviye yaptı!`
      );

      await mesaj.react('🎀');
    } catch (error) {
      console.error('Boost bildirimi gönderilemedi:', error);
    }
  }
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!boosttest') {
    const boostChannel = message.guild.channels.cache.get(BOOST_CHANNEL_ID);
    if (!boostChannel) return;

    const testMesaj = await boostChannel.send(
    `${BOOST_EMOJI} ${message.author} az önce sunucuya takviye yaptı!`
    );

    await testMesaj.react('🎀');
  }
});
client.login(process.env.TOKEN);
