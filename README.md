## Twitch Tools

A collection of tools to use with Twitch channels that monitor the chat and perform various actions.

- Text to speech straight from your browser.
- A list of people that have chatted. Useful for saying hello or seeing who's arrived while you've been away.
- **_You're muted!_** notification. Flashes the screen or sounds an alarm when people type "you're muted" or use the !muted command. Standard limits can be applied.
- New chat message alert. Alerts you when a new chat message is received. A cooldown is automatically set between alerts and a delay before the alert lets you trigger the cooldown before the alert fully fires. Great if you're caught up in your game and forget to pay attention to the chat.


You can limit commands to mods, vips or named users.
They are additional so having mods checked means ALL mods.
Named users will be permitted even if they have no special roles.

All settings will be added to the url so you can bookmark versions of the pages without having to enter all the details again.  I'm avoiding cookies for now but localstorage keeps settings temporarily.

**More tools** will be coming and if you've any suggestions for tools the please let me know.

Yes, the code is pretty nasty.  I've purposely not used modules so it can be run from the file system with a few tweaks and 'separation of concerns' isn't the greatest.  Meh.

It's all written using pug templates which I render out for her, that helps with stuff like the speech engine as each command is a mixin which I limited to three for here to avoid page bloat so using that just changing one number = as many voice commands as you like.