import { GuildMemberRoleManager, MessageEmbed, ThreadChannel } from "discord.js";
import { config } from "../../config";
import ButtonCommand from "../classes/ButtonCommand";

const userPingReplaceRegExp = new RegExp(/\!{(USER_PING)\}!/, "g");

export default new ButtonCommand({
    customId:"close_ticket",
    checkType:"STARTS_WITH",
    async execute(interaction){
        let ticketUserId = interaction.customId.split("close_ticket_")[1];
        let supportThread = interaction.client.getSupportThreadData(ticketUserId)
        let currentUserId = interaction.member.user.id;
        let threadChannelId = supportThread.threadChannelId;
        var secondsSinceCreation = (Date.now() - supportThread.createdMs) / 1000;
        var remainingTime = config.closingTicketsSettings?.ticketsMinimumAge - secondsSinceCreation;
        let isStaff = (interaction.member.roles as GuildMemberRoleManager).cache.find(role => config.staffRoles.includes(role.id) || config.supportRoleId == role.id);
        console.log(interaction.member.roles)
        if(currentUserId != ticketUserId && !isStaff)
            return interaction.reply({
                content:`You can't close a ticket that isn't yours.`,
                ephemeral:true
            })
        if(config.closingTicketsSettings?.ticketsMinimumAge > secondsSinceCreation && !isStaff)
            return interaction.reply({
                content:`Sorry, this ticket has to remain open for **${remainingTime > 60? Math.floor(remainingTime / 60) : Math.floor(remainingTime)}** more ${remainingTime > 60 ? `minute${Math.floor(remainingTime / 60) == 1 ? `` : `s`}` : `second${Math.floor(remainingTime) <= 1 ? `` : `s`}`} before it can be closed.`,
                ephemeral:true
            })
        interaction.reply({
            content:`<#${threadChannelId}> will be locked soon.`,
            ephemeral:true
        })
        .then(() => {
            let embeds:MessageEmbed[] = [
                new MessageEmbed(                {
                    "description":`🔒 Ticket has been closed by <@${currentUserId}>`,
                    "color":16711680
                })
            ];
            if(config.closingTicketsSettings?.closeMessage)
                embeds.push(new MessageEmbed({
                    "description":config.closingTicketsSettings.closeMessage.replace(userPingReplaceRegExp, `<@${ticketUserId}>`),
                    "footer":{
                        text:"The message above is set by the server"
                    }
                }));

            let threadChannel = interaction.client.channels.cache.get(threadChannelId) as ThreadChannel;
            threadChannel?.send({
                embeds
            })
            return interaction.client.closeSupportThread({
                userId:ticketUserId,
                channelId:threadChannelId,
                noApi:threadChannel?false:true

            }).catch(console.error)
        })
    }
})