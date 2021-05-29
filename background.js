var allProjects = [
    'TopCraft',
    'McTOP',
    'MCRate',
    'MinecraftRating',
    'MonitoringMinecraft',
    'IonMc',
    'MinecraftServersOrg',
    'ServeurPrive',
    'PlanetMinecraft',
    'TopG',
    'ListForge',
    'MinecraftServerList',
    'ServerPact',
    'MinecraftIpList',
    'TopMinecraftServers',
    'MinecraftServersBiz',
    'HotMC',
    'MinecraftServerNet',
    'TopGames',
    'TMonitoring',
    'TopGG',
    'DiscordBotList',
    'BotsForDiscord',
    'MMoTopRU',
    'MCServers',
    'MinecraftList',
    'MinecraftIndex',
    'ServerList101',
    'MCServerList',
    'CraftList',
    'CzechCraft',
    'PixelmonServers',
    'QTop',
    'MinecraftBuzz',
    'MinecraftServery',
    'RPGParadize',
    'MinecraftServerListNet',
    'MinecraftServerEu',
    'MinecraftKrant',
    'TrackyServer',
    'MCListsOrg',
    'TopMCServersCom',
    'BestServersCom',
    'CraftListNet',
    'MinecraftServersListOrg',
    'ServerListe',
    'Custom'
]

//Настройки
var settings

//Общая статистика
var generalStats = {}

//Текущие открытые вкладки расширением
var openedProjects = new Map()
//Текущие fetch запросы
let fetchProjects = new Map()
//Текущие проекты за которые сейчас голосует расширение
var queueProjects = new Set()

//Есть ли доступ в интернет?
var online = true

var secondVoteMinecraftIpList = false

var currentVK
var currentProxy

//Прерывает выполнение fetch запросов на случай ошибки в режиме MultiVote
var controller = new AbortController()

var debug = false

//Токен TunnelBear
let tunnelBear = {}

//Нужно ли щас делать проверку голосования, false может быть только лишь тогда когда предыдущая проверка ещё не завершилась
var check = true
var break1 = false
var break2 = false
let lastErrorNotFound

//Закрывать ли вкладку после окончания голосования? Это нужно для диагностирования ошибки
var closeTabs = true

//Где храним настройки
let storageArea = 'local'

chrome.runtime.onSuspend.addListener(function(){
    console.warn(chrome.i18n.getMessage('suspended'))
})

//Инициализация настроек расширения
initializeConfig()
async function initializeConfig() {
    storageArea = await getLocalValue('storageArea')
    if (storageArea == null || storageArea == '') {
        storageArea = 'local'
        await setValue('storageArea', storageArea)
    }
    for (const item of allProjects) {
        window['projects' + item] = await getValue('AVMRprojects' + item)
    }
    VKs = await getValue('AVMRVKs')
    proxies = await getValue('AVMRproxies')
    settings = await getValue('AVMRsettings')
    generalStats = await getValue('generalStats')
    if (generalStats == null)
        generalStats = {}

    for (const item of allProjects) {
        if (window['projects' + item] == null || !(typeof window['projects' + item][Symbol.iterator] === 'function')) window['projects' + item] = []
    }

    //Если пользователь обновился с версии без MultiVote
    if (VKs == null || !(typeof VKs[Symbol.iterator] === 'function') || proxies == null || !(typeof proxies[Symbol.iterator] === 'function')) {
        VKs = []
        proxies = []
    }
    if (settings && settings.stopVote == null) {
        settings.stopVote = 0
    }

    let cooldown = 1000
    if (settings && settings.cooldown && Number.isInteger(settings.cooldown))
        cooldown = settings.cooldown

    if (settings && !settings.disabledCheckTime) checkTime()

    if (settings && settings.useMultiVote) {
        chrome.proxy.settings.get({}, async function(config) {
            if (config && config.value && config.value.mode && config.value.mode == 'fixed_servers') {
                //Прекращаем использование прокси
                await clearProxy()
            }
        })
    }
    
    //Проверка на голосование
    setInterval(async()=>{
        await checkVote()
    }, cooldown)
}

//Проверялка: нужно ли голосовать, сверяет время текущее с временем из конфига
async function checkVote() {
//  return
    if (!settings || projectsTopCraft == null || !(typeof projectsTopCraft[Symbol.iterator] === 'function'))
        return

    if (settings.stopVote > Date.now()) return

    //Если после попытки голосования не было интернета, проверяется есть ли сейчас интернет и если его нет то не допускает последующую проверку но есои наоборот появился интернет, устаналвивает статус online на true и пропускает код дальше
    if (!settings.disabledCheckInternet && !online) {
        if (navigator.onLine) {
            console.log(chrome.i18n.getMessage('internetRestored'))
            online = true
        } else {
            return
        }
    }

    if (check) {
        check = false
    } else {
        return
    }

    await forLoopAllProjects(async function(proj) {
        if (proj.time == null || proj.time < Date.now()) {
            await checkOpen(proj)
        }
    })

    check = true
    break1 = false
    break2 = false
}

async function checkOpen(project) {
    //Если нет подключения к интернету
    if (!settings.disabledCheckInternet) {
        if (!navigator.onLine && online) {
            online = false
            console.warn(chrome.i18n.getMessage('internetDisconected'))
            if (!settings.disabledNotifError)
                sendNotification(getProjectPrefix(project, false), chrome.i18n.getMessage('internetDisconected'))
            return
        } else if (!online) {
            return
        }
    }
    //Не позволяет открыть больше одной вкладки для одного топа или если проект рандомизирован но если проект голосует больше 5 или 15 минут то идёт на повторное голосование
    for (let value of queueProjects) {
        if (getProjectName(value) == getProjectName(project) || value.randomize && project.randomize) {
            if (!value.nextAttempt) return
            if (Date.now() < value.nextAttempt) {
                return
            } else {
                queueProjects.delete(value)
                console.warn(getProjectPrefix(value, true) + chrome.i18n.getMessage('timeout'))
                if (!settings.disabledNotifWarn) sendNotification(getProjectPrefix(value, false), chrome.i18n.getMessage('timeout'))
            }
        }
        if (settings.useMultiVote && !settings.useProxyOnUnProxyTop) {
            //Не позволяет голосовать безпроксиевых рейтингов с проксиевыми
            if (project.TopCraft || project.McTOP || project.MinecraftRating) {
                if (!value.TopCraft && !value.McTOP && !value.MinecraftRating) {
                    return
                }
            }
            if (value.TopCraft || value.McTOP || value.MinecraftRating) {
                if (!project.TopCraft && !project.McTOP && !project.MinecraftRating) {
                    //Если безпроксиевый рейтинг закончил голосование, позволяет проксиевым начать голосовать ради экономии времени
                    if (value.time > Date.now()) {
                        continue
                    } else {
                        return
                    }
                }
            }
        }
    }
    if (settings.useMultiVote) {
        //Не позволяет голосовать проекту если он уже голосовал на текущем ВК или прокси
        if (currentVK != null && (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.QTop)) {
            let usedProjects = getTopFromList(currentVK, project)
            for (let usedProject of usedProjects) {
                if (JSON.stringify(project.id) == JSON.stringify(usedProject.id) && usedProject.nextFreeVote > Date.now()) {
                    return
                }
            }
            if (currentVK.notWorking) {
                if (project.TopCraft && (!(vkontakte.passwordTopCraft || vkontakte.AuthURLTopCraft))) return
                if (project.McTOP && (!(vkontakte.passwordMcTOP || project.AuthURLMcTOP))) return
                if (project.MinecraftRating && vkontakte['AuthURLMinecraftRating' + project.id] == null) return
                if (project.MonitoringMinecraft && vkontakte['AuthURLMonitoringMinecraft' + project.id] == null) return
            }
        }
        if (currentProxy != null) {
            if (!settings.useProxyOnUnProxyTop && (project.TopCraft || project.McTOP || project.MinecraftRating)) {
                return
            }
            let usedProjects = getTopFromList(currentProxy, project)
            for (let usedProject of usedProjects) {
                if (JSON.stringify(project.id) == JSON.stringify(usedProject.id) && usedProject.nextFreeVote > Date.now()) {
                    return
                }
            }
        }

        //Если включён режим MultiVote то применяет куки ВК если на то требуется и применяет прокси (применяет только не юзанный ВК или прокси)
        if (currentVK == null && (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.QTop)) {
            //Ищет не юзанный свободный аккаунт ВК
            let found = false
            for (let vkontakte of VKs) {
                if (vkontakte.notWorking) {
                    let _continue = true
                    if (project.TopCraft && (vkontakte.passwordTopCraft || vkontakte.AuthURLTopCraft)) _continue = false
                    if (project.McTOP && (vkontakte.passwordMcTOP || project.AuthURLMcTOP)) _continue = false
                    if (project.MinecraftRating && vkontakte['AuthURLMinecraftRating' + project.id] != null) _continue = false
                    if (project.MonitoringMinecraft && vkontakte['AuthURLMonitoringMinecraft' + project.id] != null) _continue = false
                    if (_continue) continue
                }
                let usedProjects = getTopFromList(vkontakte, project)
                let used = false
                for (let usedProject of usedProjects) {
                    if (JSON.stringify(project.id) == JSON.stringify(usedProject.id) && usedProject.nextFreeVote > Date.now()) {
                        used = true
                        break
                    }
                }
                if (!used) {
                    found = true

                    //Удаляет все существующие куки ВК
                    let cookies = await new Promise(resolve=>{
                        chrome.cookies.getAll({domain: '.vk.com'}, function(cookies) {
                            resolve(cookies)
                        })
                    })
                    for (let i = 0; i < cookies.length; i++) {
                        await removeCookie('https://' + cookies[i].domain.substring(1, cookies[i].domain.length) + cookies[i].path, cookies[i].name)
                    }

                    console.log(chrome.i18n.getMessage('applyVKCookies', vkontakte.id + ' - ' + vkontakte.name))

                    //Применяет куки ВК найденного свободного незаюзанного аккаунта ВК
                    for (let i = 0; i < vkontakte.cookies.length; i++) {
                        let cookie = vkontakte.cookies[i]
                        await setCookieDetails({
                            url: 'https://' + cookie.domain.substring(1, cookie.domain.length) + cookie.path,
                            name: cookie.name,
                            value: cookie.value,
                            domain: cookie.domain,
                            path: cookie.path,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            sameSite: cookie.sameSite,
                            expirationDate: cookie.expirationDate,
                            storeId: cookie.storeId
                        })
                    }

                    currentVK = vkontakte
                    break
                }
            }
            //Если не удалось найти хотя бы один свободный не заюзанный аккаунт вк
            if (!found) {
//              settings.stopVote = Date.now() + 86400000
                lastErrorNotFound = chrome.i18n.getMessage('notFoundVK')
//              console.warn(getProjectPrefix(project, true) + lastErrorNotFound)
//              if (!settings.disabledNotifWarn) sendNotification(getProjectPrefix(project, false), lastErrorNotFound)
//              await setValue('AVMRsettings', settings)
//              await stopVote()
                for (const value of queueProjects) {
                    if (value.nick == project.nick && JSON.stringify(value.id) == JSON.stringify(project.id) && getProjectName(value) == getProjectName(project)) {
                        queueProjects.delete(value)
                    }
                }
//              break2 = true
                return
            }
        }

        if (currentProxy == null && (settings.useProxyOnUnProxyTop || (!project.TopCraft && !project.McTOP && !project.MinecraftRating))) {
            let proxyDetails = await new Promise(resolve => {
                chrome.proxy.settings.get({}, async function(details) {
                    resolve(details)
                })
            })
            if (!(proxyDetails.levelOfControl == 'controllable_by_this_extension' || proxyDetails.levelOfControl == 'controlled_by_this_extension')) {
                settings.stopVote = Date.now() + 86400000
                console.error(chrome.i18n.getMessage('otherProxy'))
                if (!settings.disabledNotifError) {
                    sendNotification(chrome.i18n.getMessage('otherProxy'), chrome.i18n.getMessage('otherProxy'))
                }
                await setValue('AVMRsettings', settings)
                await stopVote()
                return
            }
            //Ищет не юзанный свободный прокси
            let found = false
            for (let proxy of proxies) {
                if (proxy.notWorking)
                    continue
                let usedProjects = getTopFromList(proxy, project)
                let used = false
                for (let usedProject of usedProjects) {
                    if (JSON.stringify(project.id) == JSON.stringify(usedProject.id) && usedProject.nextFreeVote > Date.now()) {
                        used = true
                        break
                    }
                }
                if (!used) {
                    found = true
                    //Применяет найденный незаюзанный свободный прокси
                    console.log(chrome.i18n.getMessage('applyProxy', proxy.ip + ':' + proxy.port + ' ' + proxy.scheme))

                    if (proxy.TunnelBear && (tunnelBear.token == null || tunnelBear.expires < Date.now())) {
                        console.log(chrome.i18n.getMessage('proxyTBTokenExpired'))
                        let response = await fetch('https://api.tunnelbear.com/v2/cookieToken', {
                            'headers': {
                                'accept': 'application/json, text/plain, */*',
                                'accept-language': 'ru,en-US;q=0.9,en;q=0.8',
                                'authorization': 'Bearer undefined',
                                'cache-control': 'no-cache',
                                'device': Math.floor(Math.random() * 999999999) + '-' + Math.floor(Math.random() * 99999999) + '-' + Math.floor(Math.random() * 99999) + '-' + Math.floor(Math.random() * 999999) + '-' + Math.floor(Math.random() * 99999999999999999),
                                'pragma': 'no-cache',
                                'sec-fetch-dest': 'empty',
                                'sec-fetch-mode': 'cors',
                                'sec-fetch-site': 'none',
                                'tunnelbear-app-id': 'com.tunnelbear',
                                'tunnelbear-app-version': '1.0',
                                'tunnelbear-platform': 'Chrome',
                                'tunnelbear-platform-version': 'c3.3.3'
                            },
                            'referrerPolicy': 'strict-origin-when-cross-origin',
                            'body': null,
                            'method': 'POST',
                            'mode': 'cors',
                            'credentials': 'include'
                        })
                        if (!response.ok) {
                            settings.stopVote = Date.now() + 86400000
                            await setValue('AVMRsettings', settings)
                            await stopVote()
                            if (response.status == 401) {
                                console.error(chrome.i18n.getMessage('proxyTBAuth1') + ', ' + chrome.i18n.getMessage('proxyTBAuth2'))
                                if (!settings.disabledNotifError) sendNotification(chrome.i18n.getMessage('proxyTBAuth1'), chrome.i18n.getMessage('proxyTBAuth2'))
                                return
                            }
                            console.error(chrome.i18n.getMessage('notConnect', response.url) + response.status)
                            return
                        }
                        let json = await response.json()
                        tunnelBear.token = 'Bearer ' + json.access_token
                        tunnelBear.expires = Date.now() + 86400000
                    }

                    let config = {
                        mode: 'fixed_servers',
                        rules: {
                            singleProxy: {
                                scheme: proxy.scheme,
                                host: proxy.ip,
                                port: proxy.port
                            },
                            bypassList: settings.proxyBlackList
                        }
                    }
                    await setProxy(config)

//                     if (chrome.benchmarking) {
//                         await chrome.benchmarking.closeConnections()
//                         await chrome.benchmarking.clearCache()
//                         await chrome.benchmarking.clearHostResolverCache()
//                         await chrome.benchmarking.clearPredictorCache()
//                     }

                    currentProxy = proxy
                    break
                }
            }

            //Если не удалось найти хотя бы одно свободное не заюзанное прокси
            if (!found) {
//              settings.stopVote = Date.now() + 86400000
                lastErrorNotFound = chrome.i18n.getMessage('notFoundProxy')
//              console.warn(getProjectPrefix(project, true) + lastErrorNotFound)
//              if (!settings.disabledNotifWarn) sendNotification(getProjectPrefix(project, false), lastErrorNotFound)
//              await setValue('AVMRsettings', settings)
//              await stopVote()
                for (const value of queueProjects) {
                    if (value.nick == project.nick && JSON.stringify(value.id) == JSON.stringify(project.id) && getProjectName(value) == getProjectName(project)) {
                        queueProjects.delete(value)
                    }
                }
//              break2 = true
                return
            }
        }

        lastErrorNotFound = null

        //Очистка куки
        let url
        if (project.TopCraft) {
            url = '.topcraft.ru'
        } else if (project.McTOP) {
            url = '.mctop.su'
        } else if (project.MCRate) {
            url = '.mcrate.su'
        } else if (project.MinecraftRating) {
            url = '.minecraftrating.ru'
        } else if (project.MonitoringMinecraft) {
            url = '.monitoringminecraft.ru'
        } else if (project.FairTop) {
            url = '.fairtop.in'
        } else if (project.IonMc) {
            url = '.ionmc.top'
        } else if (project.MinecraftServersOrg) {
            url = '.minecraftservers.org'
        } else if (project.ServeurPrive) {
            url = '.serveur-prive.net'
        } else if (project.PlanetMinecraft) {
            url = '.planetminecraft.com'
        } else if (project.TopG) {
            url = '.topg.org'
        } else if (project.ListForge) {
            url = '.' + project.game
        } else if (project.MinecraftServerList) {
            url = '.minecraft-server-list.com'
        } else if (project.ServerPact) {
            url = '.serverpact.com'
        } else if (project.MinecraftIpList) {
            url = '.minecraftiplist.com'
        } else if (project.TopMinecraftServers) {
            url = '.topminecraftservers.org'
        } else if (project.MinecraftServersBiz) {
            url = '.minecraftservers.biz'
        } else if (project.HotMC) {
            url = '.hotmc.ru'
        } else if (project.MinecraftServerNet) {
            url = '.minecraft-server.net'
        } else if (project.TopGames) {
            if (project.lang == 'fr') {
                url = '.top-serveurs.net'
            } else {
                url = '.top-games.net'
            }
            url = '.minecraftservers.biz'
        } else if (project.TMonitoring) {
            url = '.tmonitoring.com'
        } else if (project.TopGG) {
            url = '.top.gg'
        } else if (project.DiscordBotList) {
            url = '.discordbotlist.com'
        } else if (project.BotsForDiscord) {
            url = '.botsfordiscord.com'
        } else if (project.MMoTopRU) {
            url = '.mmotop.ru'
        } else if (project.MCServers) {
            url = '.mc-servers.com'
        } else if (project.MinecraftList) {
            url = '.minecraftlist.org'
        } else if (project.MinecraftIndex) {
            url = '.minecraft-index.com'
        } else if (project.ServerList101) {
            url = '.serverlist101.com'
        } else if (project.MCServerList) {
            url = '.mcserver-list.eu'
        } else if (project.CraftList) {
            url = '.craftlist.org'
        } else if (project.CzechCraft) {
            url = '.czech-craft.eu'
        } else if (project.PixelmonServers) {
            url = '.pixelmonservers.com'
        } else if (project.QTop) {
            url = '.q-top.ru'
        } else if (project.MinecraftBuzz) {
            url = '.minecraft.buzz'
        }/* else if (project.Custom) {
            url = '.custom.com'
        }*/
        if (url != null && url != '') {
            let cookies = await new Promise(resolve=>{
                chrome.cookies.getAll({domain: url}, function(cookies) {
                    resolve(cookies)
                })
            })
            if (debug) console.log('Удаляю куки ' + url)
            for (let i = 0; i < cookies.length; i++) {
                if (cookies[i].domain.charAt(0) == '.') {
                    await removeCookie('https://' + cookies[i].domain.substring(1, cookies[i].domain.length) + cookies[i].path, cookies[i].name)
                } else {
                    await removeCookie('https://' + cookies[i].domain + cookies[i].path, cookies[i].name)
                }
            }
        }
    }

    //Обновление никнейма для Borealis если истёк его срок действия
    if (project.borealisNickExpires <= Date.now()) {
        console.log(getProjectPrefix(project, true) + 'Истёк срок действия никнейма Borealis, обновляю его...')
        try {
            let response = await fetch('https://borealis.su/engine/ajax/newAlias.php')
            if (!response.ok) {
                throw chrome.i18n.getMessage('notConnect', [response.url, String(response.status)])
            }
            let html = await response.text()
            let find = html.match('Код для голосования: ')
            if (find == null) {
                throw html
            }
            html = html.substring(find.index + find[0].length, html.length)
            forLoopAllProjects(function(proj) {
                if (proj.borealisNickExpires != null && proj.nick == project.nick) {
                    proj.nick = html
                    proj.borealisNickExpires = Date.now() + 82800000
                }
            })
            await setValue('AVMRprojectsTopCraft', projectsTopCraft)
            await setValue('AVMRprojectsMcTOP', projectsMcTOP)
            await setValue('AVMRprojectsMinecraftRating', projectsMinecraftRating)
        } catch (e) {
            console.error(getProjectPrefix(project, true) + e)
            if (!settings.disabledNotifError) {
                sendNotification(getProjectPrefix(project, false), e)
            }
            project.error = e
            forLoopAllProjects(function(proj) {
                if (proj.borealisNickExpires != null) {
                    proj.time = Date.now() + 300000
                }
            })
            await setValue('AVMRprojectsTopCraft', projectsTopCraft)
            await setValue('AVMRprojectsMcTOP', projectsMcTOP)
            await setValue('AVMRprojectsMinecraftRating', projectsMinecraftRating)
            return
        }
    }

    let retryCoolDown
    if (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.ServerPact || project.MinecraftIpList || project.MCServerList) {
        retryCoolDown = 300000
    } else {
        retryCoolDown = 900000
    }
    project.nextAttempt = Date.now() + retryCoolDown
    queueProjects.add(project)
    
    //Если эта вкладка была уже открыта, он закрывает её
    for (let[key,value] of openedProjects.entries()) {
        if (value.nick == project.nick && JSON.stringify(value.id) == JSON.stringify(project.id) && getProjectName(value) == getProjectName(project)) {
            openedProjects.delete(key)
            if (closeTabs) {
                chrome.tabs.remove(key, function() {
                    if (chrome.runtime.lastError) {
                        console.warn(getProjectPrefix(project, true) + chrome.runtime.lastError.message)
                        if (!settings.disabledNotifError && chrome.runtime.lastError.message != 'No tab with id.')
                            sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                    }
                })
            }
        }
    }

    delete project.error

    console.log(getProjectPrefix(project, true) + chrome.i18n.getMessage('startedAutoVote'))
    if (!settings.disabledNotifStart)
        sendNotification(getProjectPrefix(project, false), chrome.i18n.getMessage('startedAutoVote'))

    if (project.MonitoringMinecraft && !settings.useMultiVote) {
        let url
        if (project.MonitoringMinecraft) {
            url = '.monitoringminecraft.ru'
        }
        let cookies = await new Promise(resolve=>{
            chrome.cookies.getAll({domain: url}, function(cookies) {
                resolve(cookies)
            })
        })
        if (debug) console.log(chrome.i18n.getMessage('deletingCookies', url))
        for (let i = 0; i < cookies.length; i++) {
            if (cookies[i].domain.charAt(0) == '.') {
                await removeCookie('https://' + cookies[i].domain.substring(1, cookies[i].domain.length) + cookies[i].path, cookies[i].name)
            } else {
                await removeCookie('https://' + cookies[i].domain + cookies[i].path, cookies[i].name)
            }
        }
    }

    await newWindow(project)
}

//Открывает вкладку для голосования или начинает выполнять fetch закросы
async function newWindow(project) {

    if (project.stats.lastAttemptVote && (new Date(project.stats.lastAttemptVote).getMonth() < new Date().getMonth() || new Date(project.stats.lastAttemptVote).getFullYear() < new Date().getFullYear())) {
        project.stats.lastMonthSuccessVotes = project.stats.monthSuccessVotes
        project.stats.monthSuccessVotes = 0
    }
    project.stats.lastAttemptVote = Date.now()

    if (generalStats.lastAttemptVote && (new Date(generalStats.lastAttemptVote).getMonth() < new Date().getMonth() || new Date(generalStats.lastAttemptVote).getFullYear() < new Date().getFullYear())) {
        generalStats.lastMonthSuccessVotes = generalStats.monthSuccessVotes
        generalStats.monthSuccessVotes = 0
    }
    generalStats.lastAttemptVote = Date.now()
    await setValue('generalStats', generalStats)
    await changeProject(project)

    let silentVoteMode = false
    if (project.Custom) {
        silentVoteMode = true
    } else if (settings.enabledSilentVote) {
        if (!project.emulateMode && (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.ServerPact || project.MinecraftIpList || project.MCServerList)) {
            silentVoteMode = true
        }
    } else if (project.silentMode && (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.ServerPact || project.MinecraftIpList || project.MCServerList)) {
        silentVoteMode = true
    }
    if (debug) console.log('[' + getProjectName(project) + '] ' + project.nick + (project.Custom ? '' : ' – ' + project.id) + (project.name != null ? ' – ' + project.name : '') + (silentVoteMode ? ' Начинаю Fetch запрос' : ' Открываю вкладку'))
    if (silentVoteMode) {
        silentVote(project)
    } else {
        let window = await new Promise(resolve=>{
            chrome.windows.getCurrent(function(win) {
                if (chrome.runtime.lastError && chrome.runtime.lastError.message == 'No current window') {} else if (chrome.runtime.lastError) {
                    console.error(chrome.i18n.getMessage('errorOpenTab') + chrome.runtime.lastError.message)
                }
                resolve(win)
            })
        })
        if (window == null) {
            window = await new Promise(resolve=>{
                chrome.windows.create({focused: false}, function(win) {
                    resolve(win)
                })
            })
            chrome.windows.update(window.id, {focused: false})
        }

        let url
        if (project.TopCraft)
            url = 'https://topcraft.ru/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/'
        else if (project.McTOP)
            url = 'https://mctop.su/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/'
        else if (project.MCRate)
            url = 'https://oauth.vk.com/authorize?client_id=3059117&redirect_uri=http://mcrate.su/add/rate?idp=' + project.id + '&response_type=code'
        else if (project.MinecraftRating)
            url = 'https://oauth.vk.com/authorize?client_id=5216838&display=page&redirect_uri=https://minecraftrating.ru/projects/' + project.id + '/&state=' + project.nick + '&response_type=code&v=5.45'
        else if (project.MonitoringMinecraft)
            url = 'https://monitoringminecraft.ru/top/' + project.id + '/vote'
        else if (project.IonMc)
            url = 'https://ionmc.top/projects/' + project.id + '/vote'
        else if (project.MinecraftServersOrg)
            url = 'https://minecraftservers.org/vote/' + project.id
        else if (project.ServeurPrive) {
            if (project.game == null)
                project.game = 'minecraft'
            if (project.lang == 'en') {
                url = 'https://serveur-prive.net/' + project.lang + '/' + project.game + '/' + project.id + '/vote'
            } else {
                url = 'https://serveur-prive.net/' + project.game + '/' + project.id + '/vote'
            }
        } else if (project.PlanetMinecraft)
            url = 'https://www.planetminecraft.com/server/' + project.id + '/vote/'
        else if (project.TopG) {
            if (project.game == null) project.game = 'minecraft-servers'
            url = 'https://topg.org/' + project.game + '/server-' + project.id
        } else if (project.ListForge)
            url = 'https://' + project.game + '/server/' + project.id + '/vote/'
        else if (project.MinecraftServerList)
            url = 'https://minecraft-server-list.com/server/' + project.id + '/vote/'
        else if (project.ServerPact)
            url = 'https://www.serverpact.com/vote-' + project.id
        else if (project.MinecraftIpList)
            url = 'https://minecraftiplist.com/index.php?action=vote&listingID=' + project.id
        else if (project.TopMinecraftServers)
            url = 'https://topminecraftservers.org/vote/' + project.id
        else if (project.MinecraftServersBiz)
            url = 'https://minecraftservers.biz/' + project.id + '/'
        else if (project.HotMC)
            url = 'https://hotmc.ru/vote-' + project.id
        else if (project.MinecraftServerNet)
            url = 'https://minecraft-server.net/vote/' + project.id + '/'
        else if (project.TopGames) {
            if (project.lang == 'fr') {
                url = 'https://top-serveurs.net/' + project.game + '/vote/' + project.id
            } else if (project.lang == 'en') {
                url = 'https://top-games.net/' + project.game + '/vote/' + project.id
            } else {
                url = 'https://' + project.lang + '.top-games.net/' + project.game + '/vote/' + project.id
            }
        } else if (project.TMonitoring)
            url = 'https://tmonitoring.com/server/' + project.id + '/'
        else if (project.TopGG) {
            if (!project.game) {
                project.game = 'bot'
            }
            if (!project.addition) {
                project.addition = ''
            }
            url = 'https://top.gg/' + project.game + '/' + project.id + '/vote' + project.addition
        } else if (project.DiscordBotList)
            url = 'https://discordbotlist.com/bots/' + project.id + '/upvote'
        else if (project.BotsForDiscord)
            url = 'https://botsfordiscord.com/bot/' + project.id + '/vote'
        else if (project.MMoTopRU) {
            if (project.lang == 'ru') {
                url = 'https://' + project.game + '.mmotop.ru/servers/' + project.id + '/votes/new'
            } else {
                url = 'https://' + project.game + '.mmotop.ru/' + project.lang + '/' + 'servers/' + project.id + '/votes/new'
            }
        } else if (project.MCServers)
            url = 'https://mc-servers.com/mcvote/' + project.id + '/'
        else if (project.MinecraftList)
            url = 'https://minecraftlist.org/vote/' + project.id
        else if (project.MinecraftIndex)
            url = 'https://www.minecraft-index.com/' + project.id + '/vote'
        else if (project.ServerList101)
            url = 'https://serverlist101.com/server/' + project.id + '/vote/'
        else if (project.MCServerList)
            url = 'https://mcserver-list.eu/hlasovat/?id=' + project.id
        else if (project.CraftList)
            url = 'https://craftlist.org/' + project.id
        else if (project.CzechCraft)
            url = 'https://czech-craft.eu/server/' + project.id + '/vote/'
        else if (project.PixelmonServers)
            url = 'https://pixelmonservers.com/server/' + project.id + '/vote'
        else if (project.QTop)
            url = 'http://q-top.ru/vote' + project.id
        else if (project.MinecraftBuzz)
            url = 'https://minecraft.buzz/server/' + project.id + '&tab=vote'
        else if (project.MinecraftServery)
            url = 'https://minecraftservery.eu/server/' + project.id
        else if (project.RPGParadize)
            url = 'https://www.rpg-paradize.com/?page=vote&vote=' + project.id
        else if (project.MinecraftServerListNet)
            url = 'https://www.minecraft-serverlist.net/vote/' + project.id
        else if (project.MinecraftServerEu)
            url = 'https://minecraft-server.eu/vote/index/' + project.id
        else if (project.MinecraftKrant)
            url = 'https://www.minecraftkrant.nl/serverlijst/' + project.id
        else if (project.TrackyServer)
            url = 'https://www.trackyserver.com/server/' + project.id
        else if (project.MCListsOrg)
            url = 'https://mc-lists.org/' + project.id + '/vote'
        else if (project.TopMCServersCom)
            url = 'https://topmcservers.com/server/' + project.id + '/vote'
        else if (project.BestServersCom)
            url = 'https://bestservers.com/server/' + project.id + '/vote'
        else if (project.CraftListNet)
            url = 'https://craft-list.net/minecraft-server/' + project.id + '/vote'
        else if (project.MinecraftServersListOrg)
            url = 'https://www.minecraft-servers-list.org/index.php?a=in&u=' + project.id
        else if (project.ServerListe)
            url = 'https://www.serverliste.net/vote/' + project.id
        
        let tab = await new Promise(resolve=>{
            chrome.tabs.create({url: url, active: false}, function(tab_) {
                resolve(tab_)
            })
        })
        openedProjects.set(tab.id, project)
    }
}

async function silentVote(project) {
    try {
        if (project.TopCraft) {
            let response
            if (currentVK != null && currentVK.passwordTopCraft != null) {
                response = await _fetch('https://topcraft.ru/', null, project)
                if (!await checkResponseError(project, response, 'topcraft.ru', null, true)) return
                const csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
                response = await _fetch('https://topcraft.ru/accounts/login/', {
                    'headers': {
                        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    'body': 'csrfmiddlewaretoken=' + csrftoken + '&login=' + currentVK.id + currentVK.numberId + '&password=' + currentVK.passwordTopCraft,
                    'method': 'POST'
                }, project)
                //Мне лень это делать, патом сделаю
//             } else if (currentVK != null && currentVK.AuthURLTopCraft != null) {
//                 response = await _fetch('https://topcraft.ru/accounts/vk/login/?process=login', null, project)
//                 let host = extractHostname(response.url)
//                 if (host.includes('vk.com')) {
//                     let response2 = await _fetch(currentVK.AuthURLTopCraft, null, project)
//                     if (!await checkResponseError(project, response2, 'topcraft.ru', null, true)) return
//                 }
            } else {
                response = await _fetch('https://topcraft.ru/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/', null, project)
            }
            if (!await checkResponseError(project, response, 'topcraft.ru', null, true)) return
            let csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
            response = await _fetch('https://topcraft.ru/projects/vote/', {
                'headers': {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                'body': 'csrfmiddlewaretoken=' + csrftoken + '&project_id=' + project.id + '&nick=' + project.nick,
                'method': 'POST'
            }, project)
            if (!await checkResponseError(project, response, 'topcraft.ru', [400], true)) return
            if (response.status == 400) {
                if (response.html == 'vk_error' || response.html == 'nick_error') {
                    endVote({later: response.html}, null, project)
                } else if (response.html.length > 0 && response.html.length < 500) {
                    endVote({message: response.html}, null, project)
                } else {
                    endVote({message: chrome.i18n.getMessage('errorVote', String(response.status))}, null, project)
                }
                return
            }
            endVote({successfully: true}, null, project)
            return
        } else

        if (project.McTOP) {
            let response
            if (currentVK != null && currentVK.passwordMcTOP != null) {
                response = await _fetch('https://mctop.su/', null, project)
                if (!await checkResponseError(project, response, 'mctop.su', null, true)) return
                const csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
                response = await _fetch('https://mctop.su/accounts/login/', {
                    'headers': {
                        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    'body': 'csrfmiddlewaretoken=' + csrftoken + '&login=' + currentVK.id + currentVK.numberId + '&password=' + currentVK.passwordMcTOP,
                    'method': 'POST'
                }, project)
            } else {
                response = await _fetch('https://mctop.su/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/', null, project)
            }
            if (!await checkResponseError(project, response, 'mctop.su', null, true)) return
            let csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
            response = await _fetch('https://mctop.su/projects/vote/', {
                'headers': {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                'body': 'csrfmiddlewaretoken=' + csrftoken + '&project_id=' + project.id + '&nick=' + project.nick,
                'method': 'POST'
            }, project)
            if (!await checkResponseError(project, response, 'mctop.su', [400], true)) return
            if (response.status == 400) {
                if (response.html == 'vk_error' || response.html == 'nick_error') {
                    endVote({later: response.html}, null, project)
                } else if (response.html.length > 0 && response.html.length < 500) {
                    endVote({message: response.html}, null, project)
                } else {
                    endVote({message: chrome.i18n.getMessage('errorVote', String(response.status))}, null, project)
                }
                return
            }
            endVote({successfully: true}, null, project)
            return
        } else

        if (project.MCRate) {
            let response = await _fetch('https://oauth.vk.com/authorize?client_id=3059117&redirect_uri=http://mcrate.su/add/rate?idp=' + project.id + '&response_type=code', null, project)
            if (!await checkResponseError(project, response, 'mcrate.su', null, true)) return
            let code = response.url.substring(response.url.length - 18)
            if (response.doc.querySelector('input[name=login_player]') != null) {
                response = await _fetch('http://mcrate.su/save/rate', {
                    'headers': {
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                        'accept-language': 'ru,en-US;q=0.9,en;q=0.8',
                        'cache-control': 'max-age=0',
                        'content-type': 'application/x-www-form-urlencoded',
                        'upgrade-insecure-requests': '1'
                    },
                    'referrer': 'http://mcrate.su/add/rate?idp=' + project.id + '&code=' + code,
                    'referrerPolicy': 'no-referrer-when-downgrade',
                    'body': 'login_player=' + project.nick + '&token_vk_secure=' + response.doc.getElementsByName('token_vk_secure').item(0).value + '&uid_vk_secure=' + response.doc.getElementsByName('uid_vk_secure').item(0).value + '&id_project=' + project.id + '&code_vk_secure=' + response.doc.getElementsByName('code_vk_secure').item(0).value + '&mcrate_hash=' + response.doc.getElementsByName('mcrate_hash').item(0).value,
                    'method': 'POST'
                }, project)
                if (!await checkResponseError(project, response, 'mcrate.su', null, true)) return
            }
            if (response.doc.querySelector('div[class=report]') != null) {
                if (response.doc.querySelector('div[class=report]').textContent.includes('Ваш голос засчитан')) {
                    endVote({successfully: true}, null, project)
                } else {
                    endVote({message: response.doc.querySelector('div[class=report]').textContent}, null, project)
                }
                return
            } else if (response.doc.querySelector('span[class=count_hour]') != null) {
//              Если вы уже голосовали, высчитывает сколько надо времени прождать до следующего голосования (точнее тут высчитывается во сколько вы голосовали)
//              Берёт из скрипта переменную в которой хранится сколько осталось до следующего голосования
//              let count2 = response.doc.querySelector('#center-main > div.center_panel > script:nth-child(2)').text.substring(30, 45)
//              let count = count2.match(/\d+/g).map(Number)
//              let hour = parseInt(count / 3600)
//              let min = parseInt((count - hour * 3600) / 60)
//              let sec = parseInt(count - (hour * 3600 + min * 60))
//              let milliseconds = (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000)
//              if (milliseconds == 0) return
//              let later = Date.now() - (86400000 - milliseconds)
                endVote({later: true}, null, project)
                return
            } else if (response.doc.querySelector('div[class="error"]') != null) {
                const error = response.doc.querySelector('div[class="error"]').textContent
                if (error.includes("уже голосовали")) {
                    endVote({later: true}, null, project)
//              } else if (error.includes('Ваш ВК ID заблокирован для голосовани') || error.includes('Ваш аккаунт заблокирован')) {
//                  endVote({errorAuthVK: error}, null, project)
                } else {
                    endVote({message: response.doc.querySelector('div[class="error"]').textContent}, null, project)
                }
                return
            } else {
                endVote({errorVoteNoElement: true}, null, project)
                return
            }
        } else

        if (project.MinecraftRating) {
            let response
            if (currentVK != null && currentVK['AuthURLMinecraftRating' + project.id] != null) {
                response = await _fetch(currentVK['AuthURLMinecraftRating' + project.id], null, project)
                if (!await checkResponseError(project, response, 'minecraftrating.ru', null, true)) return
                response = await _fetch('https://minecraftrating.ru/projects/' + project.id + '/?code=' + response.url.substring(response.url.indexOf('code='), response.url.indexOf('&state')).replace('code=', '') + '&state=' + project.nick, null, project)
            } else {
                response = await _fetch('https://oauth.vk.com/authorize?client_id=5216838&display=page&redirect_uri=https://minecraftrating.ru/projects/' + project.id + '/&state=' + project.nick + '&response_type=code&v=5.45', null, project)
            }
            if (!await checkResponseError(project, response, 'minecraftrating.ru', null, true)) return
            if (response.doc.querySelector('div.alert.alert-danger') != null) {
                if (response.doc.querySelector('div.alert.alert-danger').textContent.includes('Вы уже голосовали за этот проект')) {
//                  let numbers = response.doc.querySelector('div.alert.alert-danger').textContent.match(/\d+/g).map(Number)
//                  let count = 0
//                  let year = 0
//                  let month = 0
//                  let day = 0
//                  let hour = 0
//                  let min = 0
//                  let sec = 0
//                  for (let i in numbers) {
//                      if (count == 0) {
//                          hour = numbers[i]
//                      } else if (count == 1) {
//                          min = numbers[i]
//                      } else if (count == 2) {
//                          sec = numbers[i]
//                      } else if (count == 3) {
//                          day = numbers[i]
//                      } else if (count == 4) {
//                          month = numbers[i]
//                      } else if (count == 5) {
//                          year = numbers[i]
//                      }
//                      count++
//                  }
//                  let later = Date.UTC(year, month - 1, day, hour, min, sec, 0) - 86400000 - 10800000
                    endVote({later: true}, null, project)
                    return
                } else {
                    endVote({message: response.doc.querySelector('div.alert.alert-danger').textContent}, null, project)
                    return
                }
            } else if (response.doc.querySelector('div.alert.alert-success') != null) {
                if (response.doc.querySelector('div.alert.alert-success').textContent.includes('Спасибо за Ваш голос!')) {
                    endVote({successfully: true}, null, project)
                    return
                } else {
                    endVote({message: response.doc.querySelector('div.alert.alert-success').textContent}, null, project)
                    return
                }
            } else {
                endVote({message: 'Error! div.alert.alert-success или div.alert.alert-danger is null'}, null, project)
                return
            }
        } else

        if (project.MonitoringMinecraft) {
            let i = 0
            while (i <= 3) {
                i++
                let response = await _fetch('https://monitoringminecraft.ru/top/' + project.id + '/vote', {
                    'headers': {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    'body': 'player=' + project.nick + '',
                    'method': 'POST'
                }, project)
                if (!await checkResponseError(project, response, 'monitoringminecraft.ru', [503], true)) return
                if (response.status == 503) {
                    if (i >= 3) {
                        endVote({message: chrome.i18n.getMessage('errorAttemptVote', 'response code: ' + String(response.status))}, null, project)
                        return
                    }
                    await wait(5000)
                    continue
                }

                if (response.doc.querySelector('body') != null && response.doc.querySelector('body').textContent.includes('Вы слишком часто обновляете страницу. Умерьте пыл.')) {
                    if (i >= 3) {
                        endVote({message: chrome.i18n.getMessage('errorAttemptVote') + response.doc.querySelector('body').textContent}, null, project)
                        return
                    }
                    await wait(5000)
                    continue
                }
                if (document.querySelector('form[method="POST"]') != null && document.querySelector('form[method="POST"]').textContent.includes('Ошибка')) {
                    endVote({message: document.querySelector('form[method="POST"]').textContent.trim()}, null, project)
                    return
                }
                if (response.doc.querySelector('input[name=player]') != null) {
                    if (i >= 3) {
                        endVote({message: chrome.i18n.getMessage('errorAttemptVote', 'input[name=player] is ' + JSON.stringify(response.doc.querySelector('input[name=player]')))}, null, project)
                        return
                    }
                    await wait(5000)
                    continue
                }

                if (response.doc.querySelector('center').textContent.includes('Вы уже голосовали сегодня')) {
//                  //Если вы уже голосовали, высчитывает сколько надо времени прождать до следующего голосования (точнее тут высчитывается во сколько вы голосовали)
//                  //Берёт последние 30 символов
//                  let string = response.doc.querySelector('center').textContent.substring(response.doc.querySelector('center').textContent.length - 30)
//                  //Из полученного текста достаёт все цифры в Array List
//                  let numbers = string.match(/\d+/g).map(Number)
//                  let count = 0
//                  let hour = 0
//                  let min = 0
//                  let sec = 0
//                  for (let i in numbers) {
//                      if (count == 0) {
//                          hour = numbers[i]
//                      } else if (count == 1) {
//                          min = numbers[i]
//                      }
//                      count++
//                  }
//                  let milliseconds = (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000)
//                  let later = Date.now() + milliseconds
//                  endVote({later: later}, null, project)
                    endVote({later: true}, null, project)
                    return
                } else if (response.doc.querySelector('center').textContent.includes('Вы успешно проголосовали!')) {
                    endVote({successfully: true}, null, project)
                    return
                } else {
                    endVote({errorVoteNoElement: true}, null, project)
                    return
                }
            }
        } else

        if (project.ServerPact) {
            let response = await _fetch('https://www.serverpact.com/vote-' + project.id, {
                'headers': {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-language': 'ru,en;q=0.9,ru-RU;q=0.8,en-US;q=0.7',
                    'cache-control': 'no-cache',
                    'pragma': 'no-cache',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1'
                },
                'referrerPolicy': 'no-referrer-when-downgrade',
                'body': null,
                'method': 'GET',
                'mode': 'cors',
                'credentials': 'include'
            }, project)
            if (!await checkResponseError(project, response, 'serverpact.com')) return
            function generatePass(nb) {
                let chars = 'azertyupqsdfghjkmwxcvbn23456789AZERTYUPQSDFGHJKMWXCVBN_-#@'
                let pass = ''
                for (let i = 0; i < nb; i++) {
                    let wpos = Math.round(Math.random() * chars.length)
                    pass += chars.substring(wpos, wpos + 1)
                }
                return pass
            }
            let captchaPass = generatePass(32)
            let captcha = await _fetch('https://www.serverpact.com/v2/QapTcha-master/php/Qaptcha.jquery.php', {
                'headers': {
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'accept-language': 'ru,en;q=0.9,ru-RU;q=0.8,en-US;q=0.7',
                    'cache-control': 'no-cache',
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'pragma': 'no-cache',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'x-requested-with': 'XMLHttpRequest'
                },
                'referrerPolicy': 'no-referrer-when-downgrade',
                'body': 'action=qaptcha&qaptcha_key=' + captchaPass,
                'method': 'POST',
                'mode': 'cors',
                'credentials': 'include'
            }, project)
            let json = captcha.json()
            if (json.error) {
                endVote({message: 'Error in captcha'}, null, project)
                return
            }

            response = await _fetch('https://www.serverpact.com/vote-' + project.id, {
                'headers': {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-language': 'ru,en;q=0.9,en-US;q=0.8',
                    'cache-control': 'no-cache',
                    'content-type': 'application/x-www-form-urlencoded',
                    'pragma': 'no-cache',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1'
                },
                'referrerPolicy': 'no-referrer-when-downgrade',
                'body': response.doc.querySelector('div.QapTcha > input[type=hidden]').name + '=' + response.doc.querySelector('div.QapTcha > input[type=hidden]').value + '&' + captchaPass + '=&minecraftusername=' + project.nick + '&voten=Send+your+vote',
                'method': 'POST',
                'mode': 'cors',
                'credentials': 'include'
            }, project)
            if (!await checkResponseError(project, response, 'serverpact.com')) return
            if (response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div:nth-child(4)') != null && response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div:nth-child(4)').textContent.includes('You have successfully voted')) {
                endVote({successfully: true}, null, project)
                return
            } else if (response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning') != null && (response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning').textContent.includes('You can only vote once') || response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning').textContent.includes('already voted'))) {
                endVote({later: Date.now() + 43200000}, null, project)
                return
            } else if (response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning') != null) {
                endVote({message: response.doc.querySelector('body > div.container.sp-o > div > div.col-md-9 > div.alert.alert-warning').textContent.substring(0, response.doc.querySelector('body > div.container.sp-o > div > div.col-md-9 > div.alert.alert-warning').textContent.indexOf('\n'))}, null, project)
                return
            } else {
                endVote({errorVoteUnknown2: true}, null, project)
                return
            }
        } else

        if (project.MinecraftIpList) {
            let response = await _fetch('https://minecraftiplist.com/index.php?action=vote&listingID=' + project.id, {
                'headers': {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-language': 'ru,en;q=0.9,ru-RU;q=0.8,en-US;q=0.7',
                    'cache-control': 'no-cache',
                    'pragma': 'no-cache',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1'
                },
                'referrerPolicy': 'no-referrer-when-downgrade',
                'body': null,
                'method': 'GET',
                'mode': 'cors',
                'credentials': 'include'
            }, project)
            if (!await checkResponseError(project, response, 'minecraftiplist.com')) return

            if (response.doc.querySelector('#InnerWrapper > script:nth-child(10)') != null && response.doc.querySelector('table[class="CraftingTarget"]') == null) {
                if (secondVoteMinecraftIpList) {
                    secondVoteMinecraftIpList = false
                    endVote('Error time zone', null, project)
                    return
                }
                await _fetch('https://minecraftiplist.com/timezone.php?timezone=Europe/Moscow', {
                    'headers': {
                        'accept': '*/*',
                        'accept-language': 'ru,en;q=0.9,ru-RU;q=0.8,en-US;q=0.7',
                        'cache-control': 'no-cache',
                        'pragma': 'no-cache',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'same-origin',
                        'x-requested-with': 'XMLHttpRequest'
                    },
                    'referrerPolicy': 'no-referrer-when-downgrade',
                    'body': null,
                    'method': 'GET',
                    'mode': 'cors',
                    'credentials': 'include'
                }, project)
                secondVoteMinecraftIpList = true
                silentVote(project)
                return
            }
            if (secondVoteMinecraftIpList) secondVoteMinecraftIpList = false

            if (response.doc.querySelector('#Content > div.Error') != null) {
                if (response.doc.querySelector('#Content > div.Error').textContent.includes('You did not complete the crafting table correctly')) {
                    endVote({message: response.doc.querySelector('#Content > div.Error').textContent}, null, project)
                    return
                }
                if (response.doc.querySelector('#Content > div.Error').textContent.includes('last voted for this server') || response.doc.querySelector('#Content > div.Error').textContent.includes('has no votes')) {
                    let numbers = response.doc.querySelector('#Content > div.Error').textContent.substring(response.doc.querySelector('#Content > div.Error').textContent.length - 30).match(/\d+/g).map(Number)
                    let count = 0
                    let hour = 0
                    let min = 0
                    let sec = 0
                    for (let i in numbers) {
                        if (count == 0) {
                            hour = numbers[i]
                        } else if (count == 1) {
                            min = numbers[i]
                        }
                        count++
                    }
                    let milliseconds = (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000)
                    endVote({later: Date.now() + (86400000 - milliseconds)}, null, project)
                    return
                }
                endVote({message: response.doc.querySelector('#Content > div.Error').textContent}, null, project)
                return
            }

            if (!await getRecipe(response.doc.querySelector('table[class="CraftingTarget"]').firstElementChild.firstElementChild.firstElementChild.firstElementChild.src.replace('chrome-extension://' + chrome.runtime.id, 'https://minecraftiplist.com'))) {
                endVote({message: 'Couldnt find the recipe: ' + response.doc.querySelector('#Content > form > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(3) > table > tbody > tr > td > img').src.replace('chrome-extension://' + chrome.runtime.id, 'https://minecraftiplist.com')}, null, project)
                return
            }
            await craft(response.doc.querySelector('#Content > form > table > tbody > tr:nth-child(2) > td > table').getElementsByTagName('img'))

            code = 0
            code2 = 0

            for (let i = 0; i < 6; i++) {
                code += content[i] << (i * 5)
            }
            for (let i = 6; i < 9; i++) {
                code2 += content[i] << ((i - 6) * 5)
            }

            response = await _fetch('https://minecraftiplist.com/index.php?action=vote&listingID=' + project.id, {
                'headers': {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-language': 'ru,en;q=0.9,ru-RU;q=0.8,en-US;q=0.7',
                    'cache-control': 'no-cache',
                    'content-type': 'application/x-www-form-urlencoded',
                    'pragma': 'no-cache',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1'
                },
                'referrerPolicy': 'no-referrer-when-downgrade',
                'body': 'userign=' + project.nick + '&action=vote&action2=placevote&captchacode1=' + code + '&captchacode2=' + code2,
                'method': 'POST',
                'mode': 'cors',
                'credentials': 'include'
            }, project)
            if (!await checkResponseError(project, response, 'minecraftiplist.com')) return

            if (response.doc.querySelector('#Content > div.Error') != null) {
                if (response.doc.querySelector('#Content > div.Error').textContent.includes('You did not complete the crafting table correctly')) {
                    endVote({message: response.doc.querySelector('#Content > div.Error').textContent}, null, project)
                    return
                }
                if (response.doc.querySelector('#Content > div.Error').textContent.includes('last voted for this server')) {
                    let numbers = response.doc.querySelector('#Content > div.Error').textContent.substring(response.doc.querySelector('#Content > div.Error').textContent.length - 30).match(/\d+/g).map(Number)
                    let count = 0
                    let hour = 0
                    let min = 0
                    let sec = 0
                    for (let i in numbers) {
                        if (count == 0) {
                            hour = numbers[i]
                        } else if (count == 1) {
                            min = numbers[i]
                        }
                        count++
                    }
                    let milliseconds = (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000)
                    endVote({later: Date.now() + (86400000 - milliseconds)}, null, project)
                    return
                }
                endVote({message: response.doc.querySelector('#Content > div.Error').textContent}, null, project)
                return
            }
            if (response.doc.querySelector('#Content > div.Good') != null && response.doc.querySelector('#Content > div.Good').textContent.includes('You voted for this server!')) {
                endVote({successfully: true}, null, project)
                return
            }
        } else

        if (project.MCServerList) {
            let response = await _fetch('https://api.mcserver-list.eu/vote/', {'headers': {'content-type': 'application/x-www-form-urlencoded'}, 'body': 'username=' + project.nick + '&id=' + project.id,'method': 'POST'}, project)
            let json = await response.json()
            if (response.ok) {
                if (json[0].success == "false") {
                    if (json[0].error == 'username_voted') {
                        endVote({later: true}, null, project)
                        return
                    } else {
                        endVote({message: json[0].error}, null, project)
                        return
                    }
                } else {
                    endVote({successfully: true}, null, project)
                    return
                }
            } else {
                endVote({message: chrome.i18n.getMessage('errorVote', String(response.status))}, null, project)
                return
            }
        } else

        if (project.Custom) {
            let response = await _fetch(project.responseURL, project.id, project)
            await response.text()
            if (response.ok) {
                endVote({successfully: true}, null, project)
                return
            } else {
                endVote({message: chrome.i18n.getMessage('errorVote', String(response.status))}, null, project)
                return
            }
        }
    } catch (e) {
        if (e == 'TypeError: Failed to fetch' || e.message == 'The user aborted a request.') {
//          endVote({notConnectInternet: true}, null, project)
        } else {
            endVote({message: chrome.i18n.getMessage('errorVoteUnknown') + (e.stack ? e.stack : e)}, null, project)
        }
    }
}

async function checkResponseError(project, response, url, bypassCodes, vk) {
    let host = extractHostname(response.url)
    if (vk && host.includes('vk.com')) {
        if (response.headers.get('Content-Type').includes('windows-1251')) {
            //Почему не UTF-8?
            response = await new Response(new TextDecoder('windows-1251').decode(await response.arrayBuffer()))
        }
    }
    response.html = await response.text()
    response.doc = new DOMParser().parseFromString(response.html, 'text/html')
    if (vk && host.includes('vk.com')) {
        //Узнаём причину почему мы зависли на авторизации ВК
        let text
        if (response.doc.querySelector('div.oauth_form_access') != null) {
            text = response.doc.querySelector('div.oauth_form_access').textContent.replace(response.doc.querySelector('div.oauth_access_items').textContent, '').trim()
        } else if (response.doc.querySelector('div.oauth_content > div') != null) {
            text = response.doc.querySelector('div.oauth_content > div').textContent
        } else if (response.doc.querySelector('#login_blocked_wrap') != null) {
            text = response.doc.querySelector('#login_blocked_wrap div.header').textContent + ' ' + response.doc.querySelector('#login_blocked_wrap div.content').textContent.trim()
        } else if (response.doc.querySelector('div.login_blocked_panel') != null) {
            text = response.doc.querySelector('div.login_blocked_panel').textContent.trim()
        } else if (response.html.length < 500) {
            text = response.html
        } else {
            text = 'null'
        }
        endVote({errorAuthVK: text}, null, project)
        return false
    }
    if (!host.includes(url)) {
        endVote({message: chrome.i18n.getMessage('errorRedirected', response.url)}, null, project)
        return false
    }
    if (bypassCodes) {
        for (const code of bypassCodes) {
            if (response.status == code) {
                return true
            }
        }
    }
    if (!response.ok) {
        endVote({message: chrome.i18n.getMessage('errorVote', String(response.status))}, null, project)
        return false
    }
    return true
}

//Слушатель на обновление вкладок, если вкладка полностью загрузилась, загружает туда скрипт который сам нажимает кнопку проголосовать
chrome.webNavigation.onCompleted.addListener(function(details) {
    let project = openedProjects.get(details.tabId)
    if (project == null) return
    if (details.frameId == 0) {
        chrome.tabs.executeScript(details.tabId, {file: 'scripts/' + getProjectName(project).toLowerCase() +'.js'}, function() {
            if (chrome.runtime.lastError) {
                console.error(getProjectPrefix(project, true) + chrome.runtime.lastError.message)
                if (chrome.runtime.lastError.message != 'The tab was closed.') {
                    if (!settings.disabledNotifError) sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                    project.error = chrome.runtime.lastError.message
                    changeProject(project)
                }
            }
        })
        chrome.tabs.executeScript(details.tabId, {file: 'scripts/api.js'})
    } else if (details.url.match(/hcaptcha.com\/captcha\/*/) || details.url.match(/https:\/\/www.google.com\/recaptcha\/api.\/anchor*/) || details.url.match(/https:\/\/www.google.com\/recaptcha\/api.\/bframe*/) || details.url.match(/https:\/\/www.recaptcha.net\/recaptcha\/api.\/anchor*/) || details.url.match(/https:\/\/www.recaptcha.net\/recaptcha\/api.\/bframe*/)) {
        chrome.tabs.executeScript(details.tabId, {file: 'scripts/captchaclicker.js', frameId: details.frameId}, function() {
            if (chrome.runtime.lastError) {
                console.error(getProjectPrefix(project, true) + chrome.runtime.lastError.message)
                if (chrome.runtime.lastError.message != 'The frame was removed.') {
                    if (!settings.disabledNotifError) sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                    project.error = chrome.runtime.lastError.message
                    changeProject(project)
                }
            }
        })
    }
})

chrome.webRequest.onErrorOccurred.addListener(function(details) {
    if (details.initiator == 'chrome-extension://' + chrome.runtime.id) {
        if (fetchProjects.has(details.requestId)) {
            let project = fetchProjects.get(details.requestId)
            if (details.error.includes('net::ERR_ABORTED') || details.error.includes('net::ERR_CONNECTION_RESET') || details.error.includes('net::ERR_CONNECTION_CLOSED') || details.error.includes('net::ERR_NETWORK_CHANGED')) {
                console.warn(getProjectPrefix(project, true) + details.error)
                return
            }
            endVote({errorVoteNetwork: [details.error, details.url]}, null, project)
        }
    } else if (details.type == 'main_frame') {
        if (openedProjects.has(details.tabId)) {
            let project = openedProjects.get(details.tabId)
            if (details.error.includes('net::ERR_ABORTED') || details.error.includes('net::ERR_CONNECTION_RESET') || details.error.includes('net::ERR_CONNECTION_CLOSED') || details.error.includes('net::ERR_NETWORK_CHANGED')) {
                console.warn(getProjectPrefix(project, true) + details.error)
                return
            }
            let sender = {
                tab: {
                    id: details.tabId
                }
            }
            endVote({errorVoteNetwork: [details.error, details.url]}, sender, project)
        }
    }
}, {urls: ['<all_urls>']})

// chrome.webRequest.onBeforeRequest.addListener(function (details) {
//     if (details.initiator == 'chrome-extension://' + chrome.runtime.id && fetchProjects.has(details.requestId)) {
//         const project = fetchProjects.get(details.requestId)
//         if (project['AuthURL' + getProjectName(project)] != null || project['AuthURL' + getProjectName(project) + project.id] != null) {
//             if (details.url.includes('Ser.ga007')) {
//                 return {cancel: true}
//             }
//         }
//     }
// }, {urls: ['<all_urls>']}, ["blocking"])

async function _fetch(url, options, project) {
    let listener
    const removeListener = ()=>{
        if (listener) {
            chrome.webRequest.onBeforeRequest.removeListener(listener)
            listener = null
        }
    }

    listener = (details)=>{
        //Да это костыль, а есть другой адекватный вариант достать requestId или хотя бы код ошибки net:ERR из fetch запроса?
        if (details.initiator == 'chrome-extension://' + chrome.runtime.id && details.url.includes(url)) {
            fetchProjects.set(details.requestId, project)
            removeListener()
        }
    }
    chrome.webRequest.onBeforeRequest.addListener(listener, {urls: ['<all_urls>']})

    if (!options) options = {}
    if (controller.signal.aborted) {
        controller = new AbortController()
    }
    options.signal = controller.signal
    //Поддержка для браузера Uran (Chrome версии 59+)
    options.credentials = 'include'

    try {
        const response = await fetch(url, options)
        return response
    } catch(e) {
        throw e
    } finally {
        removeListener()
    }
}

//Слушатель сообщений и ошибок
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    //Если требует ручное прохождение капчи
    if ((request.captcha || request.authSteam || request.discordLogIn) && sender && openedProjects.has(sender.tab.id)) {
        let project = openedProjects.get(sender.tab.id)
        let message = request.captcha ? chrome.i18n.getMessage('requiresCaptcha') : chrome.i18n.getMessage(Object.keys(request)[0])
        console.warn(getProjectPrefix(project, true) + message)
        if (!settings.disabledNotifWarn) sendNotification(getProjectPrefix(project, false), message)
        project.error = message
        delete project.nextAttempt
        await changeProject(project)
    } else {
        endVote(request, sender, null)
    }
})

//Завершает голосование, если есть ошибка то обрабатывает её
async function endVote(request, sender, project) {
    if (sender && openedProjects.has(sender.tab.id)) {
        //Если сообщение доставлено из вкладки и если вкладка была открыта расширением
        project = openedProjects.get(sender.tab.id)
        if (closeTabs) {
            chrome.tabs.remove(sender.tab.id, function() {
                if (chrome.runtime.lastError) {
                    console.warn(getProjectPrefix(project, true) + chrome.runtime.lastError.message)
                    if (!settings.disabledNotifError && chrome.runtime.lastError.message != 'No tab with id.')
                        sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                }
            })
        }
        openedProjects.delete(sender.tab.id)
    } else if (!project) return

    for (let[key,value] of fetchProjects.entries()) {
        if (value.nick == project.nick && JSON.stringify(value.id) == JSON.stringify(project.id) && getProjectName(value) == getProjectName(project)) {
            fetchProjects.delete(key)
        }
    }

    delete project.nextAttempt

    let deleted = true
    for (let i = getProjectList(project).length; i--; ) {
        let temp = getProjectList(project)[i]
        if (temp.nick == project.nick && JSON.stringify(temp.id) == JSON.stringify(project.id) && getProjectName(temp) == getProjectName(project)) {
            getProjectList(project).splice(i, 1)
            deleted = false
        }
    }
    if (deleted) {
        console.warn('This project could not be found, it may have been deleted', JSON.stringify(project))
        return
    }

    //Если усё успешно
    let sendMessage = ''
    if (request.successfully || request.later) {
        if (settings.useMultiVote && settings.repeatAttemptLater) {
            if (request.successfully) {
                delete project.later
            } else {
                if (project.later) {
                    project.later = project.later + 1
                } else {
                    project.later = 1
                }
            }
        }
        let time = new Date()
        if (!project.Custom && (project.timeout || project.timeoutHour) && !(project.lastDayMonth && new Date(time.getYear(),time.getMonth() + 1,0).getDate() != new Date().getDate())) {
            if (project.timeoutHour) {
                if (!project.timeoutMinute) project.timeoutMinute = 0
                if (!project.timeoutSecond) project.timeoutSecond = 0
                if (time.getHours() > project.timeoutHour || (time.getHours() == project.timeoutHour && time.getMinutes() >= project.timeoutMinute)) {
                    time.setDate(time.getDate() + 1)
                }
                time.setHours(project.timeoutHour, project.timeoutMinute, project.timeoutSecond, 0)
            } else {
                time.setUTCMilliseconds(time.getUTCMilliseconds() + project.timeout)
            }
        } else if (request.later && Number.isInteger(request.later)) {
            time = new Date(request.later)
            if (project.ServeurPrive || project.TopGames) {
                project.countVote = project.countVote + 1
                if (project.countVote >= project.maxCountVote) {
                    time = new Date()
                    time.setDate(time.getDate() + 1)
                    time.setHours(0, (project.priority ? 0 : 10), 0, 0)
                }
            }
        } else {
            //Рейтинги с таймаутом сбрасывающемся раз в день в определённый час
            let hour
            if (project.TopCraft || project.McTOP || project.MinecraftRating || project.MonitoringMinecraft || project.IonMc || project.QTop) {
                //Топы на которых время сбрасывается в 00:00 по МСК
                hour = 21
            } else if (project.MCRate) {
                hour = 22
            } else if (project.MinecraftServerList || project.ServerList101) {
                hour = 23
            } else if (project.PlanetMinecraft || project.ListForge || project.MinecraftList) {
                hour = 5
            } else if (project.MinecraftServersOrg || project.MinecraftIndex || project.MinecraftBuzz || project.PixelmonServers) {
                hour = 0
            } else if (project.TopMinecraftServers) {
                hour = 4
            } else if (project.MMoTopRU) {
                hour = 20
            } else if (project.BotsForDiscord) {
                hour = 12
            }
            if (hour != null) {
                if (time.getUTCHours() > hour || (time.getUTCHours() == hour && time.getUTCMinutes() >= (project.priority ? 0 : 10))) {
                    time.setUTCDate(time.getUTCDate() + 1)
                }
                time.setUTCHours(hour, (project.priority ? 0 : 10), 0, 0)
            //Рейтинги с таймаутом сбрасывающемся через определённый промежуток времени с момента последнего голосования
            } else if (project.TopG || project.MinecraftServersBiz || project.TopGG || project.DiscordBotList || project.MCListsOrg) {
                time.setUTCHours(time.getUTCHours() + 12)
            } else if (project.MinecraftIpList || project.HotMC || project.MinecraftServerNet || project.TMonitoring || project.MCServers || project.CraftList || project.CzechCraft || project.TopMCServersCom || project.CraftListNet) {
                time.setUTCDate(time.getUTCDate() + 1)
            } else if (project.ServeurPrive || project.TopGames) {
                project.countVote = project.countVote + 1
                if (project.countVote >= project.maxCountVote) {
                    time.setDate(time.getDate() + 1)
                    time.setHours(0, (project.priority ? 0 : 10), 0, 0)
                    project.countVote = 0
                } else {
                    if (project.ServeurPrive) {
                        time.setUTCHours(time.getUTCHours() + 1, time.getUTCMinutes() + 30)
                    } else {
                        time.setUTCHours(time.getUTCHours() + 2)
                    }
                }
            } else if (project.ServerPact) {
                time.setUTCHours(time.getUTCHours() + 11)
                time.setUTCMinutes(time.getUTCMinutes() + 7)
            } else if (project.Custom) {
                if (project.timeoutHour != null) {
                    if (!project.timeoutMinute) project.timeoutMinute = 0
                    if (!project.timeoutSecond) project.timeoutSecond = 0
                    if (time.getHours() > project.timeoutHour || (time.getHours() == project.timeoutHour && time.getMinutes() >= project.timeoutMinute)) {
                        time.setDate(time.getDate() + 1)
                    }
                    time.setHours(project.timeoutHour, project.timeoutMinute, project.timeoutSecond, 0)
                } else {
                    time.setUTCMilliseconds(time.getUTCMilliseconds() + project.timeout)
                }
            } else if (project.MCServerList) {
                time.setUTCHours(time.getUTCHours() + 2)
            } else if (project.CraftList) {
                time = new Date(request.successfully)
            } else {
                time.setUTCDate(time.getUTCDate() + 1)
            }
        }

        time = time.getTime()
        project.time = time

        if (project.randomize) {
            project.time = project.time + Math.floor(Math.random() * 43200000)
        }

        if (settings.useMultiVote)  {
            if (currentVK != null && (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.QTop) && VKs.findIndex(function(element) { return element.id == currentVK.id && element.name == currentVK.name}) != -1) {
                if (request.later && settings.repeatAttemptLater && project.later != null) {
                    if (project.TopCraft || project.McTOP) {
                        if (request.later == 'nick_error') {
                            //None
                        } else if (request.later == 'vk_error') {
                            await useVK()
                        } else {
                            if (project.later >= 15) {
                                await useVK()
                            }
                        }
                    } else {
                        if (project.later >= 15) {
                            await useVK()
                        }
                    }
                } else {
                    await useVK()
                }
                async function useVK() {
                    let usedProject = {
                        id: project.id,
                        nextFreeVote: time
                    }
                    const index = getTopFromList(currentVK, project).findIndex(function(el) {return el.id == usedProject.id})
                    if (index > -1) {
                        getTopFromList(currentVK, project).splice(index, 1)
                    }
                    getTopFromList(currentVK, project).push(usedProject)
                    VKs[VKs.findIndex(function(element) { return element.id == currentVK.id && element.name == currentVK.name})] = currentVK
                    await setValue('AVMRVKs', VKs)
                }
            }
            
            if (currentProxy != null && (settings.useProxyOnUnProxyTop || (!project.TopCraft && !project.McTOP && !project.MinecraftRating)) && proxies.findIndex(function(element) { return element.ip == currentProxy.ip && element.port == currentProxy.port}) != -1) {
                let usedProject = {
                    id: project.id,
                    nextFreeVote: time
                }
                const index = getTopFromList(currentProxy, project).findIndex(function(el) {return el.id == usedProject.id})
                if (index > -1) {
                    getTopFromList(currentProxy, project).splice(index, 1)
                }
                getTopFromList(currentProxy, project).push(usedProject)
                proxies[proxies.findIndex(function(element) { return element.ip == currentProxy.ip && element.port == currentProxy.port})] = currentProxy
                await setValue('AVMRproxies', proxies)
            } else if (settings.useProxyOnUnProxyTop || (!project.TopCraft && !project.McTOP && !project.MinecraftRating)) {
                console.warn('currentProxy is null or not found')
            }
        }

        delete project.error

        if (request.successfully) {
            sendMessage = chrome.i18n.getMessage('successAutoVote')
            if (!settings.disabledNotifInfo) sendNotification(getProjectPrefix(project, false), sendMessage)

            if (!project.stats.successVotes) project.stats.successVotes = 0
            project.stats.successVotes++
            if (!project.stats.monthSuccessVotes) project.stats.monthSuccessVotes = 0
            project.stats.monthSuccessVotes++
            project.stats.lastSuccessVote = Date.now()

            if (!generalStats.successVotes) generalStats.successVotes = 0
            generalStats.successVotes++
            if (!generalStats.monthSuccessVotes) generalStats.monthSuccessVotes = 0
            generalStats.monthSuccessVotes++
            generalStats.lastSuccessVote = Date.now()
            delete project.later
        } else {
            if (settings.useMultiVote && settings.repeatAttemptLater && project.later && !(project.TopCraft || project.McTOP || project.MinecraftRating)) {//Пока что для безпроксиевых рейтингов игнорируется отключение игнорирование ошибки "Вы уже голосовали" не смотря на настройку useProxyOnUnProxyTop, в случае если на этих рейтингах будет проверка на айпи, сюда нужна будет проверка useProxyOnUnProxyTop
                if (project.later < 15) {
                    project.time = null
                    console.warn(getProjectPrefix(project, true) + chrome.i18n.getMessage('alreadyVotedRepeat'))
                } else {
                    delete project.later
                    console.warn(getProjectPrefix(project, true) + chrome.i18n.getMessage('alreadyVotedFail'))
                }
            }
            sendMessage = chrome.i18n.getMessage('alreadyVoted')
            if (typeof request.later == 'string') sendMessage = sendMessage + ' ' + request.later
            if (!settings.disabledNotifWarn) sendNotification(getProjectPrefix(project, false), sendMessage)

            if (!project.stats.laterVotes) project.stats.laterVotes = 0
            project.stats.laterVotes++

            if (!generalStats.laterVotes) generalStats.laterVotes = 0
            generalStats.laterVotes++
        }
        console.log(getProjectPrefix(project, true) + sendMessage + ', ' + chrome.i18n.getMessage('timeStamp') + ' ' + project.time)
        //Если ошибка
    } else {
        let message
        if (!request.message) {
            if (Object.values(request)[0] == true) {
                message = chrome.i18n.getMessage(Object.keys(request)[0])
            } else {
                message = chrome.i18n.getMessage(Object.keys(request)[0], Object.values(request)[0])
            }
        } else {
            message = request.message
        }
        if (message.length == 0) message = chrome.i18n.getMessage('emptyError')
        let retryCoolDown
        if (settings.useMultiVote) {
            sendMessage = message
            if ((project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.QTop) && request.errorAuthVK && currentVK != null) {
                currentVK.notWorking = request.errorAuthVK
                await setValue('AVMRVKs', VKs)
            } else if (project.MCRate && message.includes('Ваш аккаунт заблокирован для голосования за этот проект')) {
                let usedProject = {
                    id: project.id,
                    nextFreeVote: 999999999999999,
                    error: message
                }
                const index = getTopFromList(currentVK, project).findIndex(function(el) {return el.id == usedProject.id})
                if (index > -1) {
                    getTopFromList(currentVK, project).splice(index, 1)
                }
                getTopFromList(currentVK, project).push(usedProject)
                VKs[VKs.findIndex(function(element) { return element.id == currentVK.id && element.name == currentVK.name})] = currentVK
                await setValue('AVMRVKs', VKs)
            } else if (project.MCRate && message.includes('Ваш ВК ID заблокирован для голосовани')) {
                currentVK.MCRate = message
                await setValue('AVMRVKs', VKs)
            } else if (currentProxy != null && request && request.errorVoteNetwork) {
                if (request.errorVoteNetwork[0].includes('PROXY') || request.errorVoteNetwork[0].includes('TUNNEL') || request.errorVoteNetwork[0].includes('TIMED_OUT')) {
                    currentProxy.notWorking = request.errorVoteNetwork[0]
                    await setValue('AVMRproxies', proxies)
                    await stopVote()
                }
            }
        } else if (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.ServerPact || project.MinecraftIpList) {
            retryCoolDown = 300000
            sendMessage = message + '. ' + chrome.i18n.getMessage('errorNextVote', '5')
        } else {
            retryCoolDown = 900000
            sendMessage = message + '. ' + chrome.i18n.getMessage('errorNextVote', '15')
        }
        if (project.randomize) {
            retryCoolDown = retryCoolDown + Math.floor(Math.random() * 900000)
        }
        if (!settings.useMultiVote) {
            project.time = Date.now() + retryCoolDown
        } else {
            project.time = null
        }
        project.error = message
        console.error(getProjectPrefix(project, true) + sendMessage + ', ' + chrome.i18n.getMessage('timeStamp') + ' ' + project.time)
        if (!settings.disabledNotifError) sendNotification(getProjectPrefix(project, false), sendMessage)

        if (!project.stats.errorVotes) project.stats.errorVotes = 0
        project.stats.errorVotes++

        if (!generalStats.errorVotes) generalStats.errorVotes = 0
        generalStats.errorVotes++
    }

    if (project.priority || (settings.useMultiVote && settings.repeatAttemptLater && project.later && project.later <= 15)) {
        getProjectList(project).unshift(project)
    } else {
        getProjectList(project).push(project)
    }
    await setValue('generalStats', generalStats)
    await setValue('AVMRprojects' + getProjectName(project), getProjectList(project))

    setTimeout(async ()=>{
        for (const value of queueProjects) {
            if (value.nick == project.nick && JSON.stringify(value.id) == JSON.stringify(project.id) && getProjectName(value) == getProjectName(project)) {
                queueProjects.delete(value)
            }
        }
        if (settings.useMultiVote && queueProjects.size == 0) {
            if (debug) console.log('queueProjects.size == 0, удаляю прокси и очищаю текущий ВК и прокси')
            if (currentProxy != null) clearProxy()
            currentProxy = null
            currentVK = null
        }
    }, settings.useMultiVote && settings.cooldown < 5000 && (settings.useProxyOnUnProxyTop || (!project.TopCraft && !project.McTOP && !project.MinecraftRating)) ? 0 : 5000)
}

//Отправитель уведомлений
function sendNotification(title, message) {
    let notification = {
        type: 'basic',
        iconUrl: 'images/icon128.png',
        title: title,
        message: message
    }
    chrome.notifications.create('', notification, function() {})
}

function getProjectName(project) {
    return Object.keys(project)[0]
}

function getProjectPrefix(project, detailed) {
    if (detailed) {
        return '[' + getProjectName(project) + '] ' + (project.nick != null && project.nick != '' ? project.Custom ? project.nick : project.nick + ' – ' : '') + (project.game != null ? project.game + ' – ' : '') + (project.Custom ? '' : project.id) + (project.name != null ? ' – ' + project.name : '') + ' '
    } else {
        return '[' + getProjectName(project) + '] ' + (project.nick != null && project.nick != '' ? project.nick : project.game != null ? project.game : project.name) + (project.Custom ? '' : project.name != null ? ' – ' + project.name : ' – ' + project.id)
    }
}

function getProjectList(project) {
    return window['projects' + getProjectName(project)]
}

//Проверяет правильное ли у вас время
async function checkTime() {
    try {
        let response = await fetch('https://api.cifrazia.com/')
        if (response.ok && !response.redirected) {
            // если HTTP-статус в диапазоне 200-299 и не было переадресаций
            // получаем тело ответа и сравниваем время
            let json = await response.json()
            let serverTimeUTC = Number(json.timestamp.toString().replace('.', '').substring(0, 13))
            let timeUTC = Date.now()
            let timeDifference = (timeUTC - serverTimeUTC)
            if (Math.abs(timeDifference) > 300000) {
                let text
                let time
                let unit
                if (timeDifference > 0) {
                    text = chrome.i18n.getMessage('clockHurry')
                } else {
                    text = chrome.i18n.getMessage('clockLagging')
                }
                if (timeDifference > 3600000 || timeDifference < -3600000) {
                    time = (Math.abs(timeDifference) / 1000 / 60 / 60).toFixed(1)
                    unit = chrome.i18n.getMessage('clockHourns')
                } else {
                    time = (Math.abs(timeDifference) / 1000 / 60).toFixed(1)
                    unit = chrome.i18n.getMessage('clockMinutes')
                }
                let text2 = chrome.i18n.getMessage('clockInaccurate', [text, time, unit])
                console.warn(text2)
                if (!settings.disabledNotifWarn)
                    sendNotification(chrome.i18n.getMessage('clockInaccurateLog', text), text2)
            }
        } else {
            console.error(chrome.i18n.getMessage('errorClock2', String(response.status)))
        }
    } catch (e) {
        console.error(chrome.i18n.getMessage('errorClock', e))
        return
    }
}

async function setCookie(url, name, value) {
    return new Promise(resolve=>{
        chrome.cookies.set({'url': url, 'name': name, 'value': value}, function(details) {
            resolve(details)
        })
    })
}

async function setCookieDetails(details) {
    return new Promise(resolve=>{
        chrome.cookies.set(details, function(det) {
            resolve(det)
        })
    })
}

async function getCookie(url, name) {
    return new Promise(resolve=>{
        chrome.cookies.get({'url': url, 'name': name}, function(cookie) {
            resolve(cookie)
        })
    })
}

async function removeCookie(url, name) {
    return new Promise(resolve=>{
        chrome.cookies.remove({'url': url, 'name': name}, function(details) {
            resolve(details)
        })
    })
}

//Асинхронно достаёт/сохраняет настройки в chrome.storage
async function getLocalValue(name) {
    return new Promise((resolve, reject)=>{
        chrome.storage.local.get(name, function(data) {
            if (chrome.runtime.lastError) {
                sendNotification(chrome.i18n.getMessage('storageError'), chrome.runtime.lastError.message)
                console.error(chrome.i18n.getMessage('storageError', chrome.runtime.lastError.message))
                reject(chrome.runtime.lastError.message)
            } else {
                resolve(data[name])
            }
        })
    })
}
async function getValue(name) {
    return new Promise((resolve, reject)=>{
        chrome.storage[storageArea].get(name, function(data) {
            if (chrome.runtime.lastError) {
                sendNotification(chrome.i18n.getMessage('storageError'), chrome.runtime.lastError.message)
                console.error(chrome.i18n.getMessage('storageError', chrome.runtime.lastError.message))
                reject(chrome.runtime.lastError.message)
            } else {
                resolve(data[name])
            }
        })
    })
}
async function setValue(key, value) {
    return new Promise((resolve, reject)=>{
        chrome.storage[storageArea].set({[key]: value}, function(data) {
            if (chrome.runtime.lastError) {
                sendNotification(chrome.i18n.getMessage('storageErrorSave'), chrome.runtime.lastError.message)
                console.error(chrome.i18n.getMessage('storageErrorSave', chrome.runtime.lastError.message))
                reject(chrome.runtime.lastError.message)
            } else {
                resolve(data)
            }
        })
    })
}

async function clearProxy() {
    if (debug) console.log('Удаляю прокси')
    return new Promise(resolve => {
        chrome.proxy.settings.clear({scope: 'regular'},function() {
            resolve()
        })
    })
}

async function setProxy(config) {
    return new Promise(resolve => {
        chrome.proxy.settings.set({value: config, scope: 'regular'},function() {
            resolve()
        })
    })
}
async function wait(ms) {
    return new Promise(resolve=>{
        setTimeout(()=>{
            resolve()
        }, ms)
    })
}

async function changeProject(project) {
    let projects = getProjectList(project)
    for (let i in projects) {
        if (projects[i].nick == project.nick && JSON.stringify(projects[i].id) == JSON.stringify(project.id)) {
            projects[i] = project
            await setValue('AVMRprojects' + getProjectName(project), projects)
            break
            //Stop this loop, we found it!
        }
    }
}

async function forLoopAllProjects(fuc) {
    if (lastErrorNotFound != null) lastErrorNotFound = null
    for (const item of allProjects) {
        if (break1) {
            break1 = false
            break
        }
        for (let proj of window['projects' + item]) {
            if (break2) {
                break2 = false
                break
            }
            await fuc(proj)
        }
    }
    if (lastErrorNotFound != null) {
        settings.stopVote = Date.now() + 86400000
        console.error(lastErrorNotFound + ' ' + chrome.i18n.getMessage('voteSuspendedDay'))
        if (!settings.disabledNotifError) sendNotification(lastErrorNotFound, lastErrorNotFound + ' ' + chrome.i18n.getMessage('voteSuspendedDay'))
        await setValue('AVMRsettings', settings)
        await stopVote()
    }
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

//Слушатель на изменение настроек
chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (let key in changes) {
        let storageChange = changes[key]
        if (key == 'storageArea') {
            storageArea = storageChange.newValue
        } else if (namespace != storageArea) {
            return
        } else if (key.startsWith('AVMRprojects')) {
            window['projects' + key.replace('AVMRprojects', '')] = storageChange.newValue
            for (const project of storageChange.newValue) {
                for (let[key,value] of openedProjects.entries()) {
                    if (getProjectName(project) == getProjectName(value) && JSON.stringify(project.id) == JSON.stringify(value) && project.nick == value.nick) {
                        openedProjects.set(key, project)
                    }
                }
                for (let value of queueProjects) {
                    if (getProjectName(project) == getProjectName(value) && JSON.stringify(project.id) == JSON.stringify(value) && project.nick == value.nick) {
                        queueProjects.delete(value)
                        queueProjects.add(project)
                    }
                }
            }
        } else if (key == 'AVMRsettings') {
            settings = storageChange.newValue
        } else if (key == 'generalStats') {
            generalStats = storageChange.newValue
        } else if (key == 'AVMRVKs') {
            VKs = storageChange.newValue
        } else if (key == 'AVMRproxies') {
            proxies = storageChange.newValue
        }
    }
})

async function stopVote() {
    if (debug) console.log('Отмена всех голосований и очистка всего')
    await clearProxy()
    currentVK = null
    currentProxy = null
    queueProjects.clear()
    for (let[key,value] of openedProjects.entries()) {
        chrome.tabs.remove(key, function() {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError.message)
                if (!settings.disabledNotifError)
                    sendNotification(chrome.i18n.getMessage('closeTabError'), chrome.runtime.lastError.message)
            }
        })
    }
    controller.abort()
    openedProjects.clear()
    fetchProjects.clear()
    break1 = true
    break2 = true
}

//Если требуется авторизация для Прокси
let errorProxy = {ip: '', count: 0}
chrome.webRequest.onAuthRequired.addListener(async function(details, callbackFn) {
    if (details.isProxy && currentProxy && currentProxy != null) {
        if (errorProxy.ip != currentProxy.ip) {
            errorProxy.count = 0
        }
        errorProxy.ip = currentProxy.ip
        if (errorProxy.count++ > 5) {
            currentProxy.notWorking = chrome.i18n.getMessage('errorAuthProxy1') + ' ' + chrome.i18n.getMessage('errorAuthProxy2')
            console.error(chrome.i18n.getMessage('errorAuthProxy1') + ' ' + chrome.i18n.getMessage('errorAuthProxy2'))
            if (!settings.disabledNotifError) {
                sendNotification(chrome.i18n.getMessage('errorAuthProxy1'), chrome.i18n.getMessage('errorAuthProxy2'))
            }
            callbackFn()
            return
        }
        if (currentProxy.login) {
            console.log(chrome.i18n.getMessage('proxyAuth'))
            callbackFn({
                authCredentials: {
                    'username': currentProxy.login,
                    'password': currentProxy.password
                }
            })
            return
        } else if (currentProxy.TunnelBear) {
            console.log(chrome.i18n.getMessage('proxyAuthOther', 'TunnelBear'))
            if (tunnelBear.token != null && tunnelBear.expires > Date.now()) {
                callbackFn({
                    authCredentials: {
                        'username': tunnelBear.token,
                        'password': tunnelBear.token
                    }
                })
                return
            } else {
                settings.stopVote = Date.now() + 86400000
                console.error(chrome.i18n.getMessage('errorAuthProxyTB'))
                if (!settings.disabledNotifError) {
                    sendNotification(chrome.i18n.getMessage('errorAuthProxy1'), chrome.i18n.getMessage('errorAuthProxyTB'))
                }
                await setValue('AVMRsettings', settings)
                await stopVote()
            }
        } else if (currentProxy.Windscribe) {
            console.log(chrome.i18n.getMessage('proxyAuthOther', 'Windscribe'))
            callbackFn({
                authCredentials: {
                    'username': 'mdib1352-t94rvyq',
                    'password': 'uem29h65n8'
                }
            })
            return
        } else if (currentProxy.HolaVPN) {
            console.log(chrome.i18n.getMessage('proxyAuthOther', 'HolaVPN'))
            callbackFn({
                authCredentials: {
                    'username': 'user-uuid-c1b9e2c1bbab1664da384d748ef3899c',
                    'password': '6e07f7fa2eda'
                }
            })
            return
        } else if (currentProxy.ZenMate) {
            console.log(chrome.i18n.getMessage('proxyAuthOther', 'ZenMate'))
            callbackFn({
                authCredentials: {
                    'username': '97589925',
                    'password': 'ef483afb122e05400f895434df1394a82d31e340'
                }
            })
            return
        } else if (currentProxy.NordVPN) {
            console.log(chrome.i18n.getMessage('proxyAuthOther', 'NordVPN'))
            callbackFn({
                authCredentials: {
                    'username': 'n2qNF1K4PBLbWWkJSTfmGEdX',
                    'password': 'UKweV43HJP5QnWtVEaWnCChM'
                }
            })
            return
        } else {
            currentProxy.notWorking = chrome.i18n.getMessage('errorAuthProxy1') + ' ' + chrome.i18n.getMessage('errorAuthProxyNoPassword')
            console.error(chrome.i18n.getMessage('errorAuthProxy1') + ' ' + chrome.i18n.getMessage('errorAuthProxyNoPassword'))
            if (!settings.disabledNotifError) {
                sendNotification(chrome.i18n.getMessage('errorAuthProxy1'), chrome.i18n.getMessage('errorAuthProxyNoPassword'))
            }
        }
    }
    callbackFn()
}, {urls: ['<all_urls>']}, ['asyncBlocking'])

chrome.runtime.onInstalled.addListener(async function(details) {
    if (details.reason == 'install') {
        chrome.runtime.openOptionsPage()
    } else if (details.reason == 'update' && details.previousVersion && (new Version(details.previousVersion)).compareTo(new Version('4.0.0')) == -1) {
        console.log('Перенос MinecraftMp в ListForge')
        let oldMinecraftMp = await getValue('AVMRprojectsMinecraftMp')
        if (oldMinecraftMp != null && typeof oldMinecraftMp != 'function' && oldMinecraftMp.length > 0) {
            for (const old of oldMinecraftMp) {
                let newListForge = {}
                newListForge.ListForge = true
                newListForge.game = 'minecraft-mp.com'
                newListForge.id = old.id
                newListForge.name = old.name
                newListForge.stats = old.stats
                newListForge.nick = old.nick
                newListForge.time = old.time
                projectsListForge.push(newListForge)
            }
            await setValue('AVMRprojectsListForge', projectsListForge)
            await setValue('AVMRprojectsMinecraftMp', null)
        }
    } else if (details.previousVersion && (new Version(details.previousVersion)).compareTo(new Version(chrome.runtime.getManifest().version)) == -1) {
//      chrome.runtime.openOptionsPage()
        window.open('options.html?updated')
    }
})

function getTopFromList(list, project) {
    if (typeof list[getProjectName(project)] === 'string') {
        return [{id: project.id, nextFreeVote: Number.POSITIVE_INFINITY}]
    }
    if (!list[getProjectName(project)]) list[getProjectName(project)] = []
    return list[getProjectName(project)]
}

function Version(s){
  this.arr = s.split('.').map(Number);
}
Version.prototype.compareTo = function(v){
  for (let i=0; ;i++) {
    if (i>=v.arr.length) return i>=this.arr.length ? 0 : 1;
    if (i>=this.arr.length) return -1;
    var diff = this.arr[i]-v.arr[i]
    if (diff) return diff>0 ? 1 : -1;
  }
}

const varToString = varObj=>Object.keys(varObj)[0]


// https://github.com/lesander/console.history
/**
 * Console History v1.5.1
 * console-history.js
 *
 * Licensed under the MIT License.
 * https://git.io/console
 */

// 'use strict'

// /* Allow only one instance of console-history.js */
// if (typeof console.history !== 'undefined') {
//   throw new Error('Only one instance of console-history.js can run at a time.')
// }

/* Store the original log functions. */
console._log = console.log
console._info = console.info
console._warn = console.warn
console._error = console.error
console._debug = console.debug

/* Declare our console history variable. */
// console.history = []
if (!localStorage.consoleHistory)
    localStorage.consoleHistory = ''

/* Redirect all calls to the collector. */
console.log = function () { return console._intercept('log', arguments) }
console.info = function () { return console._intercept('info', arguments) }
console.warn = function () { return console._intercept('warn', arguments) }
console.error = function () { return console._intercept('error', arguments) }
console.debug = function () { return console._intercept('debug', arguments) }

/* Give the developer the ability to intercept the message before letting
   console-history access it. */
console._intercept = function (type, args) {
    // Your own code can go here, but the preferred method is to override this
    // function in your own script, and add the line below to the end or
    // begin of your own 'console._intercept' function.
    // REMEMBER: Use only underscore console commands inside _intercept!
    console._collect(type, args)
}

let db
const openRequest = indexedDB.open('logs', 1)
openRequest.onupgradeneeded = function() {
    // срабатывает, если на клиенте нет базы данных
    // ...выполнить инициализацию...
    openRequest.result.createObjectStore('logs', {autoIncrement: true})
    //Удаляем старые логи из localStorage
    if (localStorage.consoleHistory) localStorage.removeItem('consoleHistory')
}
openRequest.onerror = function() {
    console._error(chrome.i18n.getMessage('errordb', 'logs'), openRequest.error)
}
openRequest.onsuccess = function() {
    db = openRequest.result
    db.onerror = function(event) {
        let request = event.target // запрос, в котором произошла ошибка
        
        console._error(chrome.i18n.getMessage('errordb', 'logs'), request.error)
    }
    // продолжить работу с базой данных, используя объект db

    /* Define the main log catcher. */
    console._collect = function (type, args) {
      // WARNING: When debugging this function, DO NOT call a modified console.log
      // function, all hell will break loose.
      // Instead use the original console._log functions.
    
      // All the arguments passed to any function, even when not defined
      // inside the function declaration, are stored and locally available in
      // the variable called 'arguments'.
      //
      // The arguments of the original console.log functions are collected above,
      // and passed to this function as a variable 'args', since 'arguments' is
      // reserved for the current function.
    
      // Collect the timestamp of the console log.
    //   var time = new Date().toUTCString()
        let time = new Date().toLocaleString().replace(',', '')
        
        // Make sure the 'type' parameter is set. If no type is set, we fall
        // back to the default log type.
        if (!type) type = 'log'
        
        // To ensure we behave like the original console log functions, we do not
        // output anything if no arguments are provided.
        if (!args || args.length === 0) return
        
        // Act normal, and just pass all original arguments to
        // the origial console function :)
        console['_' + type].apply(console, args)
        
        // Get stack trace information. By throwing an error, we get access to
        // a stack trace. We then go up in the trace tree and filter out
        // irrelevant information.
    //   var stack = false
    //   try { throw Error('') } catch (error) {
    //     // The lines containing 'console-history.js' are not relevant to us.
    //     var stackParts = error.stack.split('\n')
    //     stack = []
    //     for (var i = 0; i < stackParts.length; i++) {
    //       if (stackParts[i].indexOf('console-history.js') > -1 ||
    //       stackParts[i].indexOf('console-history.min.js') > -1 ||
    //       stackParts[i] === 'Error') {
    //         continue
    //       }
    //       stack.push(stackParts[i].trim())
    //     }
    //   }
    
      // Add the log to our history.
    //   console.history.push({ type: type, timestamp: time, arguments: args/*, stack: stack*/ })
    
        const transaction = db.transaction('logs', 'readwrite')
        
        // получить хранилище объектов для работы с ним
        const logs = transaction.objectStore('logs')
        
        let log = '[' + time + ' ' + type.toUpperCase() + ']:'
    
        for (let i in args) {
            let arg = args[i]
            if (typeof arg != 'string')
                arg = JSON.stringify(arg)
            log += ' ' + arg
        }
    
        const request = logs.add(log)
    }
    
    console.log(chrome.i18n.getMessage('start'))
}

/*
Открытый репозиторий:
https://gitlab.com/Serega007/auto-vote-minecraft-rating
*/
