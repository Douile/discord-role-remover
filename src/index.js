#!/usr/bin/env node

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD = process.env.GUILD_ID;
const ROLES_TO_REMOVE = process.argv.slice(1);

if (!TOKEN || !GUILD || ROLES_TO_REMOVE.length === 0) {
  console.error('You must specify API token, Guild ID, and list of role IDs to remove');
  console.error('Usage:');
  console.error('DISCORD_TOKEN="token" GUILD_ID="guild_id" node ./index.mjs role1 role2...');
  process.exit(1);
}

async function main() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  {
    const guild = await rest.get(Routes.guild(GUILD));
    const roles = await rest.get(Routes.guildRoles(GUILD));
    const removedRoleString = ROLES_TO_REMOVE.map(r => roles.find(role => role.id === r)?.name).join(', ');
    console.log(`Removing ${removedRoleString} from all members of ${guild.name}...`);
  }
  {
    const rl = readline.createInterface({ input, output });
    const response = await rl.question('Enter "YES" to continue: ');
    rl.close();
    if (response !== 'YES') {
      process.exit(0);
    }
  }

  const params = new URLSearchParams();
  params.set('limit', 1000);
  const members = await rest.get(Routes.guildMembers(GUILD), {
    query: params,
  });

  let i = 0;
  for (const member of members) {
    console.log(`Updating "${member.user.username}" (${++i}/${members.length})`);
    const roles = member.roles.filter(r => !ROLES_TO_REMOVE.includes(r));
    if (roles.length !== member.roles.length) {
      await rest.patch(Routes.guildMember(GUILD, member.user.id), {
        body: { roles },
        headers: {
          'X-Audit-Log-Reason': 'Automated role removal',
        }
      });
    }
  }
}

main().then(null, console.error);
