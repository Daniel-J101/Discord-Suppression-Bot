const express = require("express")
const app = express()
const ms = require('ms')
const prettyMilliseconds = require("pretty-ms")
const fs = require('fs')
const { MessageEmbed } = require('discord.js');

app.get("/", (req, res) => {
  res.send("hello hello!")
})

app.listen(3000, () => {
  console.log("Project is ready!")
})

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]});

let server = null;
const prefix = "!"
var roleName = null;
let suppressionRole = null;
let memberCounter = 0;
let sequenceRunning = false;


client.on("ready", () => {
  console.log("bot is ready!")
  server = client.guilds.cache.find(guild => guild.id == process.env['server']);
  updateRole();
  updateSuppressRole();

  
  client.user.setPresence({ status: "dnd" })
      setInterval(() => {
        client.user.setActivity(`Uptime: ${prettyMilliseconds(client.uptime)}`, { type: 'WATCHING' });
    }, 10000); // Runs this every 10 seconds.
    client.setMaxListeners(300);
})

client.on('guildCreate', guild => {
  guild.systemChannel.send("Bot Guide (all commands case sensitive):")
  guild.systemChannel.send("\`\`\`!info - this info msg\`\`\`\`\`\`!setup <role name> - sets up role needed in order to access any bot commands (only one whitelisted role at a time)\`\`\`\`\`\`!suppress <username/server nickname/mention/id> - Locks specified member out of every channel and gives them access to a suppressed channel by giving them a role\`\`\`\`\`\`!unsuppress <username/server nickname/mention/id> - Will let specified member into every channel they were previously in and removes access to the suppressed channel by removing their suppressed role\`\`\`\`\`\`bot support - contact server owner\`\`\`\`\`\`!log - will create a bot-log channel if not already created that logs all bot actions. Can be deleted and recreated at any time\`\`\`")   
})

client.on("message", message => {
  //initial setup
  if(roleName != null) return;
  if(message.author.bot) return;
  if(serverCheck(message) == false) {
    message.channel.send("This bot has been set up on another server. Contact the server owner to transfer it to this one")
    return;
  } 
  
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();   
  if((command == "suppress" || 
      command == "unsuppress") || 
      command == "info" || 
      command == "suppressionrole") {
    message.channel.send("Role access have not been set up on this server. Please run the command \`!setup <role name>\` (not case sensitive)")
    message.channel.send("This role will have access to all bot commands listed under \`!info\` and can be changed anytime by running the command again with a different role. *There can only be one whitelisted role at a time*")
    }

  if(command == "setup") {
    var content = message.content.slice(message.content.indexOf(command) + command.length + 1).toLowerCase();
    if(content == null || content == undefined || content.trim().length == 0) {
      message.channel.send("Please enter the name of a role after the command! format: \`!setup <role name>\`")
      return;
    } else if(validRole(content) == false) {
      message.channel.send("I cannot find that role. Please check spelling or that it's an existing role")
      return;
    }

    fs.writeFile("role.txt", content, (err) => {
      if(err) {
        console.log(err);
        message.channel.send("Something went wrong! Please contact the developer")
      } else {
        roleName = content;
        var embed = new MessageEmbed()
        .setColor('#5DADE2')
        .setDescription(message.author.username + " set the whitelisted role to " + roleName);      
        log({ embeds: [embed] });          
        // updateRole()
        setupBotLog(message)        
        console.log("file written successfully")
        let role = server.roles.cache.find(rolex => rolex.name.toLowerCase() == roleName)
        
        message.channel.send("Successfully set <@&" + role.id + "> as the whitelisted role and set #bot-log")
        message.channel.send("To ensure the bot works properly, move the bot role above the whitelisted role in Server Settings --> Roles")
        message.channel.send("Bot Guide (all commands case sensitive):")
        message.channel.send("\`\`\`!info - this info msg\`\`\`\`\`\`!setup <role name> - sets up role needed in order to access any bot commands (only one whitelisted role at a time)\`\`\`\`\`\`!suppress <username/server nickname/mention/id> - Locks specified member out of every channel and gives them access to a suppressed channel by giving them a role\`\`\`\`\`\`!unsuppress <username/server nickname/mention/id> - Will let specified member into every channel they were previously in and removes access to the suppressed channel by removing their suppressed role\`\`\`\`\`\`bot support - contact server owner\`\`\`\`\`\`!log - will create a bot-log channel if not already created that logs all bot actions. Can be deleted and recreated at any time\`\`\`")             
      }
    })
  }


  if(command == "unsupress" || 
     command == "unsuppres" || 
     command == "unsupres") {
    message.channel.send("It's spelled \`unsuppress\`")
  }
  if(command == "supress" || 
     command == "suppres" || 
     command == "supres") {
    message.channel.send("It's spelled \`suppress\`")
     }      
  
})

//bot action
client.on('messageCreate', message => {
  if(message.author.bot) return;
  if(roleName == null) return;
  if(serverCheck(message) == false) return;
  
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();  
  if(message.channel.type === 'dm') {
    return;
  } else {
  if((!message.content.startsWith(prefix) || !(message.member.permissions.has("ADMINISTRATOR")) || message.member.roles.cache.some(role => role.name == roleName) )) { return; }
  }

  //under admin check
  if(command == "suppress") {
    if(suppressionRole == null) {
      suppressionRoleSender(message);
      return;
    }
    let muteRole = message.guild.roles.cache.find(role => role.name.toLowerCase() == suppressionRole)
    if(message.mentions.users.first() == undefined) {
      if(message.content.slice(message.content.indexOf(command) + command.length + 1).toLowerCase().trim().length == 0) {
        message.channel.send("The usage of this command is \`!suppress <username/server nickname/mention/id>\`")
        return;
      }
      try {
        findUser(message, command).then((value) => {
          if(value != null) {
             suppression(message, 
                         value.user, 
                         value, 
                         muteRole) 
          }
  })
      } catch (error) {
        console.error(error)
        console.log("there was probably no person/ multiple people found")
      }
    } else {
      var target = message.mentions.users.first();
      suppression(message, 
                  target,
                  message.guild.members.cache.get(target.id),
                  muteRole)
    }
  }
  
  if(command == "unsuppress") {
    if(suppressionRole == null) {
      suppressionRoleSender(message);
      return;
    }
    let muteRole = message.guild.roles.cache.find(role => role.name.toLowerCase() === suppressionRole)
    if(message.mentions.users.first() == undefined) {
      if(message.content.slice(message.content.indexOf(command) + command.length + 1).toLowerCase().trim().length == 0) {
        message.channel.send("The usage of this command is \`!unsuppress <username/server nickname/mention/id>\`")
        return;
      }      
      try {
        findUser(message, command).then((value) => {
          if(value != null) {
             unsuppression(message, 
                value.user, 
                value, 
                muteRole)
          }
}) 
      } catch (error) {
        console.error(error)
        console.log("there was probably no person/ multiple people found")
      }
    } else {
      var target = message.mentions.users.first();
      unsuppression(message, 
                  target,
                  message.guild.members.cache.get(target.id),
                  muteRole)      
    }
  }

  if(command == "unsupress" || 
     command == "unsuppres" || 
     command == "unsupres") {
    message.channel.send("It's spelled \`unsuppress\`")
  }
  if(command == "supress" || 
     command == "suppres" || 
     command == "supres") {
    message.channel.send("It's spelled \`suppress\`")
     }

  if(command == "setup") {
    var content = message.content.slice(message.content.indexOf(command) + command.length + 1).toLowerCase();
    if(content == null || content == undefined || content.trim().length == 0) {
      message.channel.send("Please enter the name of a role after the command! format: \`!setup <role name>\`")
      return;
    } else if(validRole(content) == false) {
      message.channel.send("I cannot find that role. Please check the spelling of the role or that it's an existing role")
      return;
    }

    fs.writeFile("role.txt", content, (err) => {
      if(err) {
        console.log(err);
        message.channel.send("Something went wrong! Please contact the developer")
      } else {
        suppressionRole = content;
        var embed = new MessageEmbed()
        .setColor('#5DADE2')
        .setDescription(message.author.username + " set the whitelisted role to " + roleName);      
        log({ embeds: [embed] });         
        // updateRole()
        setupBotLog(message)
        console.log("file written successfully")
        let role = server.roles.cache.find(role => role.name.toLowerCase() == roleName)
        
        message.channel.send("Successfully set <@&" + role.id + "> as the whitelisted role and set #bot-log")
      }
    })
  }  

  if(command == "suppressionrole") {
    var content = message.content.slice(message.content.indexOf(command) + command.length + 1).toLowerCase();   
    if(content == null || content == undefined || content.trim().length == 0) {
      message.channel.send("Please enter the name of a role after the command! format: \`!suppressionRole <role name>\`")
      return;
    } else if(validRole(content) == false) {
      message.channel.send("I cannot find that role. Please check the spelling of the role or that it's an existing role")
      return;
    }
    fs.writeFile("suppressRole.txt", content, (err) => {
      if(err) {
        console.log(err);
        message.channel.send("Something went wrong! Please contact the developer")
      } else {
        suppressionRole = content;
        var embed = new MessageEmbed()
        .setColor('#5DADE2')
        .setDescription(message.author.username + " set the suppressed role to " + suppressionRole);      
        log({ embeds: [embed] });         
        // updateRole() change
        console.log("file written successfully")
        let role = server.roles.cache.find(role => role.name.toLowerCase() == suppressionRole)
        
        message.channel.send("Successfully set <@&" + role.id + "> as the suppressed role...command is now ready for use")
      }
    })    
  }

  if(command == "log") {
    setupBotLog(message)
  }
  
  if(command == "info") {
    message.channel.send("\`\`\`!info - this info msg\`\`\`\`\`\`!setup <role name> - sets up role needed in order to access any bot commands (only one whitelisted role at a time)\`\`\`\`\`\`!suppress <username/server nickname/mention/id> - Locks specified member out of every channel and gives them access to a suppressed channel by giving them a role\`\`\`\`\`\`!unsuppress <username/server nickname/mention/id> - Will let specified member into every channel they were previously in and removes access to the suppressed channel by removing their suppressed role\`\`\`\`\`\`bot support - contact server owner\`\`\`\`\`\`!log - will create a bot-log channel if not already created that logs all bot actions. Can be deleted and recreated at any time\`\`\`")    
  }
})

client.login(process.env['token'])

function setupBotLog(message) {
  if(client.channels.cache.find(ch => ch.isText() && ch.name === "bot-log") != undefined) {
    message.channel.send("A bot-log channel already exists")
    return;
  }  
  message.guild.channels.create('bot-log', {
    reason: 'Channel for bot logs',
    permissionOverwrites: [
      {
        id: message.guild.roles.everyone,
        deny: ['VIEW_CHANNEL']
      },
      {
        id: server.roles.cache.find(role => role.name.toLowerCase() == roleName),
        allow: ['VIEW_CHANNEL', 'MANAGE_CHANNELS']
      }
    ]
  })  
}

function suppressionRoleSender(message) {
  message.channel.send("A suppression role has not been set up on this server. Please setup the role by running the command \`!suppressionrole <role name>\` (not case sensitive) *There can only be one suppression role at a time and can be changed at any time by running the command again*")
}

function suppression(message, user, guildMember, suppressedRole) {
  var target = user; //user obj
  let memberTarget =  guildMember;//GM obj
  if(memberTarget.roles.cache.some(role => role.name === suppressionRole)) {
    message.channel.send("This member is already suppressed!");
    return;
  }
  memberTarget.roles.add(suppressedRole.id);

  const tempChannels = message.guild.channels.cache.filter(c => (c.type == 'GUILD_TEXT' || c.type === 'GUILD_VOICE') && c.name != 'suppressed')
  //if looped through with for loop it would return an array of the objects instead of the objects themselves. so do each()

  tempChannels.each(channel => {
    channel.permissionOverwrites.create(target.id, {
      VIEW_CHANNEL: false
    }, 'Suppresion by ' + message.author.tag).catch(console.error)
  })
  message.channel.send(target.tag + " successfully suppressed")

  var embed = new MessageEmbed()
  .setColor('#fcd612')
  .setDescription(message.author.username + " suppressed " + target.tag + " (id: \`" + target + "\`)");      
  log({ embeds: [embed] });  
}

function unsuppression(message, user, guildMember, suppressedRole) {
  var target = user;
  let memberTarget = guildMember;
  const tempChannels = message.guild.channels.cache.filter(c => c.type == 'GUILD_TEXT' || c.type === 'GUILD_VOICE')    
  tempChannels.each(channel => {
    channel.permissionOverwrites.delete(message.author.id);
    //dangerous if a member set specific permissions for that target by hand
  channel.permissionOverwrites.delete(target.id, 'Unsuppresed by ' + message.author.tag).catch(console.error)
})      
  if(!memberTarget.roles.cache.some(role => role.name === suppressionRole)) {
    message.channel.send("This member isn't suppressed!");
    return;
  }
  memberTarget.roles.remove(suppressedRole.id);
  message.channel.send(target.tag + " successfully unsuppressed")
  
  var embed = new MessageEmbed()
  .setColor('#2ECC71')
  .setDescription(message.author.username + " unsuppressed " + target.tag + " (id: \`" + target + "\`)");      
  log({ embeds: [embed] });  
}

async function findUser(message, command) {
  try {
    let foundMember = null;
    let arra = await doStuff(message, command, false);
    switch (arra.num) {
      case 0:
        let arra2 = await doStuff(message, command, true);
        switch(arra2.num) {
          case 0:
            message.channel.send("I cannot find that user. Check spelling or if they are in the server. If you included their tag (####) please remove it and try again")
            break;
          case 1:
            foundMember = arra2.guys[0]
            break;
          default:
            message.channel.send("There are somehow multiple people with this id")
            for(const person of arra2.guys) {
              message.channel.send(person.user.tag + " (" + person.nickname + ")" + " " + person.id)
            }              
            
        }
        break;
      case 1:
        foundMember = arra.guys[0]       
        break;
      default:
        message.channel.send("There are multiple people that share this name or nickname. Please use their id or change their nicknames")
        for(const person of arra.guys) {
          message.channel.send(person.user.tag + " (" + person.nickname + ")" + " " + person.id)
        }        
    }
    return foundMember;
  } catch (error) {
    console.log("something went wrong in user finding")
    console.error(error)
  }
}

async function doStuff(message, command, isID) {
  try {
    let validMembers = [];
    let counter = 0;
    let persons = await completeProcess(message);
    var content = message.content.slice(message.content.indexOf(command) + command.length + 1).toLowerCase();  
    persons.each(member => {
        // console.log(member.user.username + " " + member.nickname + " = " + content)
      if(!isID) {
        if(member.user.username.toLowerCase() == content) {
          validMembers[counter] = member;
          counter++;
        } else if(member.nickname != undefined && member.nickname.toLowerCase() == content) {
          validMembers[counter] = member;
          counter++;
        }        
      } else {
        if(member.id == content) {
          validMembers[counter] = member;
          counter++;
        }
      }
      
      })
    return new Promise(function(resolve, reject) {
      const obj = {
        arra: persons,
        guys: validMembers,
        num: counter
      }
      resolve(obj)
    })
  } catch (error) {
    console.log("something went wrong in doStuff")
    console.error(error)
  }
}

async function completeProcess(message) {
  try {
    let serverMembers = await message.guild.members.fetch();

    return new Promise((resolve, reject) => {
      if(serverMembers != null || serverMembers != undefined) {
        resolve(serverMembers)
      } else {
        console.log("something went wrong in promise")
        const errorObject = {
          msg: 'Something went wrong',
          id: 1
        }
        reject(errorObject)
      }
    })
  } catch (error) {
    console.log("something went wrong")
    console.error(error)
  }
}

function serverCheck(message) {
  if(message.guild.id == process.env['server']) {
    return true;
  } else {
    return false;
  }

}

function log(text) {
  //have to do server check every instance
  let channel = client.channels.cache.find(ch => ch.isText() && ch.name === "bot-log")
  if(channel == undefined) {
    console.log("No bot-log, no logging")
  } else {
     channel.send(text)
  }  
}

function validRole(name) {
  let role = server.roles.cache.find(role => role.name.toLowerCase() == name)
  if(role == undefined) {
    return false;
  } else {
    return true;
  }
}

function updateRole() {
  fs.readFile('role.txt', 'utf8', (err, data) => {
  if(err) {
    console.error(err)
    return;
  }
  if(data.trim().length != 0) {
    roleName = data;
  }
})
}

function updateSuppressRole() {
  fs.readFile('suppressRole.txt', 'utf8', (err, data) => {
  if(err) {
    console.error(err)
    return;
  }
  if(data.trim().length != 0) {
    suppressionRole = data;
  }
})
}