const fs = require("fs");
const Discord = require("discord.js");
const { prefix, activity } = require("./config.json");

const client = new Discord.Client();
client.commands = new Discord.Collection();

const cooldowns = new Discord.Collection();

const commandFiles = fs
  .readdirSync("./commands")
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  // set a new item in the Collection
  // with the key as the command name and
  // the value as the exported module
  client.commands.set(command.name, command);
  console.log(file);
}

//check apakah bot berhasil login
client.on("ready", async () => {
  console.log(`${client.user.username} lapor siap bertugas !`);
  client.user.setActivity(activity.actName, {type: activity.actType});
});

client.on("message", message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  //membuat command alias, commandSet [aliases: [str]]
  const command = client.commands.get(commandName)
  || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
  if (!command) return;
  
  //untuk comand pada server saja no dm, commandsSet [guildOnly: bool] 
  if (command.guildOnly && message.channel.type === 'dm') {
  	return message.reply('I can\'t execute that command inside DMs!');
  }
  
  //untuk check apakah command perlu args, commandSet [args: bool]
  if (command.args && !args.length) {
    let reply = `You didn't provide any arguments, ${message.author}!`;
    
    //memberikan deskripsi penggunaan jika commadSet [usage: str]
    if (command.usage) {
      reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
    }

    return message.channel.send(reply);
  }
  
  //membuat command cooldown, commandSet [cooldown: int(in scond)]
  if (!cooldowns.has(command.name)) {
  	cooldowns.set(command.name, new Discord.Collection());
  }
  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;
  
  if (timestamps.has(message.author.id)) {
  	const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
  
  	if (now < expirationTime) {
  		const timeLeft = (expirationTime - now) / 1000;
  		return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
  	}
  }
  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  //execute command yang diberikan
  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply("there was an error trying to execute that command!");
  }
});

client.login(process.env.DISCORD_TOKEN);