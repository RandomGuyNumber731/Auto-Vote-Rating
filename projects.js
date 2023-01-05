//Список рейтингов
// noinspection JSUnusedGlobalSymbols,ES6ConvertVarToLetConst,SpellCheckingInspection,HttpUrlsUsage

var allProjects = {
    TopCraft: {
        voteURL: (project) => 'https://topcraft.ru/accounts/vk/login/?process=login&next=/servers/' + project.id + '/',
        pageURL: (project) => 'https://topcraft.ru/servers/' + project.id + '/',
        projectName: (doc) => doc.querySelector('.project-header > h1').textContent,
        exampleURL: () => ['https://topcraft.ru/servers/', '10496', '/'],
        URL: () => 'topcraft.ru',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    McTOP: {
        voteURL: (project) => 'https://mctop.su/accounts/vk/login/?process=login&next=/servers/' + project.id + '/',
        pageURL: (project) => 'https://mctop.su/servers/' + project.id + '/',
        projectName: (doc) => doc.querySelector('.project-header > h1').textContent,
        exampleURL: () => ['https://mctop.su/servers/', '5231', '/'],
        URL: () => 'mctop.su',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MCRate: {
        voteURL: (project) => 'http://mcrate.su/rate/' + project.id,
        pageURL: (project) => 'http://mcrate.su/project/' + project.id,
        projectName: (doc) => doc.querySelector('#center-main > .top_panel > h1').textContent,
        exampleURL: () => ['http://mcrate.su/rate/', '4396', ''],
        URL: () => 'mcrate.su',
        parseURL: (url) => ({id: url.pathname.split('/')[2]}),
        oneProject: () => 1,
        notFound: (doc) => doc.querySelector('div[class=error]') != null && doc.querySelector('div[class=error]').textContent.includes('Проект с таким ID не найден')
    },
    MinecraftRating: {
        voteURL: (project) => (project.game === 'projects') ? 'https://minecraftrating.ru/projects/' + project.id + '/' : 'https://minecraftrating.ru/vote/' + project.id + '/',
        pageURL: (project) => (project.game === 'projects') ? 'https://minecraftrating.ru/projects/' + project.id + '/' : 'https://minecraftrating.ru/vote/' + project.id + '/',
        projectName: (doc, project) => (project.game === 'projects') ? doc.querySelector('h1[itemprop="name"]').textContent.trim().replace('Проект ', '') : doc.querySelector('.page-header a').textContent,
        exampleURL: () => ['https://minecraftrating.ru/projects/', 'cubixworld', '/'],
        URL: () => 'minecraftrating.ru',
        parseURL: (url) => ({game: url.pathname.split('/')[1] === 'projects' ? 'projects': 'servers', id: url.pathname.split('/')[2]}),
    },
    MonitoringMinecraft: {
        voteURL: (project) => 'https://monitoringminecraft.ru/top/' + project.id + '/vote',
        pageURL: (project) => 'https://monitoringminecraft.ru/top/' + project.id + '/',
        projectName: (doc) => doc.querySelector('#cap h1').textContent,
        exampleURL: () => ['https://monitoringminecraft.ru/top/', 'gg', '/vote'],
        URL: () => 'monitoringminecraft.ru',
        parseURL: (url) => ({id: url.pathname.split('/')[2]}),
        silentVote: () => true
    },
    IonMc: {
        voteURL: (project) => 'https://ionmc.top/projects/' + project.id + '/vote',
        pageURL: (project) => 'https://ionmc.top/projects/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('#app h1.header').innerText.replace('Голосование за проект ', ''),
        exampleURL: () => ['https://ionmc.top/projects/', '80', '/vote'],
        URL: () => 'ionmc.top',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftServersOrg: {
        voteURL: (project) => 'https://minecraftservers.org/vote/' + project.id,
        pageURL: (project) => 'https://minecraftservers.org/server/' + project.id,
        projectName: (doc) => doc.querySelector('#left h1').textContent,
        exampleURL: () => ['https://minecraftservers.org/vote/', '25531', ''],
        URL: () => 'minecraftservers.org',
        parseURL: (url) => ({id: url.pathname.split('/')[2]}),
        oneProject: () => 1
    },
    ServeurPrive: {
        voteURL: (project) => 'https://serveur-prive.net/' + (project.lang === 'fr' ? '' : project.lang + '/') + project.game + '/' + project.id + '/vote',
        pageURL: (project) => 'https://serveur-prive.net/' + (project.lang === 'fr' ? '' : project.lang + '/') + project.game + '/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('#t h2').textContent,
        exampleURL: () => ['https://serveur-prive.net/minecraft/', 'gommehd-net-4932', '/vote'],
        URL: () => 'serveur-prive.net',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            if (paths[1].length === 2) {
                project.lang = paths[1]
                project.game = paths[2]
                project.id = paths[3]
            } else {
                project.lang = 'fr'
                project.game = paths[1]
                project.id = paths[2]
            }
            return project
        }
    },
    PlanetMinecraft: {
        voteURL: (project) => 'https://www.planetminecraft.com/server/' + project.id + '/vote/',
        pageURL: (project) => 'https://www.planetminecraft.com/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('#resource-title-text').textContent,
        exampleURL: () => ['https://www.planetminecraft.com/server/', 'legends-evolved', '/vote/'],
        URL: () => 'planetminecraft.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    TopG: {
        voteURL: (project) => 'https://topg.org/' + project.game + '/server-' + project.id,
        pageURL: (project) => 'https://topg.org/' + project.game + '/server-' + project.id,
        projectName: (doc) => doc.querySelector('div.sheader').textContent,
        exampleURL: () => ['https://topg.org/minecraft-servers/server-', '405637', ''],
        URL: () => 'topg.org',
        parseURL: (url) => ({ game: url.pathname.split('/')[1], id: url.pathname.split('/')[2].replace('server-', '')})
    },
    ListForge: {
        voteURL: (project) => 'https://' + project.game + '/server/' + project.id + '/vote/' + (project.addition != null ? project.addition : ''),
        pageURL: (project) => 'https://' + project.game + '/server/' + project.id + '/vote/',
        projectName: (doc) => doc.querySelector('head > title').textContent.replace('Vote for ', ''),
        exampleURL: () => ['https://minecraft-mp.com/server/', '81821', '/vote/'],
        URL: () => 'listforge.net',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            project.game = url.host
            if (paths[1].startsWith('server-s')) {
                project.id = paths[1].replace('server-s', '')
            } else {
                project.id = paths[2]
            }
            if (url.search && url.search.length > 0) {
                project.addition = url.search
            } else {
                project.addition = ''
            }
            return project
        },
        notFound: (doc) => {
            for (const el of doc.querySelectorAll('div.alert.alert-info')) {
                if (el.textContent.includes('server has been removed')) {
                    return el.textContent.trim()
                }
            }
            for (const el of doc.querySelectorAll('span.badge')) {
                if (el.textContent.includes('server has been removed')) {
                    return el.textContent.trim()
                }
            }
        }
    },
    MinecraftServerList: {
        voteURL: (project) => 'https://minecraft-server-list.com/server/' + project.id + '/vote/',
        pageURL: (project) => 'https://minecraft-server-list.com/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('.server-heading > a').textContent,
        exampleURL: () => ['https://minecraft-server-list.com/server/', '292028', '/vote/'],
        URL: () => 'minecraft-server-list.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ServerPact: {
        voteURL: (project) => 'https://www.serverpact.com/vote-' + project.id,
        pageURL: (project) => 'https://www.serverpact.com/vote-' + project.id,
        projectName: (doc) => doc.querySelector('h1.sp-title').textContent.trim().replace('Vote for ', ''),
        exampleURL: () => ['https://www.serverpact.com/vote-', '26492123', ''],
        URL: () => 'serverpact.com',
        parseURL: (url) => ({id: url.pathname.split('/')[1].replace('vote-', '')}),
        oneProject: () => 1,
        notFound: (doc) => doc.querySelector('div.container > div.row > div > center') != null && doc.querySelector('div.container > div.row > div > center').textContent.includes('This server does not exist'),
        silentVote: () => true
    },
    MinecraftIpList: {
        voteURL: (project) => 'https://minecraftiplist.com/index.php?action=vote&listingID=' + project.id,
        pageURL: (project) => 'https://minecraftiplist.com/server/-' + project.id,
        projectName: (doc) => doc.querySelector('h2.motdservername').textContent,
        exampleURL: () => ['https://minecraftiplist.com/index.php?action=vote&listingID=', '2576', ''],
        URL: () => 'minecraftiplist.com',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            if (paths[1] === 'server') {
                project.id = paths[2]
            } else {
                project.id = url.searchParams.get('listingID')
            }
            return project
        },
        oneProject: () => 5,
        notFound: (doc) => doc.querySelector('#addr > span:nth-child(3)') == null,
        silentVote: () => true
    },
    TopMinecraftServers: {
        voteURL: (project) => 'https://topminecraftservers.org/vote/' + project.id,
        pageURL: (project) => 'https://topminecraftservers.org/server/' + project.id,
        projectName: (doc) => doc.querySelector('h1[property="name"]').textContent,
        exampleURL: () => ['https://topminecraftservers.org/vote/', '9126', ''],
        URL: () => 'topminecraftservers.org',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftServersBiz: {
        voteURL: (project) => 'https://minecraftservers.biz/' + project.id + '/',
        pageURL: (project) => 'https://minecraftservers.biz/' + project.id + '/',
        projectName: (doc) => doc.querySelector('.panel-heading strong').textContent.trim(),
        exampleURL: () => ['https://minecraftservers.biz/', 'purpleprison', '/#vote_now'],
        URL: () => 'minecraftservers.biz',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    HotMC: {
        voteURL: (project) => 'https://hotmc.ru/vote-' + project.id,
        pageURL: (project) => 'https://hotmc.ru/minecraft-server-' + project.id,
        projectName: (doc) => doc.querySelector('div.text-server > h1').textContent.replace(' сервер Майнкрафт', ''),
        exampleURL: () => ['https://hotmc.ru/vote-', '199493', ''],
        URL: () => 'hotmc.ru',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            project.id = paths[1]
            project.id = project.id.replace('vote-', '')
            project.id = project.id.replace('minecraft-server-', '')
            return project
        },
        oneProject: () => 1
    },
    MinecraftServerNet: {
        voteURL: (project) => 'https://minecraft-server.net/vote/' + project.id + '/',
        pageURL: (project) => 'https://minecraft-server.net/details/' + project.id + '/',
        projectName: (doc) => doc.querySelector('div.card-header > h2').textContent,
        exampleURL: () => ['https://minecraft-server.net/vote/', 'TitanicFreak', '/'],
        URL: () => 'minecraft-server.net',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    TopGames: {
        voteURL: (project) => {
            if (project.lang === 'fr') {
                return 'https://top-serveurs.net/' + project.game + '/vote/' + project.id
            } else if (project.lang === 'en') {
                return 'https://top-games.net/' + project.game + '/vote/' + project.id
            } else {
                return 'https://' + project.lang + '.top-games.net/' + project.game + '/vote/' + project.id
            }
        },
        pageURL: (project) => {
            if (project.lang === 'fr') {
                return 'https://top-serveurs.net/' + project.game + '/' + project.id
            } else if (project.lang === 'en') {
                return 'https://top-games.net/' + project.game + '/' + project.id
            } else {
                return 'https://' + project.lang + '.top-games.net/' + project.game + '/' + project.id
            }
        },
        projectName: (doc) => doc.querySelector('div.top-description h1').textContent,
        exampleURL: () => ['https://top-serveurs.net/minecraft/', 'icesword-pvpfaction-depuis-2014-crack-on', ''],
        URL: () => 'top-games.net',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            if (url.hostname === 'top-serveurs.net') {
                project.lang = 'fr'
            } else if (url.hostname === 'top-games.net') {
                project.lang = 'en'
            } else {
                project.lang = url.hostname.split('.')[0]
            }
            project.game = paths[1]
            project.id = paths[2]
            return project
        }
    },
    TMonitoring: {
        voteURL: (project) => 'https://tmonitoring.com/server/' + project.id + '/',
        pageURL: (project) => 'https://tmonitoring.com/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('div[class="info clearfix"] > div.pull-left > h1').textContent,
        exampleURL: () => ['https://tmonitoring.com/server/', 'qoobworldru', ''],
        URL: () => 'tmonitoring.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    TopGG: {
        voteURL: (project) => 'https://top.gg/' + project.game + '/' + project.id + '/vote' + project.addition,
        pageURL: (project) => 'https://top.gg/' + project.game + '/' + project.id + '/vote',
        projectName: (doc) => {
            for (const element of doc.querySelectorAll('h1')) {
                if (element.textContent.includes('Voting for ')) {
                    return element.textContent.replace('Voting for', '')
                }
            }
        },
        exampleURL: () => ['https://top.gg/bot/', '270904126974590976', '/vote'],
        URL: () => 'top.gg',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            project.game = paths[1]
            project.id = paths[2]
            if (url.search && url.search.length > 0) {
                project.addition = url.search
            } else {
                project.addition = ''
            }
            return project
        }
    },
    DiscordBotList: {
        voteURL: (project) => 'https://discordbotlist.com/' + project.game + '/' + project.id + '/upvote',
        pageURL: (project) => 'https://discordbotlist.com/' + project.game + '/' + project.id,
        projectName: (doc) => doc.querySelector('h1.bot-name').textContent.trim(),
        exampleURL: () => ['https://discordbotlist.com/bots/', 'dank-memer', '/upvote'],
        URL: () => 'discordbotlist.com',
        parseURL: (url) => ({game: url.pathname.split('/')[1], id: url.pathname.split('/')[2]})
    },
    Discords: {
        voteURL: (project) => 'https://discords.com/' + project.game + '/' + project.id + (project.game === 'servers' ? '/upvote' : '/vote'),
        pageURL: (project) => 'https://discords.com/' + project.game + '/' + project.id,
        projectName: (doc, project) => project.game === 'servers' ? doc.querySelector('.servernameh1').textContent : doc.querySelector('.bot-title-bp h2').textContent,
        exampleURL: () => ['https://discords.com/bots/bot/', '469610550159212554', '/vote'],
        URL: () => 'discords.com',
        parseURL: (url) => ({game: url.pathname.split('/')[1], id: url.pathname.split('/')[2]})
    },
    MMoTopRU: {
        voteURL: (project) => {
            if (project.lang === 'ru') {
                return 'https://' + project.game + '.mmotop.ru/servers/' + project.id + '/votes/new'
            } else {
                return 'https://' + project.game + '.mmotop.ru/' + project.lang + '/' + 'servers/' + project.id + '/votes/new'
            }
        },
        pageURL: (project) => {
            if (project.lang === 'ru') {
                return 'https://' + project.game + '.mmotop.ru/servers/' + project.id
            } else {
                return 'https://' + project.game + '.mmotop.ru/' + project.lang + '/' + 'servers/' + project.id
            }
        },
        projectName: (doc) => doc.querySelector('.server-one h1').textContent,
        exampleURL: () => ['https://pw.mmotop.ru/servers/', '25895', '/votes/new'],
        URL: () => 'mmotop.ru',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            project.game = url.hostname.split('.')[0]
            if (paths[1] === 'servers') {
                project.lang = 'ru'
                project.id = paths[2]
            } else {
                project.lang = paths[1]
                project.id = paths[3]
            }
            return project
        },
        oneProject: () => 1
    },
    MCServers: {
        voteURL: (project) => 'https://mc-servers.com/vote/' + project.id + '/',
        pageURL: (project) => 'https://mc-servers.com/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('.main-panel h1').textContent,
        exampleURL: () => ['https://mc-servers.com/server/', '1890', '/'],
        URL: () => 'mc-servers.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftList: {
        voteURL: (project) => 'https://minecraftlist.org/vote/' + project.id,
        pageURL: (project) => 'https://minecraftlist.org/server/' + project.id,
        projectName: (doc) => doc.querySelector('.container h1').textContent.trim().replace('Minecraft Server', ''),
        exampleURL: () => ['https://minecraftlist.org/vote/', '11227', ''],
        URL: () => 'minecraftlist.org',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftIndex: {
        voteURL: (project) => 'https://www.minecraft-index.com/' + project.id + '/vote',
        pageURL: (project) => 'https://www.minecraft-index.com/' + project.id,
        projectName: (doc) => doc.querySelector('h3.stitle').textContent,
        exampleURL: () => ['https://www.minecraft-index.com/', '33621-extremecraft-net', '/vote'],
        URL: () => 'minecraft-index.com',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    ServerList101: {
        voteURL: (project) => 'https://serverlist101.com/server/' + project.id + '/vote/',
        pageURL: (project) => 'https://serverlist101.com/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('.container li h1').textContent,
        exampleURL: () => ['https://serverlist101.com/server/', '1547', '/vote/'],
        URL: () => 'serverlist101.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MCServerList: {
        voteURL: (project) => 'https://mcserver-list.eu/hlasovat/' + project.id,
        pageURL: (project) => 'https://mcserver-list.eu/hlasovat/' + project.id,
        projectName: (doc) => doc.querySelector('.serverdetail h1').textContent,
        exampleURL: () => ['https://mcserver-list.eu/hlasovat/', '416', ''],
        URL: () => 'mcserver-list.eu',
        parseURL: (url) => ({id: url.pathname.split('/')[2]}),
        silentVote: () => true
    },
    CraftList: {
        voteURL: (project) => 'https://craftlist.org/' + project.id,
        pageURL: (project) => 'https://craftlist.org/' + project.id,
        projectName: (doc) => doc.querySelector('main h1').textContent,
        exampleURL: () => ['https://craftlist.org/', 'basicland', ''],
        URL: () => 'craftlist.org',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    CzechCraft: {
        voteURL: (project) => 'https://czech-craft.eu/server/' + project.id + '/vote/',
        pageURL: (project) => 'https://czech-craft.eu/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('a.server-name').textContent,
        exampleURL: () => ['https://czech-craft.eu/server/', 'trenend', '/vote/'],
        URL: () => 'czech-craft.eu',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftBuzz: {
        voteURL: (project) => 'https://minecraft.buzz/vote/' + project.id,
        pageURL: (project) => 'https://minecraft.buzz/server/' + project.id,
        projectName: (doc) => doc.querySelector('#vote-line').previousElementSibling.textContent.trim(),
        exampleURL: () => ['https://minecraft.buzz/vote/', '306', ''],
        URL: () => 'minecraft.buzz',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftServery: {
        voteURL: (project) => 'https://minecraftservery.eu/server/' + project.id,
        pageURL: (project) => 'https://minecraftservery.eu/server/' + project.id,
        projectName: (doc) => doc.querySelector('div.container div.box h1.title').textContent,
        exampleURL: () => ['https://minecraftservery.eu/server/', '105', ''],
        URL: () => 'minecraftservery.eu',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    RPGParadize: {
        voteURL: (project) => 'https://www.rpg-paradize.com/?page=vote&vote=' + project.id,
        pageURL: (project) => 'https://www.rpg-paradize.com/site--' + project.id,
        projectName: (doc) => doc.querySelector('div.div-box > h1').textContent.replace('Vote : ', ''),
        exampleURL: () => ['https://www.rpg-paradize.com/?page=vote&vote=', '113763', ''],
        URL: () => 'rpg-paradize.com',
        parseURL: (url) => {
            const project = {}
            if (url.searchParams.has('vote')) {
                project.id = url.searchParams.get('vote')
            } else {
                const paths = url.pathname.split('/')
                const names = paths[1].split('-')
                project.id = names[names.length - 1]
            }
            return project
        }
    },
    MinecraftServerListNet: {
        voteURL: (project) => 'https://www.minecraft-serverlist.net/vote/' + project.id,
        pageURL: (project) => 'https://www.minecraft-serverlist.net/vote/' + project.id,
        projectName: (doc) => doc.querySelector('a.server-name').textContent.trim(),
        exampleURL: () => ['https://www.minecraft-serverlist.net/vote/', '51076', ''],
        URL: () => 'minecraft-serverlist.net',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftServerEu: {
        voteURL: (project) => 'https://minecraft-server.eu/vote/index/' + project.id,
        pageURL: (project) => 'https://minecraft-server.eu/server/index/' + project.id,
        projectName: (doc) => doc.querySelector('div.serverName').textContent,
        exampleURL: () => ['https://minecraft-server.eu/vote/index/', '1A73C', ''],
        URL: () => 'minecraft-server.eu',
        parseURL: (url) => ({id: url.pathname.split('/')[3]})
    },
    MinecraftKrant: {
        voteURL: (project) => 'https://www.minecraftkrant.nl/serverlijst/' + project.id,
        pageURL: (project) => 'https://www.minecraftkrant.nl/serverlijst/' + project.id,
        projectName: (doc) => doc.querySelector('div.inner-title').firstChild.textContent.trim(),
        exampleURL: () => ['https://www.minecraftkrant.nl/serverlijst/', 'torchcraft', ''],
        URL: () => 'minecraftkrant.nl',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    TrackyServer: {
        voteURL: (project) => 'https://www.trackyserver.com/server/' + project.id,
        pageURL: (project) => 'https://www.trackyserver.com/server/' + project.id,
        projectName: (doc) => doc.querySelector('div.panel h1').textContent.trim(),
        exampleURL: () => ['https://www.trackyserver.com/server/', 'anubismc-486999', ''],
        URL: () => 'trackyserver.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MCListsOrg: {
        voteURL: (project) => 'https://mc-lists.org/' + project.id + '/vote',
        pageURL: (project) => 'https://mc-lists.org/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('div.header > div.ui.container').textContent.trim(),
        exampleURL: () => ['https://mc-lists.org/', 'server-luxurycraft.1818', '/vote'],
        URL: () => 'mc-lists.org',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    TopMCServersCom: {
        voteURL: (project) => 'https://topmcservers.com/server/' + project.id + '/vote',
        pageURL: (project) => 'https://topmcservers.com/server/' + project.id,
        projectName: (doc) => doc.querySelector('#serverPage h1.header').textContent,
        exampleURL: () => ['https://topmcservers.com/server/', '17', '/vote'],
        URL: () => 'topmcservers.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    BestServersCom: {
        voteURL: (project) => 'https://bestservers.com/server/' + project.id + '/vote',
        pageURL: (project) => 'https://bestservers.com/server/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('th.server').textContent.trim(),
        exampleURL: () => ['https://bestservers.com/server/', '1135', '/vote'],
        URL: () => 'bestservers.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    CraftListNet: {
        voteURL: (project) => 'https://craft-list.net/minecraft-server/' + project.id + '/vote',
        pageURL: (project) => 'https://craft-list.net/minecraft-server/' + project.id,
        projectName: (doc) => doc.querySelector('div.serverpage-navigation-headername.header').firstChild.textContent.trim(),
        exampleURL: () => ['https://craft-list.net/minecraft-server/', 'Advancius-Network', '/vote'],
        URL: () => 'craft-list.net',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftServersListOrg: {
        voteURL: (project) => 'https://www.minecraft-servers-list.org/index.php?a=in&u=' + project.id,
        pageURL: (project) => 'https://www.minecraft-servers-list.org/details/' + project.id + '/',
        projectName: (doc) => doc.querySelector('div.card-header > h1').textContent.trim(),
        exampleURL: () => ['https://www.minecraft-servers-list.org/index.php?a=in&u=', 'chromity', ''],
        URL: () => 'minecraft-servers-list.org',
        parseURL: (url) => {
            const project = {}
            if (url.searchParams.has('u')) {
                project.id = url.searchParams.get('u')
            } else {
                const paths = url.pathname.split('/')
                project.id = paths[2]
            }
            return project
        }
    },
    ServerListe: {
        voteURL: (project) => 'https://serverliste.net/vote/' + project.id,
        pageURL: (project) => 'https://serverliste.net/vote/' + project.id,
        projectName: (doc) => doc.querySelector('.justify-content-center h3').textContent.trim(),
        exampleURL: () => ['https://serverliste.net/vote/', '775', ''],
        URL: () => 'serverliste.net',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    gTop100: {
        voteURL: (project) => 'https://gtop100.com/topsites/' + project.game + '/sitedetails/' + project.id + '?vote=1&pingUsername=' + project.nick,
        pageURL: (project) => 'https://gtop100.com/topsites/' + project.game + '/sitedetails/' + project.id + '?vote=1',
        projectName: (doc) => doc.querySelector('[itemprop="name"]').textContent.trim(),
        exampleURL: () => ['https://gtop100.com/topsites/MapleStory/sitedetails/', 'Ristonia--v224--98344', '?vote=1&pingUsername=kingcloudian'],
        URL: () => 'gtop100.com',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            project.game = paths[2]
            project.id = paths[4]
            return project
        }
    },
    WARGM: {
        voteURL: (project) => 'https://wargm.ru/server/' + project.id + '/votes',
        pageURL: (project) => 'https://wargm.ru/server/' + project.id,
        projectName: (doc) => doc.querySelector('#header h1').textContent,
        exampleURL: () => ['https://wargm.ru/server/', '23394', '/votes'],
        URL: () => 'wargm.ru',
        parseURL: (url) => ({id: url.pathname.split('/')[2]}),
        needIsTrusted: () => true
    },
    MineStatus: {
        voteURL: (project) => 'https://minestatus.net/server/vote/' + project.id,
        pageURL: (project) => 'https://minestatus.net/server/' + project.id,
        projectName: (doc) => doc.querySelector('h1.section-title').textContent.trim(),
        exampleURL: () => ['https://minestatus.net/server/vote/', 'mine.sylphmc.com', ''],
        URL: () => 'minestatus.net',
        parseURL: (url) => ({id: url.pathname.split('/')[2] === 'vote' ? url.pathname.split('/')[3] : url.pathname.split('/')[2]})
    },
    MisterLauncher: {
        voteURL: (project) => {
            if (project.game === 'projects') return 'https://oauth.vk.com/authorize?client_id=7636705&display=page&redirect_uri=https://misterlauncher.org/projects/' + project.id + '/&state=' + project.nick + '&response_type=code'
            else return 'https://misterlauncher.org/vote/' + project.id + '/'
        },
        pageURL: (project) => {
            if (project.game === 'projects') return 'https://misterlauncher.org/projects/' + project.id + '/'
            else return 'https://misterlauncher.org/vote/' + project.id + '/'
        },
        projectName: (doc, project) => {
            if (project.game === 'projects') return doc.querySelector('h1[itemprop="name"]').textContent.trim().replace('Проект ', '')
            else return doc.querySelector('.page-vote a').textContent
        },
        exampleURL: () => ['https://misterlauncher.org/projects/', 'omegamc', '/'],
        URL: () => 'misterlauncher.org',
        parseURL: (url) => ({id: url.pathname.split('/')[2]}),
        silentVote: (project) => project.game === 'projects'
    },
    MinecraftServersDe: {
        voteURL: (project) => 'https://minecraft-servers.de/server/' + project.id + '/vote',
        pageURL: (project) => 'https://minecraft-servers.de/server/' + project.id,
        projectName: (doc) => doc.querySelector('div.container h1').textContent,
        exampleURL: () => ['https://minecraft-servers.de/server/', 'twerion', '/vote'],
        URL: () => 'minecraft-servers.de',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    DiscordBoats: {
        voteURL: (project) => 'https://discord.boats/bot/' + project.id + '/vote',
        pageURL: (project) => 'https://discord.boats/bot/' + project.id,
        projectName: (doc) => doc.querySelector('div.container h3 > span').textContent,
        exampleURL: () => ['https://discord.boats/bot/', '557628352828014614', '/vote'],
        URL: () => 'discord.boats',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ServerListGames: {
        voteURL: (project) => 'https://serverlist.games/vote/' + project.id,
        pageURL: (project) => 'https://serverlist.games/server/' + project.id,
        projectName: (doc) => doc.querySelector('div.card-title-server h5').textContent,
        exampleURL: () => ['https://serverlist.games/vote/', '2052', ''],
        URL: () => 'serverlist.games',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    BestMinecraftServers: {
        voteURL: (project) => 'https://best-minecraft-servers.co/' + project.id + '/vote',
        pageURL: (project) => 'https://best-minecraft-servers.co/' + project.id,
        projectName: (doc) => doc.querySelector('table.info th').textContent.trim(),
        exampleURL: () => ['https://best-minecraft-servers.co/', 'server-hypixel-network.30', '/vote'],
        URL: () => 'best-minecraft-servers.co',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    MinecraftServers100: {
        voteURL: (project) => 'https://minecraftservers100.com/vote/' + project.id,
        pageURL: (project) => 'https://minecraftservers100.com/vote/' + project.id,
        projectName: (doc) => doc.querySelector('div.page-header').textContent.trim().replace('Vote for ', ''),
        exampleURL: () => ['https://minecraftservers100.com/vote/', '2340', ''],
        URL: () => 'minecraftservers100.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MCServerListCZ: {
        voteURL: (project) => 'https://mc-serverlist.cz/' + project.id + '/vote',
        pageURL: (project) => 'https://mc-serverlist.cz/' + project.id,
        projectName: (doc) => doc.querySelector('table.info th').textContent.trim(),
        exampleURL: () => ['https://mc-serverlist.cz/', 'server-lendmark.27', '/vote'],
        URL: () => 'mc-serverlist.cz',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    MineServers: {
        voteURL: (project) => 'https://' + project.game + '/server/' + project.id + '/vote',
        pageURL: (project) => 'https://' + project.game + '/server/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('#title h1').textContent,
        exampleURL: () => ['https://mineservers.com/server/', 'jvvHdPJy', '/vote'],
        URL: () => 'mineservers.com',
        parseURL: (url) => ({game: url.hostname, id: url.pathname.split('/')[2]})
    },
    ATLauncher: {
        voteURL: (project) => 'https://atlauncher.com/servers/server/' + project.id + '/vote',
        pageURL: (project) => 'https://atlauncher.com/servers/server/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('ol li:nth-child(3)').textContent.trim(),
        exampleURL: () => ['https://atlauncher.com/servers/server/', 'KineticNetworkSkyfactory4', '/vote'],
        URL: () => 'atlauncher.com',
        parseURL: (url) => ({id: url.pathname.split('/')[3]})
    },
    ServersMinecraft: {
        voteURL: (project) => 'https://servers-minecraft.net/' + project.id + '/vote',
        pageURL: (project) => 'https://servers-minecraft.net/' + project.id,
        projectName: (doc) => doc.querySelector('div.text-xl').textContent,
        exampleURL: () => ['https://servers-minecraft.net/', 'server-complex-gaming.58', '/vote'],
        URL: () => 'servers-minecraft.net',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    MinecraftListCZ: {
        voteURL: (project) => 'https://www.minecraft-list.cz/server/' + project.id + '/vote',
        pageURL: (project) => 'https://www.minecraft-list.cz/server/' + project.id,
        projectName: (doc) => doc.querySelector('.content__box__server__content__detail__firstRow .text-center').textContent.trim(),
        exampleURL: () => ['https://www.minecraft-list.cz/server/', 'czech-survival', '/vote'],
        URL: () => 'minecraft-list.cz',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ListeServeursMinecraft: {
        voteURL: (project) => 'https://www.liste-serveurs-minecraft.org/vote/?idc=' + project.id,
        pageURL: (project) => 'https://www.liste-serveurs-minecraft.org/vote/?idc=' + project.id,
        projectName: (doc) => {
            if (doc.querySelector('span.wlt_shortcode_TITLE-NOLINK')) {
                doc.querySelector('span.wlt_shortcode_TITLE-NOLINK').textContent
            } else {
                doc.querySelector('#gdrtsvote font[color="blue"]').textContent
            }
        },
        exampleURL: () => ['https://www.liste-serveurs-minecraft.org/vote/?idc=', '202085', ''],
        URL: () => 'liste-serveurs-minecraft.org',
        parseURL: (url) => {
            const project = {}
            if (url.searchParams.has('idc')) {
                project.id = url.searchParams.get('idc')
            } else {
                project.id = url.pathname.split('/')[2]
            }
            return project
        },
        notFound: (doc) => doc.querySelector('#core_middle_column div.panel-body') != null && doc.querySelector('#core_middle_column div.panel-body').textContent.includes('serveur est introuvable')
    },
    MCServidores: {
        voteURL: (project) => 'https://mcservidores.com/servidor/' + project.id,
        pageURL: (project) => 'https://mcservidores.com/servidor/' + project.id,
        projectName: (doc) => doc.querySelector('#panel h1').textContent.trim(),
        exampleURL: () => ['https://mcservidores.com/servidor/', '122', ''],
        URL: () => 'mcservidores.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]}),
        oneProject: () => 1
    },
    XtremeTop100: {
        voteURL: (project) => 'https://www.xtremetop100.com/in.php?site=' + project.id,
        pageURL: (project) => 'https://www.xtremetop100.com/in.php?site=' + project.id,
        projectName: (doc) => doc.querySelector('#topbanner form[method="POST"] input[type="submit"]').value.replace('Vote for ', ''),
        exampleURL: () => ['https://www.xtremetop100.com/in.php?site=', '1132370645', ''],
        URL: () => 'xtremetop100.com',
        parseURL: (url) => {
            const project = {}
            if (url.searchParams.has('site')) {
                project.id = url.searchParams.get('site')
            } else {
                project.id = url.pathname.split('/')[1].replace('sitedetails-', '')
            }
            return project
        }
    },
    MinecraftServerSk: {
        voteURL: (project) => 'https://minecraft-server.sk/' + project.id + '/vote',
        pageURL: (project) => 'https://minecraft-server.sk/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('.server.icon').parentElement.innerText.trim(),
        exampleURL: () => ['https://minecraft-server.sk/', 'server-luoend.52', '/vote'],
        URL: () => 'minecraft-server.sk',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ServeursMinecraftOrg: {
        voteURL: (project) => 'https://www.serveursminecraft.org/serveur/' + project.id + '/',
        pageURL: (project) => 'https://www.serveursminecraft.org/serveur/' + project.id + '/',
        projectName: (doc) => doc.querySelector('div.panel-heading b').textContent,
        exampleURL: () => ['https://www.serveursminecraft.org/serveur/', '1017', '/'],
        URL: () => 'serveursminecraft.org',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ServeursMCNet: {
        voteURL: (project) => 'https://serveurs-mc.net/serveur/' + project.id + '/voter',
        pageURL: (project) => 'https://serveurs-mc.net/serveur/' + project.id,
        projectName: (doc) => doc.querySelector('h1.text-center').textContent,
        exampleURL: () => ['https://serveurs-mc.net/serveur/', '82', '/voter'],
        URL: () => 'serveurs-mc.net',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ServeursMinecraftCom: {
        voteURL: (project) => 'https://serveur-minecraft.com/' + project.id,
        pageURL: (project) => 'https://serveur-minecraft.com/' + project.id,
        projectName: (doc) => doc.querySelector('div.title h1').textContent,
        exampleURL: () => ['https://serveur-minecraft.com/', '2908', ''],
        URL: () => 'serveur-minecraft.com',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    ServeurMinecraftVoteFr: {
        voteURL: (project) => 'https://serveur-minecraft-vote.fr/serveurs/' + project.id + '/vote',
        pageURL: (project) => 'https://serveur-minecraft-vote.fr/serveurs/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('.server-name').textContent,
        exampleURL: () => ['https://serveur-minecraft-vote.fr/serveurs/', 'ectalia.425', '/vote'],
        URL: () => 'serveur-minecraft-vote.fr',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MineBrowseCom: {
        voteURL: (project) => 'https://minebrowse.com/server/' + project.id,
        pageURL: (project) => 'https://minebrowse.com/server/' + project.id,
        projectName: (doc) => doc.querySelector('title').textContent.replace(' - Minebrowse Minecraft Server List', ''),
        exampleURL: () => ['https://minebrowse.com/server/', '1638', ''],
        URL: () => 'minebrowse.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MCServerListCom: {
        voteURL: (project) => 'https://mc-server-list.com/server/' + project.id +'/vote/',
        pageURL: (project) => 'https://mc-server-list.com/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('h2.header').textContent,
        exampleURL: () => ['https://mc-server-list.com/server/', '127-Armageddon+Server', '/vote/'],
        URL: () => 'mc-server-list.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ServerLocatorCom: {
        voteURL: (project) => 'https://serverlocator.com/vote/' + project.id,
        pageURL: (project) => 'https://serverlocator.com/server/' + project.id,
        projectName: (doc) => doc.querySelector('.content_head h2').textContent,
        exampleURL: () => ['https://serverlocator.com/vote/', '440', ''],
        URL: () => 'serverlocator.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    TopMmoGamesRu: {
        voteURL: (project) => 'https://top-mmogames.ru/' + project.id,
        pageURL: (project) => 'https://top-mmogames.ru/' + project.id,
        projectName: (doc) => doc.querySelector('.gamefeatures [itemprop="name"]').textContent,
        exampleURL: () => ['https://top-mmogames.ru/', 'server-wow-amdfun', ''],
        URL: () => 'top-mmogames.ru',
        parseURL: (url) => ({id: url.pathname.split('/')[1]}),
        needPrompt: () => true
    },
    MmoRpgTop: {
        voteURL: (project) => 'https://' + project.game +'.mmorpg.top/server/' + project.id,
        pageURL: (project) => 'https://' + project.game +'.mmorpg.top/server/' + project.id,
        projectName: (doc) => doc.querySelector('.title [itemprop="name"]').textContent,
        exampleURL: () => ['https://wow.mmorpg.top/server/', '23', ''],
        URL: () => 'mmorpg.top',
        parseURL: (url) => ({game: url.hostname.split('.')[0], id: url.pathname.split('/')[2]})
    },
    MmoVoteRu: {
        voteURL: (project) => 'https://' + project.game +'.mmovote.ru/ru/vote/' + project.id,
        pageURL: (project) => 'https://' + project.game +'.mmovote.ru/ru/vote/' + project.id,
        projectName: (doc) => doc.querySelector('.content .box h2').textContent.replace('Голосование за ', ''),
        exampleURL: () => ['https://wow.mmovote.ru/ru/vote/', '85', ''],
        URL: () => 'mmovote.ru',
        parseURL: (url) => ({game: url.hostname.split('.')[0], id: url.pathname.split('/')[3]})
    },
    McMonitoringInfo: {
        voteURL: (project) => {
            if (project.game === 'minecraft') {
                return 'https://mc-monitoring.info/server/vote/' + project.id
            } else {
                return 'https://mc-monitoring.info/' + project.game + '/server/vote/' + project.id
            }
        },
        pageURL: (project) => {
            if (project.game === 'minecraft') {
                return 'https://mc-monitoring.info/server/' + project.id
            } else {
                return 'https://mc-monitoring.info/' + project.game + '/server/' + project.id
            }
        },
        projectName: (doc) => doc.querySelector('.hello h1').textContent.replace('Игровой сервер ', ''),
        exampleURL: () => ['https://mc-monitoring.info/wow/server/vote/', '112', ''],
        URL: () => 'mc-monitoring.info',
        parseURL: (url) => {
            const project = {}
            const paths = url.pathname.split('/')
            if (paths[1] === 'server') {
                if (paths[2] === 'vote') {
                    project.id = paths[3]
                } else {
                    project.id = paths[2]
                }
                project.game = 'minecraft'
            } else {
                if (paths[3] === 'vote') {
                    project.id = paths[4]
                } else {
                    project.id = paths[3]
                }
                project.game = paths[1]
            }
            return project
        }
    },
    McServerTimeCom: {
        voteURL: (project) => 'https://mcservertime.com/' + project.id + '/vote',
        pageURL: (project) => 'https://mcservertime.com/' + project.id,
        projectName: (doc) => doc.querySelector('.server.icon').parentElement.innerText.trim(),
        exampleURL: () => ['https://mcservertime.com/', 'server-blastmc-asia.1399', '/vote'],
        URL: () => 'mcservertime.com',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    ListeServeursFr: {
        voteURL: (project) => 'https://www.liste-serveurs.fr/' + project.id + '/vote',
        pageURL: (project) => 'https://www.liste-serveurs.fr/' + project.id,
        projectName: (doc) => doc.querySelector('.server.icon').parentElement.innerText.trim(),
        exampleURL: () => ['https://www.liste-serveurs.fr/', 'server-pixel-prime-serveur-pixelmon.512', '/vote'],
        URL: () => 'liste-serveurs.fr',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    ServeurMinecraftFr: {
        voteURL: (project) => 'https://serveur-minecraft.fr/' + project.id + '/vote',
        pageURL: (project) => 'https://serveur-minecraft.fr/' + project.id,
        projectName: (doc) => doc.querySelector('.server.icon').parentElement.innerText.trim(),
        exampleURL: () => ['https://serveur-minecraft.fr/', 'server-oneblock-farm2win.525', '/vote'],
        URL: () => 'serveur-minecraft.fr',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    MineServTop: {
        voteURL: (project) => 'https://mineserv.top/' + project.id,
        pageURL: (project) => 'https://mineserv.top/' + project.id,
        projectName: (doc) => doc.querySelector('.project-name h1').textContent,
        exampleURL: () => ['https://mineserv.top/', 'epserv', ''],
        URL: () => 'mineserv.top',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    Top100ArenaCom: {
        voteURL: (project) => 'https://www.top100arena.com/listing/' + project.id + '/vote',
        pageURL: (project) => 'https://www.top100arena.com/listing/' + project.id + '/vote',
        projectName: (doc) => doc.querySelector('.container.text-center h1.h2').textContent,
        exampleURL: () => ['https://www.top100arena.com/listing/', '94246', '/vote'],
        URL: () => 'top100arena.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftBestServersCom: {
        voteURL: (project) => 'https://minecraftbestservers.com/' + project.id + '/vote',
        pageURL: (project) => 'https://minecraftbestservers.com/' + project.id,
        projectName: (doc) => doc.querySelector('table .server.icon').parentElement.innerText.trim(),
        exampleURL: () => ['https://minecraftbestservers.com/', 'server-cherry-survival.4599', '/vote'],
        URL: () => 'minecraftbestservers.com',
        parseURL: (url) => ({id: url.pathname.split('/')[1]})
    },
    MCLikeCom: {
        voteURL: (project) => 'https://mclike.com/vote-' + project.id,
        pageURL: (project) => 'https://mclike.com/minecraft-server-' + project.id,
        projectName: (doc) => doc.querySelector('div.text-server > h1').textContent.replace('Minecraft server ', ''),
        exampleURL: () => ['https://mclike.com/vote-', '188444', ''],
        URL: () => 'mclike.com',
        parseURL: (url) => {
            const project = {}
            project.id = url.pathname.split('/')[1]
            project.id = project.id.replace('vote-', '')
            project.id = project.id.replace('minecraft-server-', '')
            return project
        },
        oneProject: () => 1
    },
    PixelmonServerListCom: {
        voteURL: (project) => 'https://pixelmon-server-list.com/server/' + project.id + '/vote',
        pageURL: (project) => 'https://pixelmon-server-list.com/server/' + project.id,
        projectName: (doc) => doc.querySelector('.page-header h1').textContent,
        exampleURL: () => ['https://pixelmon-server-list.com/server/', '181', '/vote'],
        URL: () => 'pixelmon-server-list.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftServerSk2: {
        voteURL: (project) => 'https://www.minecraftserver.sk/server/' + project.id + '/',
        pageURL: (project) => 'https://www.minecraftserver.sk/server/' + project.id + '/',
        projectName: (doc) => doc.querySelector('.panel-body h3').innerText.trim(),
        exampleURL: () => ['https://www.minecraftserver.sk/server/', 'minicraft-cz-6', '/'],
        URL: () => 'minecraftserver.sk',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    ServidoresdeMinecraftEs: {
        voteURL: (project) => 'https://servidoresdeminecraft.es/server/vote/' + project.id,
        pageURL: (project) => 'https://servidoresdeminecraft.es/server/status/' + project.id,
        projectName: (doc) => doc.querySelector('.server-header h1').textContent,
        exampleURL: () => ['https://servidoresdeminecraft.es/server/vote/', 'gRQ7HvE8/play.minelatino.com', ''],
        URL: () => 'servidoresdeminecraft.es',
        parseURL: (url) => ({id: url.pathname.split('/')[3]})
    },
    MinecraftSurvivalServersCom: {
        voteURL: (project) => 'https://minecraftsurvivalservers.com/vote/' + project.id,
        pageURL: (project) => 'https://minecraftsurvivalservers.com/server/' + project.id,
        projectName: () => {
            // Хрень какая-то, в fetch запросе отсылается не страница а предзагрузка
            // return doc.querySelector('div.items-center > span.text-xl.font-semibold').textContent.trim()
            return ''
        },
        exampleURL: () => ['https://minecraftsurvivalservers.com/vote/', '248-rede-revo', ''],
        URL: () => 'minecraftsurvivalservers.com',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    MinecraftGlobal: {
        voteURL: (project) => 'https://minecraft.global/server/' + project.id + '/vote',
        pageURL: (project) => 'https://minecraft.global/server/' + project.id,
        projectName: (doc) => doc.querySelector('h1').textContent,
        exampleURL: () => ['https://minecraft.global/server/', '8', '/vote'],
        URL: () => 'minecraft.global',
        parseURL: (url) => ({id: url.pathname.split('/')[2]})
    },
    Custom: {
        voteURL: (project) => project.responseURL,
        pageURL: (project) => project.responseURL,
        projectName: () => '',
        exampleURL: () => ['', '', ''],
        URL: () => 'Custom',
        parseURL: () => ({}),
        silentVote: () => true
    }
}

function projectByURL(url) {
    url = getDomainWithoutSubdomain(url)
    switch (url) {
        case 'topcraft.ru': return 'TopCraft'
        case 'mctop.su': return 'McTOP'
        case 'mcrate.su': return 'MCRate'
        case 'minecraftrating.ru': return 'MinecraftRating'
        case 'monitoringminecraft.ru': return 'MonitoringMinecraft'
        case 'ionmc.top': return 'IonMc'
        case 'minecraftservers.org': return 'MinecraftServersOrg'
        case 'serveur-prive.net': return 'ServeurPrive'
        case 'planetminecraft.com': return 'PlanetMinecraft'
        case 'topg.org': return 'TopG'
        case 'listforge.net': return 'ListForge'
        case 'ark-servers.net': return 'ListForge'
        case 'arma3-servers.net': return 'ListForge'
        case 'atlas-servers.io': return 'ListForge'
        case 'conan-exiles.com': return 'ListForge'
        case 'counter-strike-servers.net': return 'ListForge'
        case 'cubeworld-servers.com': return 'ListForge'
        case 'dayz-servers.org': return 'ListForge'
        case 'ecoservers.io': return 'ListForge'
        case 'empyrion-servers.com': return 'ListForge'
        case 'gmod-servers.com': return 'ListForge'
        case 'hurtworld-servers.net': return 'ListForge'
        case 'hytale-servers.io': return 'ListForge'
        case 'life-is-feudal.org': return 'ListForge'
        case 'minecraft-mp.com': return 'ListForge'
        case 'minecraftpocket-servers.com': return 'ListForge'
        case 'minecraft-tracker.com': return 'ListForge'
        case 'miscreated-servers.com': return 'ListForge'
        case 'reign-of-kings.net': return 'ListForge'
        case 'rust-servers.net': return 'ListForge'
        case 'space-engineers.com': return 'ListForge'
        case 'squad-servers.com': return 'ListForge'
        case 'starbound-servers.net': return 'ListForge'
        case 'tf2-servers.com': return 'ListForge'
        case 'teamspeak-servers.org': return 'ListForge'
        case 'terraria-servers.com': return 'ListForge'
        case 'unturned-servers.net': return 'ListForge'
        case 'wurm-unlimited.com': return 'ListForge'
        case 'minecraft-server-list.com': return 'MinecraftServerList'
        case 'serverpact.com': return 'ServerPact'
        case 'minecraftiplist.com': return 'MinecraftIpList'
        case 'topminecraftservers.org': return 'TopMinecraftServers'
        case 'minecraftservers.biz': return 'MinecraftServersBiz'
        case 'hotmc.ru': return 'HotMC'
        case 'minecraft-server.net': return 'MinecraftServerNet'
        case 'top-games.net': return 'TopGames'
        case 'top-serveurs.net': return 'TopGames'
        case 'tmonitoring.com': return 'TMonitoring'
        case 'top.gg': return 'TopGG'
        case 'discordbotlist.com': return 'DiscordBotList'
        case 'discords.com': return 'Discords'
        case 'mmotop.ru': return 'MMoTopRU'
        case 'mc-servers.com': return 'MCServers'
        case 'minecraftlist.org': return 'MinecraftList'
        case 'minecraft-index.com': return 'MinecraftIndex'
        case 'serverlist101.com': return 'ServerList101'
        case 'mcserver-list.eu': return 'MCServerList'
        case 'craftlist.org': return 'CraftList'
        case 'czech-craft.eu': return 'CzechCraft'
        case 'minecraft.buzz': return 'MinecraftBuzz'
        case 'minecraftservery.eu': return 'MinecraftServery'
        case 'rpg-paradize.com': return 'RPGParadize'
        case 'minecraft-serverlist.net': return 'MinecraftServerListNet'
        case 'minecraft-server.eu': return 'MinecraftServerEu'
        case 'minecraftkrant.nl': return 'MinecraftKrant'
        case 'trackyserver.com': return 'TrackyServer'
        case 'mc-lists.org': return 'MCListsOrg'
        case 'topmcservers.com': return 'TopMCServersCom'
        case 'bestservers.com': return 'BestServersCom'
        case 'craft-list.net': return 'CraftListNet'
        case 'minecraft-servers-list.org': return 'MinecraftServersListOrg'
        case 'serverliste.net': return 'ServerListe'
        case 'gtop100.com': return 'gTop100'
        case 'wargm.ru': return 'WARGM'
        case 'minestatus.net': return 'MineStatus'
        case 'misterlauncher.org': return 'MisterLauncher'
        case 'minecraft-servers.de': return 'MinecraftServersDe'
        case 'discord.boats': return 'DiscordBoats'
        case 'serverlist.games': return 'ServerListGames'
        case 'best-minecraft-servers.co': return 'BestMinecraftServers'
        case 'minecraftservers100.com': return 'MinecraftServers100'
        case 'mc-serverlist.cz': return 'MCServerListCZ'
        case 'mineservers.com': return 'MineServers'
        case 'pixelmonservers.com': return 'MineServers'
        case 'tekkitserverlist.com': return 'MineServers'
        case 'technicservers.com': return 'MineServers'
        case 'ftbservers.com': return 'MineServers'
        case 'atlauncher.com': return 'ATLauncher'
        case 'servers-minecraft.net': return 'ServersMinecraft'
        case 'minecraft-list.cz': return 'MinecraftListCZ'
        case 'liste-serveurs-minecraft.org': return 'ListeServeursMinecraft'
        case 'mcservidores.com': return 'MCServidores'
        case 'xtremetop100.com': return 'XtremeTop100'
        case 'minecraft-server.sk': return 'MinecraftServerSk'
        case 'serveursminecraft.org': return 'ServeursMinecraftOrg'
        case 'serveurs-mc.net': return 'ServeursMCNet'
        case 'serveur-minecraft.com': return 'ServeursMinecraftCom'
        case 'serveur-minecraft-vote.fr': return 'ServeurMinecraftVoteFr'
        case 'minebrowse.com': return 'MineBrowseCom'
        case 'mc-server-list.com': return 'MCServerListCom'
        case 'serverlocator.com': return 'ServerLocatorCom'
        case 'top-mmogames.ru': return 'TopMmoGamesRu'
        case 'mmorpg.top': return 'MmoRpgTop'
        case 'mmovote.ru': return 'MmoVoteRu'
        case 'mc-monitoring.info': return 'McMonitoringInfo'
        case 'mcservertime.com': return 'McServerTimeCom'
        case 'liste-serveurs.fr': return 'ListeServeursFr'
        case 'serveur-minecraft.fr': return 'ServeurMinecraftFr'
        case 'mineserv.top': return 'MineServTop'
        case 'top100arena.com': return 'Top100ArenaCom'
        case 'minecraftbestservers.com': return 'MinecraftBestServersCom'
        case 'mclike.com': return 'MCLikeCom'
        case 'pixelmon-server-list.com': return 'PixelmonServerListCom'
        case 'minecraftserver.sk': return 'MinecraftServerSk2'
        case 'servidoresdeminecraft.es': return 'ServidoresdeMinecraftEs'
        case 'minecraftsurvivalservers.com': return 'MinecraftSurvivalServersCom'
        case 'minecraft.global': return 'MinecraftGlobal'
    }
}

const getDomainWithoutSubdomain = url => {
    const urlParts = new URL(url).hostname.split('.')

    return urlParts
        .slice(0)
        .slice(-(urlParts.length === 4 ? 3 : 2))
        .join('.')
}

function extractHostname(url) {
    let hostname
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf('//') > -1) {
        hostname = url.split('/')[2]
    } else {
        hostname = url.split('/')[0]
    }

    //find & remove port number
    hostname = hostname.split(':')[0]
    //find & remove '?'
    hostname = hostname.split('?')[0]

    return hostname
}