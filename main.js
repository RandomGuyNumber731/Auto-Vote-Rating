//Список рейтингов
// noinspection JSUnusedGlobalSymbols
const allProjects = {
    TopCraft: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://topcraft.ru/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/'
            case 'pageURL':
                return 'https://topcraft.ru/servers/' + project.id + '/'
            case 'jsPath':
                return '#project-about > table > tbody > tr:nth-child(1) > td:nth-child(2) > a'
            case 'exampleURL':
                return ['https://topcraft.ru/servers/', '10496', '/']
            case 'URL':
                return 'TopCraft.ru'
        }
    },
    McTOP: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://mctop.su/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/'
            case 'pageURL':
                return 'https://mctop.su/servers/' + project.id + '/'
            case 'jsPath':
                return '#project-about > div.row > div:nth-child(1) > table > tbody > tr:nth-child(1) > td:nth-child(2) > a'
            case 'exampleURL':
                return ['https://mctop.su/servers/', '5231', '/']
            case 'URL':
                return 'McTOP.su'
        }
    },
    MCRate: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://oauth.vk.com/authorize?client_id=3059117&redirect_uri=http://mcrate.su/add/rate?idp=' + project.id + '&response_type=code'
            case 'pageURL':
                return 'http://mcrate.su/project/' + project.id
            case 'jsPath':
                return '#button-circle > a'
            case 'exampleURL':
                return ['http://mcrate.su/rate/', '4396', '']
            case 'URL':
                return 'MCRate.su'
        }
    },
    MinecraftRating: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://oauth.vk.com/authorize?client_id=5216838&display=page&redirect_uri=https://minecraftrating.ru/projects/' + project.id + '/&state=' + project.nick + '&response_type=code&v=5.45'
            case 'pageURL':
                return 'https://minecraftrating.ru/projects/' + project.id + '/'
            case 'jsPath':
                return 'table[class="table server-table"] > tbody > tr:nth-child(2) > td:nth-child(2) > a'
            case 'exampleURL':
                return ['https://minecraftrating.ru/projects/', 'cubixworld', '/']
            case 'URL':
                return 'MinecraftRating.ru'
        }
    },
    MonitoringMinecraft: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://monitoringminecraft.ru/top/' + project.id + '/vote'
            case 'pageURL':
                return 'https://monitoringminecraft.ru/top/' + project.id + '/'
            case 'jsPath':
                return '#page > div.box.visible.main > div.left > table > tbody > tr:nth-child(1) > td.wid > noindex > a'
            case 'exampleURL':
                return ['https://monitoringminecraft.ru/top/', 'gg', '/vote']
            case 'URL':
                return 'MonitoringMinecraft.ru'
        }
    },
    IonMc: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://ionmc.top/projects/' + project.id + '/vote'
            case 'pageURL':
                return 'https://ionmc.top/projects/' + project.id + '/vote'
            case 'jsPath':
                return '#app > div.mt-2.md\\:mt-0.wrapper.container.mx-auto > div.mx-2.-mt-1.mb-1.sm\\:mx-5.sm\\:my-2 > ul > li:nth-child(2) > a'
            case 'exampleURL':
                return ['https://ionmc.top/projects/', '80', '/vote']
            case 'URL':
                return 'IonMc.top'
        }
    },
    MinecraftServersOrg: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraftservers.org/vote/' + project.id
            case 'pageURL':
                return 'https://minecraftservers.org/server/' + project.id
            case 'jsPath':
                return '#left > div > h1'
            case 'exampleURL':
                return ['https://minecraftservers.org/vote/', '25531', '']
            case 'URL':
                return 'MinecraftServers.org'
        }
    },
    ServeurPrive: (type, project) => {
        switch (type) {
            case 'voteURL':
            case 'pageURL':
                if (project.lang === 'en') {
                    return 'https://serveur-prive.net/' + project.lang + '/' + project.game + '/' + project.id + '/vote'
                } else {
                    return 'https://serveur-prive.net/' + project.game + '/' + project.id + '/vote'
                }
            case 'jsPath':
                return '#t > div > div > h2'
            case 'exampleURL':
                return ['https://serveur-prive.net/minecraft/', 'gommehd-net-4932', '/vote']
            case 'URL':
                return 'Serveur-Prive.net'
        }
    },
    PlanetMinecraft: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.planetminecraft.com/server/' + project.id + '/vote/'
            case 'pageURL':
                return 'https://www.planetminecraft.com/server/' + project.id + '/'
            case 'jsPath':
                return '#resource-title-text'
            case 'exampleURL':
                return ['https://www.planetminecraft.com/server/', 'legends-evolved', '/vote/']
            case 'URL':
                return 'PlanetMinecraft.com'
        }
    },
    TopG: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://topg.org/' + project.game + '/server-' + project.id
            case 'pageURL':
                return 'https://topg.org/' + project.game + '/server-' + project.id
            case 'jsPath':
                return 'div.sheader'
            case 'exampleURL':
                return ['https://topg.org/minecraft-servers/server-', '405637', '']
            case 'URL':
                return 'TopG.org'
        }
    },
    ListForge: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://' + project.game + '/server/' + project.id + '/vote/'
            case 'pageURL':
                return 'https://' + project.game + '/server/' + project.id + '/vote/'
            case 'jsPath':
                return 'head > title'
            case 'exampleURL':
                return ['https://minecraft-mp.com/server/', '81821', '/vote/']
            case 'URL':
                return 'ListForge.net'
        }
    },
    MinecraftServerList: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraft-server-list.com/server/' + project.id + '/vote/'
            case 'pageURL':
                return 'https://minecraft-server-list.com/server/' + project.id + '/'
            case 'jsPath':
                return '#site-wrapper > section > div.hfeed > span > div.serverdatadiv > table > tbody > tr:nth-child(5) > td > a'
            case 'exampleURL':
                return ['https://minecraft-server-list.com/server/', '292028', '/vote/']
            case 'URL':
                return 'Minecraft-Server-List.com'
        }
    },
    ServerPact: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.serverpact.com/vote-' + project.id
            case 'pageURL':
                return 'https://www.serverpact.com/vote-' + project.id
            case 'jsPath':
                return 'body > div.container.sp-o > div.row > div.col-md-9 > div.row > div:nth-child(2) > div > div.panel-body > table > tbody > tr:nth-child(6) > td:nth-child(2) > a'
            case 'exampleURL':
                return ['https://www.serverpact.com/vote-', '26492123', '']
            case 'URL':
                return 'ServerPact.com'
        }
    },
    MinecraftIpList: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraftiplist.com/index.php?action=vote&listingID=' + project.id
            case 'pageURL':
                return 'https://minecraftiplist.com/server/-' + project.id
            case 'jsPath':
                return '#addr > span:nth-child(3)'
            case 'exampleURL':
                return ['https://minecraftiplist.com/index.php?action=vote&listingID=', '2576', '']
            case 'URL':
                return 'MinecraftIpList.com'
        }
    },
    TopMinecraftServers: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://topminecraftservers.org/vote/' + project.id
            case 'pageURL':
                return 'https://topminecraftservers.org/server/' + project.id
            case 'jsPath':
                return 'body > div.container > div > div > div > div.col-md-8 > h1'
            case 'exampleURL':
                return ['https://topminecraftservers.org/vote/', '9126', '']
            case 'URL':
                return 'TopMinecraftServers.org'
        }
    },
    MinecraftServersBiz: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraftservers.biz/' + project.id + '/'
            case 'pageURL':
                return 'https://minecraftservers.biz/' + project.id + '/'
            case 'jsPath':
                return 'table[class="table table-hover table-striped"] > tbody > tr:nth-child(4) > td:nth-child(2)'
            case 'exampleURL':
                return ['https://minecraftservers.biz/', 'servers/145999', '/']
            case 'URL':
                return 'MinecraftServers.biz'
        }
    },
    HotMC: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://hotmc.ru/vote-' + project.id
            case 'pageURL':
                return 'https://hotmc.ru/minecraft-server-' + project.id
            case 'jsPath':
                return 'div[class="text-server"] > h1'
            case 'exampleURL':
                return ['https://hotmc.ru/vote-', '199493', '']
            case 'URL':
                return 'HotMC.ru'
        }
    },
    MinecraftServerNet: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraft-server.net/vote/' + project.id + '/'
            case 'pageURL':
                return 'https://minecraft-server.net/details/' + project.id + '/'
            case 'jsPath':
                return 'div.card-header > h1'
            case 'exampleURL':
                return ['https://minecraft-server.net/vote/', 'TitanicFreak', '/']
            case 'URL':
                return 'Minecraft-Server.net'
        }
    },
    TopGames: (type, project) => {
        switch (type) {
            case 'voteURL':
                if (project.lang === 'fr') {
                    return 'https://top-serveurs.net/' + project.game + '/vote/' + project.id
                } else if (project.lang === 'en') {
                    return 'https://top-games.net/' + project.game + '/vote/' + project.id
                } else {
                    return 'https://' + project.lang + '.top-games.net/' + project.game + '/vote/' + project.id
                }
            case 'pageURL':
                if (project.lang === 'fr') {
                    return 'https://top-serveurs.net/' + project.game + '/' + project.id
                } else if (project.lang === 'en') {
                    return 'https://top-games.net/' + project.game + '/' + project.id
                } else {
                    return 'https://' + project.lang + '.top-games.net/' + project.game + '/' + project.id
                }
            case 'jsPath':
                return 'body > div.game-jumbotron > div > div > h1'
            case 'exampleURL':
                return ['https://top-serveurs.net/minecraft/', 'icesword-pvpfaction-depuis-2014-crack-on', '']
            case 'URL':
                return 'Top-Games.net'
        }
    },
    TMonitoring: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://tmonitoring.com/server/' + project.id + '/'
            case 'pageURL':
                return 'https://tmonitoring.com/server/' + project.id + '/'
            case 'jsPath':
                return 'div[class="info clearfix"] > div.pull-left > h1'
            case 'exampleURL':
                return ['https://tmonitoring.com/server/', 'qoobworldru', '']
            case 'URL':
                return 'TMonitoring.com'
        }
    },
    TopGG: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://top.gg/' + project.game + '/' + project.id + '/vote' + project.addition
            case 'pageURL':
                return 'https://top.gg/' + project.game + '/' + project.id + '/vote'
            case 'jsPath':
                return '#entity-title'
            case 'exampleURL':
                return ['https://top.gg/bot/', '270904126974590976', '/vote']
            case 'URL':
                return 'Top.gg'
        }
    },
    DiscordBotList: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://discordbotlist.com/bots/' + project.id + '/upvote'
            case 'pageURL':
                return 'https://discordbotlist.com/bots/' + project.id
            case 'jsPath':
                return 'h1[class="bot-name"]'
            case 'exampleURL':
                return ['https://discordbotlist.com/bots/', 'dank-memer', '/upvote']
            case 'URL':
                return 'DiscordBotList.com'
        }
    },
    BotsForDiscord: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://botsfordiscord.com/bot/' + project.id + '/vote'
            case 'pageURL':
                return 'https://botsfordiscord.com/bot/' + project.id + '/vote'
            case 'jsPath':
                return 'h2[class="subtitle"] > b'
            case 'exampleURL':
                return ['https://botsfordiscord.com/bot/', '469610550159212554', '/vote']
            case 'URL':
                return 'BotsForDiscord.com'
        }
    },
    MMoTopRU: (type, project) => {
        switch (type) {
            case 'voteURL':
                if (project.lang === 'ru') {
                    return 'https://' + project.game + '.mmotop.ru/servers/' + project.id + '/votes/new'
                } else {
                    return 'https://' + project.game + '.mmotop.ru/' + project.lang + '/' + 'servers/' + project.id + '/votes/new'
                }
            case 'pageURL':
                if (project.lang === 'ru') {
                    return 'https://' + project.game + '.mmotop.ru/servers/' + project.id
                } else {
                    return 'https://' + project.game + '.mmotop.ru/' + project.lang + '/' + 'servers/' + project.id
                }
            case 'jsPath':
                return '#site-link'
            case 'exampleURL':
                return ['https://pw.mmotop.ru/servers/', '25895', '/votes/new']
            case 'URL':
                return 'MMoTop.ru'
        }
    },
    MCServers: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://mc-servers.com/mcvote/' + project.id + '/'
            case 'pageURL':
                return 'https://mc-servers.com/details/' + project.id + '/'
            case 'jsPath':
                return 'a[href="/details/' + project.id + '"]'
            case 'exampleURL':
                return ['https://mc-servers.com/mcvote/', '1890', '/']
            case 'URL':
                return 'MC-Servers.com'
        }
    },
    MinecraftList: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraftlist.org/vote/' + project.id
            case 'pageURL':
                return 'https://minecraftlist.org/server/' + project.id
            case 'jsPath':
                return 'h1'
            case 'exampleURL':
                return ['https://minecraftlist.org/vote/', '11227', '']
            case 'URL':
                return 'MinecraftList.org'
        }
    },
    MinecraftIndex: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.minecraft-index.com/' + project.id + '/vote'
            case 'pageURL':
                return 'https://www.minecraft-index.com/' + project.id
            case 'jsPath':
                return 'h3.stitle'
            case 'exampleURL':
                return ['https://www.minecraft-index.com/', '33621-extremecraft-net', '/vote']
            case 'URL':
                return 'Minecraft-Index.com'
        }
    },
    ServerList101: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://serverlist101.com/server/' + project.id + '/vote/'
            case 'pageURL':
                return 'https://serverlist101.com/server/' + project.id + '/'
            case 'jsPath':
                return 'li > h1'
            case 'exampleURL':
                return ['https://serverlist101.com/server/', '1547', '/vote/']
            case 'URL':
                return 'ServerList101.com'
        }
    },
    MCServerList: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://mcserver-list.eu/hlasovat?id=' + project.id
            case 'pageURL':
                return 'https://api.mcserver-list.eu/server/?id=' + project.id
            case 'jsPath':
                return ''
            case 'exampleURL':
                return ['https://mcserver-list.eu/hlasovat/?id=', '307', '']
            case 'URL':
                return 'MCServer-List.eu'
        }
    },
    CraftList: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://craftlist.org/' + project.id
            case 'pageURL':
                return 'https://craftlist.org/' + project.id
            case 'jsPath':
                return 'main h1'
            case 'exampleURL':
                return ['https://craftlist.org/', 'basicland', '']
            case 'URL':
                return 'CraftList.org'
        }
    },
    CzechCraft: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://czech-craft.eu/server/' + project.id + '/vote/'
            case 'pageURL':
                return 'https://czech-craft.eu/server/' + project.id + '/'
            case 'jsPath':
                return 'a.server-name'
            case 'exampleURL':
                return ['https://czech-craft.eu/server/', 'trenend', '/vote/']
            case 'URL':
                return 'Czech-Craft.eu'
        }
    },
    PixelmonServers: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://pixelmonservers.com/server/' + project.id + '/vote'
            case 'pageURL':
                return 'https://pixelmonservers.com/server/' + project.id + '/vote'
            case 'jsPath':
                return '#title'
            case 'exampleURL':
                return ['https://pixelmonservers.com/server/', '8IO9idMv', '/vote']
            case 'URL':
                return 'PixelmonServers.com'
        }
    },
    QTop: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'http://q-top.ru/vote' + project.id
            case 'pageURL':
                return 'http://q-top.ru/vote' + project.id
            case 'jsPath':
                return 'a[href="profile' + project.id + '"]'
            case 'exampleURL':
                return ['http://q-top.ru/vote', '1549', '']
            case 'URL':
                return 'Q-Top.ru'
        }
    },
    MinecraftBuzz: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraft.buzz/server/' + project.id + '&tab=vote'
            case 'pageURL':
                return 'https://minecraft.buzz/server/' + project.id
            case 'jsPath':
                return '[href="server/' + project.id + '"]'
            case 'exampleURL':
                return ['https://minecraft.buzz/server/', '306', '&tab=vote']
            case 'URL':
                return 'Minecraft.Buzz'
        }
    },
    MinecraftServery: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraftservery.eu/server/' + project.id
            case 'pageURL':
                return 'https://minecraftservery.eu/server/' + project.id
            case 'jsPath':
                return 'div.container div.box h1.title'
            case 'exampleURL':
                return ['https://minecraftservery.eu/server/', '105', '']
            case 'URL':
                return 'MinecraftServery.eu'
        }
    },
    RPGParadize: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.rpg-paradize.com/?page=vote&vote=' + project.id
            case 'pageURL':
                return 'https://www.rpg-paradize.com/?page=vote&vote=' + project.id
            case 'jsPath':
                return 'div.div-box > h1'
            case 'exampleURL':
                return ['https://www.rpg-paradize.com/?page=vote&vote=', '113763', '']
            case 'URL':
                return 'RPG-Paradize.com'
        }
    },
    MinecraftServerListNet: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.minecraft-serverlist.net/vote/' + project.id
            case 'pageURL':
                return 'https://www.minecraft-serverlist.net/vote/' + project.id
            case 'jsPath':
                return 'a.server-name'
            case 'exampleURL':
                return ['https://www.minecraft-serverlist.net/vote/', '51076', '']
            case 'URL':
                return 'Minecraft-ServerList.net'
        }
    },
    MinecraftServerEu: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://minecraft-server.eu/vote/index/' + project.id
            case 'pageURL':
                return 'https://minecraft-server.eu/server/index/' + project.id
            case 'jsPath':
                return 'div.serverName'
            case 'exampleURL':
                return ['https://minecraft-server.eu/vote/index/', '1A73C', '']
            case 'URL':
                return 'Minecraft-Server.eu'
        }
    },
    MinecraftKrant: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.minecraftkrant.nl/serverlijst/' + project.id
            case 'pageURL':
                return 'https://www.minecraftkrant.nl/serverlijst/' + project.id
            case 'jsPath':
                return 'div.inner-title'
            case 'exampleURL':
                return ['https://www.minecraftkrant.nl/serverlijst/', 'torchcraft', '']
            case 'URL':
                return 'MinecraftKrant.nl'
        }
    },
    TrackyServer: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.trackyserver.com/server/' + project.id
            case 'pageURL':
                return 'https://www.trackyserver.com/server/' + project.id
            case 'jsPath':
                return 'div.panel h1'
            case 'exampleURL':
                return ['https://www.trackyserver.com/server/', 'anubismc-486999', '']
            case 'URL':
                return 'TrackyServer.com'
        }
    },
    MCListsOrg: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://mc-lists.org/' + project.id + '/vote'
            case 'pageURL':
                return 'https://mc-lists.org/' + project.id + '/vote'
            case 'jsPath':
                return 'div.header > div.ui.container'
            case 'exampleURL':
                return ['https://mc-lists.org/', 'server-luxurycraft.1818', '/vote']
            case 'URL':
                return 'MC-Lists.org'
        }
    },
    TopMCServersCom: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://topmcservers.com/server/' + project.id + '/vote'
            case 'pageURL':
                return 'https://topmcservers.com/server/' + project.id
            case 'jsPath':
                return '#serverPage > h1.header'
            case 'exampleURL':
                return ['https://topmcservers.com/server/', '17', '/vote']
            case 'URL':
                return 'TopMCServers.com'
        }
    },
    BestServersCom: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://bestservers.com/server/' + project.id + '/vote'
            case 'pageURL':
                return 'https://bestservers.com/server/' + project.id + '/vote'
            case 'jsPath':
                return 'a[href="/server/' + project.id + '"]'
            case 'exampleURL':
                return ['https://bestservers.com/server/', '1135', '/vote']
            case 'URL':
                return 'BestServers.com'
        }
    },
    CraftListNet: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://craft-list.net/minecraft-server/' + project.id + '/vote'
            case 'pageURL':
                return 'https://craft-list.net/minecraft-server/' + project.id
            case 'jsPath':
                return 'div.serverpage-navigation-headername.header'
            case 'exampleURL':
                return ['https://craft-list.net/minecraft-server/', 'Advancius-Network', '/vote']
            case 'URL':
                return 'Craft-List.net'
        }
    },
    MinecraftServersListOrg: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.minecraft-servers-list.org/index.php?a=in&u=' + project.id
            case 'pageURL':
                return 'https://www.minecraft-servers-list.org/details/' + project.id + '/'
            case 'jsPath':
                return 'div.card-header > h1'
            case 'exampleURL':
                return ['https://www.minecraft-servers-list.org/index.php?a=in&u=', 'chromity', '']
            case 'URL':
                return 'Minecraft-Servers-List.org'
        }
    },
    ServerListe: (type, project) => {
        switch (type) {
            case 'voteURL':
                return 'https://www.serverliste.net/vote/' + project.id
            case 'pageURL':
                return 'https://www.serverliste.net/vote/' + project.id
            case 'jsPath':
                return '#bar > h3'
            case 'exampleURL':
                return ['https://www.serverliste.net/vote/', '775', '']
            case 'URL':
                return 'ServerListe.net'
        }
    },
    Custom: (type, project) => {
        switch (type) {
            case 'pageURL':
                return project.responseURL
            case 'exampleURL':
                return ['', '', '']
            case 'URL':
                return 'Custom'
        }
    }
}

//Настройки
let settings
//Общая статистика
let generalStats
//База данных
let db

//Инициализация настроек расширения
async function initializeConfig(background) {
    // noinspection JSUnusedGlobalSymbols
    db = await idb.openDB('avr', 2, {
        upgrade(db, oldVersion/*, newVersion, transaction*/) {
            if (oldVersion === 0) {
                const projects = db.createObjectStore('projects', {autoIncrement: true})
                projects.createIndex('rating, id, nick', ['rating', 'id', 'nick'])
                projects.createIndex('rating, id', ['rating', 'id'])
                projects.createIndex('rating', 'rating')
                const vks = db.createObjectStore('vks', {autoIncrement: true})
                vks.createIndex('id', 'id')
                const proxies = db.createObjectStore('proxies', {autoIncrement: true})
                proxies.createIndex('ip, port', ['ip', 'port'])
                const borealis = db.createObjectStore('borealis', {autoIncrement: true})
                borealis.createIndex('nick', 'nick')
                const other = db.createObjectStore('other')
                // const other = transaction.objectStore('other')
                settings = {
                    disabledNotifStart: true,
                    disabledNotifInfo: false,
                    disabledNotifWarn: false,
                    disabledNotifError: false,
                    enabledSilentVote: true,
                    disabledCheckTime: false,
                    disabledCheckInternet: false,
                    enableCustom: false,
                    proxyBlackList: ["*vk.com", "*topcraft.ru", "*mctop.su", "*minecraftrating.ru", "*captcha.website", "*hcaptcha.com", "*google.com", "*gstatic.com", "*cloudflare.com", "<local>"],
                    stopVote: 0,
                    autoAuthVK: false,
                    clearVKCookies: true,
                    clearBorealisCookies: true,
                    repeatAttemptLater: true,
                    saveVKCredentials: false,
                    saveBorealisCredentials: false,
                    useMultiVote: true,
                    useProxyOnUnProxyTop: false
                }
                other.add(settings, 'settings')
                generalStats = {
                    successVotes: 0,
                    monthSuccessVotes: 0,
                    lastMonthSuccessVotes: 0,
                    errorVotes: 0,
                    laterVotes: 0,
                    lastSuccessVote: null,
                    lastAttemptVote: null,
                    added: Date.now()
                }
                other.add(generalStats, 'generalStats')
            } else if (oldVersion === 1) {
                const other = db.objectStore('other')
                other.get('settings').onsuccess = (event)=> {
                    const settings = event.target.result
                    settings.proxyBlackList = ["*vk.com", "*topcraft.ru", "*mctop.su", "*minecraftrating.ru", "*captcha.website", "*hcaptcha.com", "*google.com", "*gstatic.com", "*cloudflare.com", "<local>"]
                    settings.stopVote = 0
                    settings.autoAuthVK = false
                    settings.clearVKCookies = true
                    settings.clearBorealisCookies = true
                    settings.repeatAttemptLater = true
                    settings.saveVKCredentials = false
                    settings.saveBorealisCredentials = false
                    settings.useMultiVote = true
                    settings.useProxyOnUnProxyTop = false
                    other.put(settings, 'settings')
                }
                const vks = db.createObjectStore('vks', {autoIncrement: true})
                vks.createIndex('id', 'id')
                const proxies = db.createObjectStore('proxies', {autoIncrement: true})
                proxies.createIndex('ip, port', ['ip', 'port'])
                const borealis = db.createObjectStore('borealis', {autoIncrement: true})
                borealis.createIndex('nick', 'nick')
            }
        }
    })
    db.onerror = event => {
        if (background) {
            console.error(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error]))
        } else {
            createNotif(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error]), 'error')
        }
    }
    settings = await db.get('other', 'settings')
    generalStats = await db.get('other', 'generalStats')

    if (!background) return

    if (settings && !settings.disabledCheckTime) checkTime()

    checkVote()
}