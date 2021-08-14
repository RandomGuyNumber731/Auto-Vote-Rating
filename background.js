//Текущие открытые вкладки расширением
// noinspection ES6ConvertVarToLetConst
var openedProjects = new Map()
//Текущие fetch запросы
// noinspection ES6ConvertVarToLetConst
var fetchProjects = new Map()
//Текущие проекты за которые сейчас голосует расширение
// noinspection ES6ConvertVarToLetConst
var queueProjects = new Set()

//Есть ли доступ в интернет?
let online = true

let secondVoteMinecraftIpList = false

// noinspection ES6ConvertVarToLetConst
var currentVK
// noinspection ES6ConvertVarToLetConst
var currentProxy

//Прерывает выполнение fetch запросов на случай ошибки в режиме MultiVote
let controller = new AbortController()

let debug = false

//Токен TunnelBear
let tunnelBear = {}

//Нужно ли щас делать проверку голосования, false может быть только лишь тогда когда предыдущая проверка ещё не завершилась
let check = true
// let break1 = false
// let break2 = false
let lastErrorNotFound

//Закрывать ли вкладку после окончания голосования? Это нужно для диагностирования ошибки
let closeTabs = true

//Где храним настройки
// let storageArea = 'local'

//Инициализация настроек расширения
initializeConfig(true)

//Проверялка: нужно ли голосовать, сверяет время текущее с временем из конфига
async function checkVote() {

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

    if (lastErrorNotFound != null) lastErrorNotFound = null

    const projects = await db.getAll('projects')
    for (const project of projects) {
        if (project.time == null || project.time < Date.now()) {
            await checkOpen(project)
        }
    }

    if (lastErrorNotFound != null) {
        settings.stopVote = Date.now() + 86400000
        console.error(lastErrorNotFound + ' ' + chrome.i18n.getMessage('voteSuspendedDay'))
        if (!settings.disabledNotifError) sendNotification(lastErrorNotFound, lastErrorNotFound + ' ' + chrome.i18n.getMessage('voteSuspendedDay'))
        await db.put('other', settings, 'settings')
        await stopVote()
        chrome.runtime.sendMessage({stopVote: lastErrorNotFound})
    }

    check = true
    // break1 = false
    // break2 = false
}

//Триггер на голосование когда подходит время голосования
chrome.alarms.onAlarm.addListener(checkVote)

async function reloadAllAlarms() {
    await new Promise(resolve => chrome.alarms.clearAll(resolve))
    let cursor = await db.transaction('projects').store.openCursor()
    const times = []
    while (cursor) {
        const project = cursor.value
        if (project.time != null && project.time > Date.now() && times.indexOf(project.time) === -1) {
            chrome.alarms.create(String(cursor.key), {when: project.time})
            times.push(project.time)
        }
        cursor = await cursor.continue()
    }
}

window.addEventListener('online', ()=> {
    online = true
    checkVote()
})
window.addEventListener('offline', ()=> {
    online = false
})

async function checkOpen(project) {
    if (settings.stopVote > Date.now()) return
    //Если нет подключения к интернету
    if (!settings.disabledCheckInternet) {
        if (!navigator.onLine && online) {
            online = false
            console.warn(chrome.i18n.getMessage('internetDisconected'))
            if (!settings.disabledNotifError) sendNotification(getProjectPrefix(project, false), chrome.i18n.getMessage('internetDisconected'))
            return
        } else if (!online) {
            return
        }
    }

    //Не позволяет открыть больше одной вкладки для одного топа или если проект рандомизирован но если проект голосует больше 5 или 15 минут то идёт на повторное голосование
    for (let value of queueProjects) {
        if (project.rating === value.rating || value.randomize && project.randomize) {
            if (!value.nextAttempt) return
            if (Date.now() < value.nextAttempt) {
                return
            } else {
                queueProjects.delete(value)
                console.warn(getProjectPrefix(value, true) + chrome.i18n.getMessage('timeout'))
                if (!settings.disabledNotifWarn) sendNotification(getProjectPrefix(value, false), chrome.i18n.getMessage('timeout'))
            }
        }

        //Проект с MultiVote и с без MultiVote не должны вместе голосовать
        if (settings.useMultiVote && (project.useMultiVote == null ? true : project.useMultiVote) !== (value.useMultiVote == null ? true : value.useMultiVote)) return

        if (((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) && !settings.useProxyOnUnProxyTop) {
            //Не позволяет голосовать безпроксиевых рейтингов с проксиевыми
            if (project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MinecraftRating') {
                if (value.rating !== 'TopCraft' && value.rating !== 'McTOP' && value.rating !== 'MinecraftRating' && value.useMultiVote !== false) {
                    return
                }
            }
            if (value.rating === 'TopCraft' || value.rating === 'McTOP' || value.rating === 'MinecraftRating') {
                if (project.rating !== 'TopCraft' && project.rating !== 'McTOP' && project.rating !== 'MinecraftRating' && value.useMultiVote !== false) {
                    //Если безпроксиевый рейтинг закончил голосование, позволяет проксиевым начать голосовать ради экономии времени
                    if (value.time < Date.now()) {
                        return
                    }
                }
            }
        }
    }
    if (currentProxy != null && project.useMultiVote === false) return//Если пытается пройти проект с отключённым MultiVote, он не должен пройти с включённым прокси
    if ((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) {
        //Не позволяет голосовать проекту если он уже голосовал на текущем ВК или прокси
        if (currentVK != null && (project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'QTop')) {
            let usedProjects = getTopFromList(currentVK, project)
            for (let usedProject of usedProjects) {
                if (project.id === usedProject.id && usedProject.nextFreeVote > Date.now()) {
                    return
                }
            }
            if (currentVK.notWorking) {
                let _return = true
                if (project.rating === 'TopCraft' && (currentVK.passwordTopCraft/* || project.AuthURLTopCraft*/)) _return = false
                if (project.rating === 'McTOP' && (currentVK.passwordMcTOP/* || project.AuthURLMcTOP*/)) _return = false
//              if (project.rating === 'MinecraftRating' && currentVK['AuthURLMinecraftRating' + project.id] != null) _return = false
//              if (project.rating === 'MonitoringMinecraft' && currentVK['AuthURLMonitoringMinecraft' + project.id] != null) _return = false
                if (_return) return
            }
        }
        if (currentProxy != null) {
            if (!settings.useProxyOnUnProxyTop && (project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MinecraftRating')) {
                return
            }
            let usedProjects = getTopFromList(currentProxy, project)
            for (let usedProject of usedProjects) {
                if (project.id === usedProject.id && usedProject.nextFreeVote > Date.now()) {
                    return
                }
            }
        }

        //Если включён режим MultiVote то применяет куки ВК если на то требуется и применяет прокси (применяет только не юзанный ВК или прокси)
        if (currentVK == null && (project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'QTop')) {
            //Ищет не юзанный свободный аккаунт ВК
            let found = false
            let cursor = await db.transaction('vks').store.openCursor()
            while (cursor) {
                const vkontakte = cursor.value
                if (vkontakte.notWorking) {
                    let _continue = true
                    if (project.rating === 'TopCraft' && (vkontakte.passwordTopCraft/* || vkontakte.AuthURLTopCraft*/)) _continue = false
                    if (project.rating === 'McTOP' && (vkontakte.passwordMcTOP/* || project.AuthURLMcTOP*/)) _continue = false
//                  if (project.rating === 'MinecraftRating' && vkontakte['AuthURLMinecraftRating' + project.id] != null) _continue = false
//                  if (project.rating === 'MonitoringMinecraft' && vkontakte['AuthURLMonitoringMinecraft' + project.id] != null) _continue = false
                    if (_continue) {
                        cursor = await cursor.continue()
                        continue
                    }
                }
                let usedProjects = getTopFromList(vkontakte, project)
                let used = false
                for (let usedProject of usedProjects) {
                    if (project.id === usedProject.id && usedProject.nextFreeVote > Date.now()) {
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
                        if (cookies[i].domain.charAt(0) === '.') cookies[i].domain = cookies[i].domain.substring(1, cookies[i].domain.length)
                        await removeCookie('https://' + cookies[i].domain + cookies[i].path, cookies[i].name)
                    }

                    console.log(chrome.i18n.getMessage('applyVKCookies', vkontakte.id + ' - ' + vkontakte.name))

                    //Применяет куки ВК найденного свободного незаюзанного аккаунта ВК
                    for (let i = 0; i < vkontakte.cookies.length; i++) {
                        let cookie = vkontakte.cookies[i]
                        if (cookie.domain.charAt(0) === '.') cookie.domain = cookie.domain.substring(1, cookie.domain.length)
                        await setCookieDetails({
                            url: 'https://' + cookie.domain + cookie.path,
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
                cursor = await cursor.continue()
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
                    if (project.key === value.key) {
                        queueProjects.delete(value)
                    }
                }
//              break2 = true
                return
            }
        }

        if (currentProxy == null && (settings.useProxyOnUnProxyTop || (project.rating !== 'TopCraft' && project.rating !== 'McTOP' && project.rating !== 'MinecraftRating'))) {
            let proxyDetails = await new Promise(resolve => {
                chrome.proxy.settings.get({}, async function(details) {
                    resolve(details)
                })
            })
            if (!(proxyDetails.levelOfControl === 'controllable_by_this_extension' || proxyDetails.levelOfControl === 'controlled_by_this_extension')) {
                settings.stopVote = Date.now() + 86400000
                console.error(chrome.i18n.getMessage('otherProxy'))
                if (!settings.disabledNotifError) {
                    sendNotification(chrome.i18n.getMessage('otherProxy'), chrome.i18n.getMessage('otherProxy'))
                }
                await db.put('other', settings, 'settings')
                await stopVote()
                chrome.runtime.sendMessage({stopVote: chrome.i18n.getMessage('otherProxy')})
                return
            }
            //Ищет не юзанный свободный прокси
            let found = false
            let cursor = await db.transaction('proxies').store.openCursor()
            while (cursor) {
                const proxy = cursor.value
                if (proxy.notWorking) {
                    cursor = await cursor.continue()
                    continue
                }
                let usedProjects = getTopFromList(proxy, project)
                let used = false
                for (let usedProject of usedProjects) {
                    if (project.id === usedProject.id && usedProject.nextFreeVote > Date.now()) {
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
                            await db.put('other', settings, 'settings')
                            await stopVote()
                            if (response.status === 401) {
                                console.error(chrome.i18n.getMessage('proxyTBAuth1') + ', ' + chrome.i18n.getMessage('proxyTBAuth2'))
                                chrome.runtime.sendMessage({stopVote: chrome.i18n.getMessage('proxyTBAuth1') + ', ' + chrome.i18n.getMessage('proxyTBAuth2')})
                                if (!settings.disabledNotifError) sendNotification(chrome.i18n.getMessage('proxyTBAuth1'), chrome.i18n.getMessage('proxyTBAuth2'))
                                return
                            }
                            chrome.runtime.sendMessage({stopVote: chrome.i18n.getMessage('notConnect', response.url) + response.status})
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
                cursor = await cursor.continue()
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
                    if (project.key === value.key) {
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
        if (project.rating === 'TopCraft') {
            url = '.topcraft.ru'
        } else if (project.rating === 'McTOP') {
            url = '.mctop.su'
        } else if (project.rating === 'MCRate') {
            url = '.mcrate.su'
        } else if (project.rating === 'MinecraftRating') {
            url = '.minecraftrating.ru'
        } else if (project.rating === 'MonitoringMinecraft') {
            url = '.monitoringminecraft.ru'
        } else if (project.rating === 'FairTop') {
            url = '.fairtop.in'
        } else if (project.rating === 'IonMc') {
            url = '.ionmc.top'
        } else if (project.rating === 'MinecraftServersOrg') {
            url = '.minecraftservers.org'
        } else if (project.rating === 'ServeurPrive') {
            url = '.serveur-prive.net'
        } else if (project.rating === 'PlanetMinecraft') {
            url = '.planetminecraft.com'
        } else if (project.rating === 'TopG') {
            url = '.topg.org'
        } else if (project.rating === 'ListForge') {
            url = '.' + project.game
        } else if (project.rating === 'MinecraftServerList') {
            url = '.minecraft-server-list.com'
        } else if (project.rating === 'ServerPact') {
            url = '.serverpact.com'
        } else if (project.rating === 'MinecraftIpList') {
            url = '.minecraftiplist.com'
        } else if (project.rating === 'TopMinecraftServers') {
            url = '.topminecraftservers.org'
        } else if (project.rating === 'MinecraftServersBiz') {
            url = '.minecraftservers.biz'
        } else if (project.rating === 'HotMC') {
            url = '.hotmc.ru'
        } else if (project.rating === 'MinecraftServerNet') {
            url = '.minecraft-server.net'
        } else if (project.rating === 'TopGames') {
            if (project.lang === 'fr') {
                url = '.top-serveurs.net'
            } else {
                url = '.top-games.net'
            }
            url = '.minecraftservers.biz'
        } else if (project.rating === 'TMonitoring') {
            url = '.tmonitoring.com'
        } else if (project.rating === 'TopGG') {
            url = '.top.gg'
        } else if (project.rating === 'DiscordBotList') {
            url = '.discordbotlist.com'
        } else if (project.rating === 'BotsForDiscord') {
            url = '.botsfordiscord.com'
        } else if (project.rating === 'MMoTopRU') {
            url = '.mmotop.ru'
        } else if (project.rating === 'MCServers') {
            url = '.mc-servers.com'
        } else if (project.rating === 'MinecraftList') {
            url = '.minecraftlist.org'
        } else if (project.rating === 'MinecraftIndex') {
            url = '.minecraft-index.com'
        } else if (project.rating === 'ServerList101') {
            url = '.serverlist101.com'
        } else if (project.rating === 'MCServerList') {
            url = '.mcserver-list.eu'
        } else if (project.rating === 'CraftList') {
            url = '.craftlist.org'
        } else if (project.rating === 'CzechCraft') {
            url = '.czech-craft.eu'
        } else if (project.rating === 'PixelmonServers') {
            url = '.pixelmonservers.com'
        } else if (project.rating === 'QTop') {
            url = '.q-top.ru'
        } else if (project.rating === 'MinecraftBuzz') {
            url = '.minecraft.buzz'
        }/* else if (project.rating === 'Custom') {
            url = '.custom.com'
        }*/
        if (url != null && url !== '') {
            let cookies = await new Promise(resolve=>{
                chrome.cookies.getAll({domain: url}, function(cookies) {
                    resolve(cookies)
                })
            })
            if (debug) console.log('Удаляю куки ' + url)
            for (let i = 0; i < cookies.length; i++) {
                if (cookies[i].name === 'csrf_cookie_name' || cookies[i].name === 'cf_chl_prog' || cookies[i].name === 'cf_chl_2' || cookies[i].name === 'cf_clearance') continue
                if (cookies[i].domain.charAt(0) === '.') cookies[i].domain = cookies[i].domain.substring(1, cookies[i].domain.length)
                await removeCookie('https://' + cookies[i].domain + cookies[i].path, cookies[i].name)
            }
        }
        //Применяет первый аккаунт ВКонтакте в случае голосования проекта без MultiVote (по умолчанию первый аккаунт ВКонтакте считается основным
    } else if (settings.useMultiVote && project.useMultiVote === false && (project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'QTop')) {
        //Удаляет все существующие куки ВК
        let cookies = await new Promise(resolve=>{
            chrome.cookies.getAll({domain: '.vk.com'}, function(cookies) {
                resolve(cookies)
            })
        })
        for (let i = 0; i < cookies.length; i++) {
            if (cookies[i].domain.charAt(0) === '.') cookies[i].domain = cookies[i].domain.substring(1, cookies[i].domain.length)
            await removeCookie('https://' + cookies[i].domain + cookies[i].path, cookies[i].name)
        }

        const vkontakte = await db.get('vks', 1)

        console.log(chrome.i18n.getMessage('applyVKCookies', vkontakte.id + ' - ' + vkontakte.name))

        //Применяет куки ВК найденного свободного незаюзанного аккаунта ВК
        for (let i = 0; i < vkontakte.cookies.length; i++) {
            let cookie = vkontakte.cookies[i]
            if (cookie.domain.charAt(0) === '.') cookie.domain = cookie.domain.substring(1, cookie.domain.length)
            await setCookieDetails({
                url: 'https://' + cookie.domain + cookie.path,
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
    }

    let retryCoolDown
    if (((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) || /*project.rating === 'TopCraft' || project.rating === 'McTOP' ||*/ project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'ServerPact' || project.rating === 'MinecraftIpList' || project.rating === 'MCServerList') {
        retryCoolDown = 300000
    } else {
        retryCoolDown = 900000
    }
    project.nextAttempt = Date.now() + retryCoolDown
    queueProjects.add(project)

    //Если эта вкладка была уже открыта, он закрывает её
    for (const[key,value] of openedProjects.entries()) {
        if (project.key === value.key) {
            openedProjects.delete(key)
            if (closeTabs) {
                chrome.tabs.remove(key, function() {
                    if (chrome.runtime.lastError) {
                        console.warn(getProjectPrefix(project, true) + chrome.runtime.lastError.message)
                        if (!settings.disabledNotifError && chrome.runtime.lastError.message !== 'No tab with id.')
                            sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                    }
                })
            }
        }
    }

    console.log(getProjectPrefix(project, true) + chrome.i18n.getMessage('startedAutoVote'))
    if (!settings.disabledNotifStart)
        sendNotification(getProjectPrefix(project, false), chrome.i18n.getMessage('startedAutoVote'))

    if (project.rating === 'MonitoringMinecraft' && (!settings.useMultiVote || project.useMultiVote === false)) {
        let url
        if (project.rating === 'MonitoringMinecraft') {
            url = '.monitoringminecraft.ru'
        }
        let cookies = await new Promise(resolve=>{
            chrome.cookies.getAll({domain: url}, function(cookies) {
                resolve(cookies)
            })
        })
        if (debug) console.log(chrome.i18n.getMessage('deletingCookies', url))
        for (let i = 0; i < cookies.length; i++) {
            if (cookies[i].domain.charAt(0) === '.') cookies[i].domain = cookies[i].domain.substring(1, cookies[i].domain.length)
            await removeCookie('https://' + cookies[i].domain + cookies[i].path, cookies[i].name)
        }
    }

    await newWindow(project)
}

//Открывает вкладку для голосования или начинает выполнять fetch закросы
async function newWindow(project) {
    if (new Date(project.stats.lastAttemptVote).getMonth() < new Date().getMonth() || new Date(project.stats.lastAttemptVote).getFullYear() < new Date().getFullYear()) {
        project.stats.lastMonthSuccessVotes = project.stats.monthSuccessVotes
        project.stats.monthSuccessVotes = 0
    }
    project.stats.lastAttemptVote = Date.now()

    if (new Date(generalStats.lastAttemptVote).getMonth() < new Date().getMonth() || new Date(generalStats.lastAttemptVote).getFullYear() < new Date().getFullYear()) {
        generalStats.lastMonthSuccessVotes = generalStats.monthSuccessVotes
        generalStats.monthSuccessVotes = 0
    }
    generalStats.lastAttemptVote = Date.now()
    await db.put('other', generalStats, 'generalStats')
    await updateValue('projects', project)

    let create = true
    await new Promise(resolve => {
        chrome.alarms.getAll(function(alarms) {
            for (const alarm of alarms) {
                if (alarm.scheduledTime === project.nextAttempt) {
                    create = false
                    resolve()
                    break
                }
            }
            resolve()
        })
    })
    if (create) {
        chrome.alarms.create(String(project.key), {when: project.nextAttempt})
    }
    
    let silentVoteMode = false
    if (project.rating === 'Custom') {
        silentVoteMode = true
    } else if (settings.enabledSilentVote) {
        if (!project.emulateMode && (/*project.rating === 'TopCraft' || project.rating === 'McTOP' ||*/ project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'ServerPact' || project.rating === 'MinecraftIpList' || project.rating === 'MCServerList')) {
            silentVoteMode = true
        }
    } else if (project.silentMode && (/*project.rating === 'TopCraft' || project.rating === 'McTOP' ||*/ project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'ServerPact' || project.rating === 'MinecraftIpList' || project.rating === 'MCServerList')) {
        silentVoteMode = true
    }
    if (debug) console.log('[' + project.rating + '] ' + project.nick + (project.Custom ? '' : ' – ' + project.id) + (project.name != null ? ' – ' + project.name : '') + (silentVoteMode ? ' Начинаю Fetch запрос' : ' Открываю вкладку'))
    if (silentVoteMode) {
        silentVote(project)
    } else {
        let window = await new Promise(resolve=>{
            chrome.windows.getCurrent(function(win) {
                if (chrome.runtime.lastError && chrome.runtime.lastError.message === 'No current window') {} else if (chrome.runtime.lastError) {
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

        const url = allProjects[project.rating]('voteURL', project)
        
        let tab = await new Promise(resolve=>{
            chrome.tabs.create({url, active: false}, function(tab_) {
                resolve(tab_)
            })
        })
        openedProjects.set(tab.id, project)
    }
}

async function silentVote(project) {
    try {
        if (project.rating === 'TopCraft') {
            let response
            if (currentVK != null && currentVK.passwordTopCraft != null) {
                response = await _fetch('https://topcraft.ru/', null, project)
                if (!await checkResponseError(project, response, 'topcraft.ru', null, true)) return
                const csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
                response = await _fetch('https://topcraft.ru/accounts/login/', {
                    'headers': {
                        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    },
                    'body': 'csrfmiddlewaretoken=' + csrftoken + '&login=' + currentVK.id + currentVK.numberId + '&password=' + currentVK.passwordTopCraft,
                    'method': 'POST'
                }, project)
                if (!await checkResponseError(project, response, 'topcraft.ru', null, true)) return
                if (response.doc.querySelector('.errorlist') != null) {
                    if (response.doc.querySelector('.errorlist').textContent.includes('Имя пользователя и/или пароль не верны')) {
                        endVote({message: response.doc.querySelector('.errorlist').textContent + ' passwordTopCraft: ' + currentVK.passwordTopCraft}, null, project)
                        delete currentVK.passwordTopCraft
                        updateValue('vks', currentVK)
                    } else {
                        endVote({message: response.doc.querySelector('.errorlist').textContent}, null, project)
                    }
                    return
                }
            } else {
                response = await _fetch('https://topcraft.ru/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/', null, project)
                if (!await checkResponseError(project, response, 'topcraft.ru', null, true)) return
            }
            let csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
            response = await _fetch('https://topcraft.ru/projects/vote/', {
                'headers': {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                'body': 'csrfmiddlewaretoken=' + csrftoken + '&project_id=' + project.id + '&nick=' + project.nick,
                'method': 'POST'
            }, project)
            if (!await checkResponseError(project, response, 'topcraft.ru', [400], true)) return
            if (response.status === 400) {
                if (response.html === 'vk_error' || response.html === 'nick_error') {
                    endVote({later: response.html}, null, project)
                } else if (response.html.length > 0 && response.html.length < 500) {
                    endVote({message: response.html}, null, project)
                } else {
                    endVote({errorVote: String(response.status)}, null, project)
                }
                return
            }
            endVote({successfully: true}, null, project)
        } else

        if (project.rating === 'McTOP') {
            let response
            if (currentVK != null && currentVK.passwordMcTOP != null) {
                response = await _fetch('https://mctop.su/', null, project)
                if (!await checkResponseError(project, response, 'mctop.su', null, true)) return
                const csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
                response = await _fetch('https://mctop.su/accounts/login/', {
                    'headers': {
                        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    },
                    'body': 'csrfmiddlewaretoken=' + csrftoken + '&login=' + currentVK.id + currentVK.numberId + '&password=' + currentVK.passwordMcTOP,
                    'method': 'POST'
                }, project)
                if (!await checkResponseError(project, response, 'mctop.su', null, true)) return
                if (response.doc.querySelector('.errorlist') != null) {
                    if (response.doc.querySelector('.errorlist').textContent.includes('Имя пользователя и/или пароль не верны')) {
                        endVote({message: response.doc.querySelector('.errorlist').textContent + ' passwordMcTOP: ' + currentVK.passwordMcTOP}, null, project)
                        delete currentVK.passwordMcTOP
                        updateValue('vks', currentVK)
                    } else {
                        endVote({message: response.doc.querySelector('.errorlist').textContent}, null, project)
                    }
                    return
                }
            } else {
                response = await _fetch('https://mctop.su/accounts/vk/login/?process=login&next=/servers/' + project.id + '/?voting=' + project.id + '/', null, project)
                if (!await checkResponseError(project, response, 'mctop.su', null, true)) return
            }
            let csrftoken = response.doc.querySelector('input[name="csrfmiddlewaretoken"]').value
            response = await _fetch('https://mctop.su/projects/vote/', {
                'headers': {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                'body': 'csrfmiddlewaretoken=' + csrftoken + '&project_id=' + project.id + '&nick=' + project.nick,
                'method': 'POST'
            }, project)
            if (!await checkResponseError(project, response, 'mctop.su', [400], true)) return
            if (response.status === 400) {
                if (response.html === 'vk_error' || response.html === 'nick_error') {
                    endVote({later: response.html}, null, project)
                } else if (response.html.length > 0 && response.html.length < 500) {
                    endVote({message: response.html}, null, project)
                } else {
                    endVote({errorVote: String(response.status)}, null, project)
                }
                return
            }
            endVote({successfully: true}, null, project)
        } else

        if (project.rating === 'MCRate') {
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
            } else if (response.doc.querySelector('div[class="error"]') != null) {
                const error = response.doc.querySelector('div[class="error"]').textContent
                if (error.includes('уже голосовали')) {
                    endVote({later: true}, null, project)
//              } else if (error.includes('Ваш ВК ID заблокирован для голосовани') || error.includes('Ваш аккаунт заблокирован')) {
//                  endVote({errorAuthVK: error}, null, project)
                } else {
                    endVote({message: response.doc.querySelector('div[class="error"]').textContent}, null, project)
                }
            } else {
                endVote({errorVoteNoElement: true}, null, project)
            }
        } else

        if (project.rating === 'MinecraftRating') {
            let response = await _fetch('https://oauth.vk.com/authorize?client_id=5216838&display=page&redirect_uri=https://minecraftrating.ru/projects/' + project.id + '/&state=' + project.nick + '&response_type=code&v=5.45', null, project)
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
                } else {
                    endVote({message: response.doc.querySelector('div.alert.alert-danger').textContent}, null, project)
                }
            } else if (response.doc.querySelector('div.alert.alert-success') != null) {
                if (response.doc.querySelector('div.alert.alert-success').textContent.includes('Спасибо за Ваш голос!')) {
                    endVote({successfully: true}, null, project)
                } else {
                    endVote({message: response.doc.querySelector('div.alert.alert-success').textContent}, null, project)
                }
            } else {
                endVote({message: 'Error! div.alert.alert-success или div.alert.alert-danger is null'}, null, project)
            }
        } else

        if (project.rating === 'MonitoringMinecraft') {
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
                if (response.status === 503) {
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

        if (project.rating === 'ServerPact') {
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
            } else if (response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning') != null && (response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning').textContent.includes('You can only vote once') || response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning').textContent.includes('already voted'))) {
                endVote({later: Date.now() + 43200000}, null, project)
            } else if (response.doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > div.alert.alert-warning') != null) {
                endVote({message: response.doc.querySelector('body > div.container.sp-o > div > div.col-md-9 > div.alert.alert-warning').textContent.substring(0, response.doc.querySelector('body > div.container.sp-o > div > div.col-md-9 > div.alert.alert-warning').textContent.indexOf('\n'))}, null, project)
            } else {
                endVote({errorVoteUnknown2: true}, null, project)
            }
        } else

        if (project.rating === 'MinecraftIpList') {
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
                        if (count === 0) {
                            hour = numbers[i]
                        } else if (count === 1) {
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

            let code = 0
            let code2 = 0

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
                        if (count === 0) {
                            hour = numbers[i]
                        } else if (count === 1) {
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
            }
        } else

        if (project.rating === 'MCServerList') {
            let response = await _fetch('https://api.mcserver-list.eu/vote/', {'headers': {'content-type': 'application/x-www-form-urlencoded'}, 'body': 'username=' + project.nick + '&id=' + project.id,'method': 'POST'}, project)
            let json = await response.json()
            if (response.ok) {
                if (json[0].success === "false") {
                    if (json[0].error === 'username_voted') {
                        endVote({later: true}, null, project)
                    } else {
                        endVote({message: json[0].error}, null, project)
                    }
                } else {
                    endVote({successfully: true}, null, project)
                }
            } else {
                endVote({errorVote: String(response.status)}, null, project)
            }
        } else

        if (project.rating === 'Custom') {
            let response = await _fetch(project.responseURL, {...project.body}, project)
            await response.text()
            if (response.ok) {
                endVote({successfully: true}, null, project)
            } else {
                endVote({errorVote: String(response.status)}, null, project)
            }
        }
    } catch (e) {
        if (e.message === 'Failed to fetch' || e.message === 'The user aborted a request.') {
//          endVote({notConnectInternet: true}, null, project)
        } else {
            endVote({message: chrome.i18n.getMessage('errorVoteUnknown') + (e.stack ? e.stack : e)}, null, project)
        }
    }
}

async function checkResponseError(project, response, url, bypassCodes, vk) {
    let host = extractHostname(response.url)
    if (vk && host.includes('vk.com')) {
        if (response.headers.get('Content-Type') && response.headers.get('Content-Type').includes('windows-1251')) {
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
        } else if (response.doc.querySelector('.profile_deleted_text') != null) {
            text = response.doc.querySelector('.profile_deleted_text').textContent.trim()
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
            if (response.status === code) {
                return true
            }
        }
    }
    if (!response.ok) {
        endVote({errorVote: String(response.status)}, null, project)
        return false
    }
    if (response.statusText && response.statusText !== '' && response.statusText !== 'ok' && response.statusText !== 'OK') {
        endVote(response.statusText, null, project)
        return false
    }
    return true
}

//Слушатель на обновление вкладок, если вкладка полностью загрузилась, загружает туда скрипт который сам нажимает кнопку проголосовать
chrome.webNavigation.onCompleted.addListener(async function(details) {
    let project = openedProjects.get(details.tabId)
    if (project == null) return
    if (details.frameId === 0) {
        await new Promise(resolve => {
            chrome.tabs.executeScript(details.tabId, {file: 'scripts/' + project.rating.toLowerCase() +'.js'}, function() {
                if (chrome.runtime.lastError) {
                    console.error(getProjectPrefix(project, true) + chrome.runtime.lastError.message)
                    if (chrome.runtime.lastError.message !== 'The tab was closed.') {
                        if (!settings.disabledNotifError) sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                        project.error = chrome.runtime.lastError.message
                        updateValue('projects', project)
                    }
                }
                resolve()
            })
        })
        await new Promise(resolve => {
            chrome.tabs.executeScript(details.tabId, {file: 'scripts/api.js'}, function() {
                resolve()
            })
        })
        let send = {sendProject: true, project}
        if (currentVK != null) send.vkontakte = currentVK
        chrome.tabs.sendMessage(details.tabId, send)
    } else if (details.frameId !== 0 && (details.url.match(/hcaptcha.com\/captcha\/*/) || details.url.match(/https:\/\/www.google.com\/recaptcha\/api.\/anchor*/) || details.url.match(/https:\/\/www.google.com\/recaptcha\/api.\/bframe*/) || details.url.match(/https:\/\/www.recaptcha.net\/recaptcha\/api.\/anchor*/) || details.url.match(/https:\/\/www.recaptcha.net\/recaptcha\/api.\/bframe*/) || details.url.match(/https:\/\/www.google.com\/recaptcha\/api\/fallback*/) || details.url.match(/https:\/\/www.recaptcha.net\/recaptcha\/api\/fallback*/))) {
        chrome.tabs.executeScript(details.tabId, {file: 'scripts/captchaclicker.js', frameId: details.frameId}, function() {
            if (chrome.runtime.lastError) {
                console.error(getProjectPrefix(project, true) + chrome.runtime.lastError.message)
                if (chrome.runtime.lastError.message !== 'The frame was removed.') {
                    if (!settings.disabledNotifError) sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                    project.error = chrome.runtime.lastError.message
                    updateValue('projects', project)
                }
            }
        })
    }
})

chrome.webRequest.onCompleted.addListener(function(details) {
    let project = openedProjects.get(details.tabId)
    if (project == null) return
    if (details.type === 'main_frame' && (details.statusCode < 200 || details.statusCode > 299) && details.statusCode !== 503 && details.statusCode !== 403/*Игнорируем проверку CloudFlare*/) {
        const sender = {tab: {id: details.tabId}}
        endVote({errorVote: String(details.statusCode)}, sender, project)
    }
}, {urls: ['<all_urls>']})

chrome.webRequest.onErrorOccurred.addListener(function(details) {
    if (details.initiator === 'chrome-extension://' + chrome.runtime.id) {
        if (fetchProjects.has(details.requestId)) {
            let project = fetchProjects.get(details.requestId)
//          if (details.error.includes('net::ERR_ABORTED') || details.error.includes('net::ERR_CONNECTION_RESET') || details.error.includes('net::ERR_CONNECTION_CLOSED') || details.error.includes('net::ERR_NETWORK_CHANGED')) {
//              console.warn(getProjectPrefix(project, true) + details.error)
//              return
//          }
            endVote({errorVoteNetwork: [details.error, details.url]}, null, project)
        }
    } else if (openedProjects.has(details.tabId)) {
        if (details.type === 'main_frame' || details.url.match(/hcaptcha.com\/captcha\/*/) || details.url.match(/https:\/\/www.google.com\/recaptcha\/*/) || details.url.match(/https:\/\/www.recaptcha.net\/recaptcha\/*/)) {
            let project = openedProjects.get(details.tabId)
            if (details.error.includes('net::ERR_ABORTED') || details.error.includes('net::ERR_CONNECTION_RESET') || details.error.includes('net::ERR_CONNECTION_CLOSED') || details.error.includes('net::ERR_NETWORK_CHANGED') || details.error.includes('net::ERR_CACHE_MISS') || details.error.includes('net::ERR_BLOCKED_BY_CLIENT')) {
                // console.warn(getProjectPrefix(project, true) + details.error)
                return
            }
            const sender = {tab: {id: details.tabId}}
            endVote({errorVoteNetwork: [details.error, details.url]}, sender, project)
        }
    }
}, {urls: ['<all_urls>']})

async function _fetch(url, options, project) {
    let listener
    const removeListener = ()=>{
        if (listener) {
            chrome.webRequest.onBeforeRequest.removeListener(listener)
            listener = null
        }
    }

    listener = (details)=>{
        //Да это костыль, а есть другой адекватный вариант достать requestId или хотя бы код ошибки net::ERR из fetch запроса?
        if (details.initiator === 'chrome-extension://' + chrome.runtime.id && details.url.includes(url)) {
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
        return await fetch(url, options)
    } catch(e) {
        throw e
    } finally {
        removeListener()
    }
}

//Слушатель сообщений и ошибок
chrome.runtime.onMessage.addListener(async function(request, sender/*, sendResponse*/) {
    //Если требует ручное прохождение капчи
    if ((request.captcha || request.authSteam || request.discordLogIn) && sender && openedProjects.has(sender.tab.id)) {
        let project = openedProjects.get(sender.tab.id)
        let message = request.captcha ? chrome.i18n.getMessage('requiresCaptcha') : chrome.i18n.getMessage(Object.keys(request)[0])
        console.warn(getProjectPrefix(project, true) + message)
        if (!settings.disabledNotifWarn) sendNotification(getProjectPrefix(project, false), message)
        project.error = message
        delete project.nextAttempt
        openedProjects.delete(sender.tab.id)
        openedProjects.set(sender.tab.id, project)
        await updateValue('projects', project)
    } else if (request.changeProject) {
        openedProjects.delete(sender.tab.id)
        openedProjects.set(sender.tab.id, request.project)
        await updateValue('projects', request.project)
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
                    if (!settings.disabledNotifError && chrome.runtime.lastError.message !== 'No tab with id.')
                        sendNotification(getProjectPrefix(project, false), chrome.runtime.lastError.message)
                }
            })
        }
        openedProjects.delete(sender.tab.id)
    } else if (!project) return

    for (const[key,value] of fetchProjects.entries()) {
        if (value.key === project.key) {
            fetchProjects.delete(key)
        }
    }

    delete project.nextAttempt

    //Если усё успешно
    let sendMessage
    if (request.successfully || request.later) {
        if (((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) && settings.repeatAttemptLater) {
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
        if (project.rating !== 'Custom' && (project.timeout != null || project.timeoutHour != null) && !(project.lastDayMonth && new Date(time.getFullYear(),time.getMonth() + 1,0).getDate() !== new Date().getDate())) {
            if (project.timeoutHour != null) {
                if (project.timeoutMinute == null) project.timeoutMinute = 0
                if (project.timeoutSecond == null) project.timeoutSecond = 0
                if (project.timeoutMS == null) project.timeoutMS = 0
                if (time.getHours() > project.timeoutHour || (time.getHours() === project.timeoutHour && time.getMinutes() >= project.timeoutMinute)) {
                    time.setDate(time.getDate() + 1)
                }
                time.setHours(project.timeoutHour, project.timeoutMinute, project.timeoutSecond, project.timeoutMS)
            } else {
                time.setUTCMilliseconds(time.getUTCMilliseconds() + project.timeout)
            }
        } else if (request.later && Number.isInteger(request.later)) {
            time = new Date(request.later)
            if (project.rating === 'ServeurPrive' || project.rating === 'TopGames') {
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
            if (project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'IonMc' || project.rating === 'QTop') {
                //Топы на которых время сбрасывается в 00:00 по МСК
                hour = 21
            } else if (project.rating === 'MCRate') {
                hour = 22
            } else if (project.rating === 'MinecraftServerList' || project.rating === 'ServerList101') {
                hour = 23
            } else if (project.rating === 'PlanetMinecraft' || project.rating === 'ListForge' || project.rating === 'MinecraftList') {
                hour = 5
            } else if (project.rating === 'MinecraftServersOrg' || project.rating === 'MinecraftIndex' || project.rating === 'MinecraftBuzz' || project.rating === 'PixelmonServers') {
                hour = 0
            } else if (project.rating === 'TopMinecraftServers') {
                hour = 4
            } else if (project.rating === 'MMoTopRU') {
                hour = 20
            }
            if (hour != null) {
                if (time.getUTCHours() >= hour/* || (time.getUTCHours() === hour && time.getUTCMinutes() >= (project.priority ? 0 : 10))*/) {
                    time.setUTCDate(time.getUTCDate() + 1)
                }
                time.setUTCHours(hour, (project.priority ? 0 : 10), 0, 0)
            //Рейтинги с таймаутом сбрасывающемся через определённый промежуток времени с момента последнего голосования
            } else if (project.rating === 'TopG' || project.rating === 'MinecraftServersBiz' || project.rating === 'TopGG' || project.rating === 'DiscordBotList' || project.rating === 'MCListsOrg' || (project.rating === 'Discords' && project.game === 'bots/bot')) {
                time.setUTCHours(time.getUTCHours() + 12)
            } else if (project.rating === 'MinecraftIpList' || project.rating === 'HotMC' || project.rating === 'MinecraftServerNet' || project.rating === 'TMonitoring' || project.rating === 'MCServers' || project.rating === 'CraftList' || project.rating === 'CzechCraft' || project.rating === 'TopMCServersCom' || project.rating === 'CraftListNet') {
                time.setUTCDate(time.getUTCDate() + 1)
            } else if (project.rating === 'ServeurPrive' || project.rating === 'TopGames') {
                project.countVote = project.countVote + 1
                if (project.countVote >= project.maxCountVote) {
                    time.setDate(time.getDate() + 1)
                    time.setHours(0, (project.priority ? 0 : 10), 0, 0)
                    project.countVote = 0
                } else {
                    if (project.rating === 'ServeurProve') {
                        time.setUTCHours(time.getUTCHours() + 1, time.getUTCMinutes() + 30)
                    } else {
                        time.setUTCHours(time.getUTCHours() + 2)
                    }
                }
            } else if (project.rating === 'ServerPact') {
                time.setUTCHours(time.getUTCHours() + 11)
                time.setUTCMinutes(time.getUTCMinutes() + 7)
            } else if (project.rating === 'Custom') {
                if (project.timeoutHour != null) {
                    if (project.timeoutMinute == null) project.timeoutMinute = 0
                    if (project.timeoutSecond == null) project.timeoutSecond = 0
                    if (project.timeoutMS == null) project.timeoutMS = 0
                    if (time.getHours() > project.timeoutHour || (time.getHours() === project.timeoutHour && time.getMinutes() >= project.timeoutMinute)) {
                        time.setDate(time.getDate() + 1)
                    }
                    time.setHours(project.timeoutHour, project.timeoutMinute, project.timeoutSecond, project.timeoutMS)
                } else {
                    time.setUTCMilliseconds(time.getUTCMilliseconds() + project.timeout)
                }
            } else if (project.rating === 'MCServerList') {
                time.setUTCHours(time.getUTCHours() + 2)
            } else if (project.rating === 'CraftList') {
                time = new Date(request.successfully)
            } else if (project.rating === 'Discords' && project.game === 'servers') {
                time.setUTCHours(time.getUTCHours() + 6)
            } else {
                time.setUTCDate(time.getUTCDate() + 1)
            }
        }

        time = time.getTime()
        project.time = time

        if (project.randomize) {
            if (project.randomize.min == null) {
                project.randomize.min = 0
                project.randomize.max = 43200000
            }
            project.time = project.time + Math.floor(Math.random() * (project.randomize.max - project.randomize.min) + project.randomize.min)
        } else if ((project.rating === 'TopCraft' || project.rating === 'McTOP') && !project.priority) {
            //Рандомизация по умолчанию (в пределах 5-ти минут) для бедного TopCraft/McTOP который легко ддосится от массового автоматического голосования
            project.time = project.time + Math.floor(Math.random() * (300000 - -300000) + -300000)
        }

        if ((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote)  {
            if (currentVK != null && (project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'QTop')/* && VKs.findIndex(function(element) { return element.id == currentVK.id && element.name == currentVK.name}) !== -1*/) {
                if (request.later && settings.repeatAttemptLater && project.later != null) {
                    if (project.rating === 'TopCraft' || project.rating === 'McTOP') {
                        if (request.later === 'nick_error') {
                            //None
                        } else if (request.later === 'vk_error') {
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
                    const index = getTopFromList(currentVK, project).findIndex(function(el) {return el.id === usedProject.id})
                    if (index > -1) {
                        getTopFromList(currentVK, project).splice(index, 1)
                    }
                    getTopFromList(currentVK, project).push(usedProject)
                    await updateValue('vks', currentVK)
                }
            }

            if (currentProxy != null && (settings.useProxyOnUnProxyTop || (project.rating !== 'TopCraft' && project.rating !== 'McTOP' && project.rating !== 'MinecraftRating')) /*&& proxies.findIndex(function(element) { return element.ip === currentProxy.ip && element.port === currentProxy.port}) !== -1*/) {
                let usedProject = {
                    id: project.id,
                    nextFreeVote: time
                }
                const index = getTopFromList(currentProxy, project).findIndex(function(el) {return el.id === usedProject.id})
                if (index > -1) {
                    getTopFromList(currentProxy, project).splice(index, 1)
                }
                getTopFromList(currentProxy, project).push(usedProject)
                await updateValue('proxies', currentProxy)
            } else if (settings.useProxyOnUnProxyTop || (project.rating !== 'TopCraft' && project.rating !== 'McTOP' && project.rating !== 'MinecraftRating')) {
                console.warn('currentProxy is null or not found')
            }
        }

        delete project.error

        if (request.successfully) {
            sendMessage = chrome.i18n.getMessage('successAutoVote')
            if (!settings.disabledNotifInfo) sendNotification(getProjectPrefix(project, false), sendMessage)

            project.stats.successVotes++
            project.stats.monthSuccessVotes++
            project.stats.lastSuccessVote = Date.now()

            generalStats.successVotes++
            generalStats.monthSuccessVotes++
            generalStats.lastSuccessVote = Date.now()
            delete project.later
        } else {
            if (((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) && settings.repeatAttemptLater && project.later && !(project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MinecraftRating')) {//Пока что для безпроксиевых рейтингов игнорируется отключение игнорирование ошибки "Вы уже голосовали" не смотря на настройку useProxyOnUnProxyTop, в случае если на этих рейтингах будет проверка на айпи, сюда нужна будет проверка useProxyOnUnProxyTop
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

            project.stats.laterVotes++

            generalStats.laterVotes++
        }
        console.log(getProjectPrefix(project, true) + sendMessage + ', ' + chrome.i18n.getMessage('timeStamp') + ' ' + project.time)
        //Если ошибка
    } else {
        let message
        if (!request.message) {
            if (Object.values(request)[0] === true) {
                message = chrome.i18n.getMessage(Object.keys(request)[0])
            } else {
                message = chrome.i18n.getMessage(Object.keys(request)[0], Object.values(request)[0])
            }
        } else {
            message = request.message
        }
        if (message.length === 0) message = chrome.i18n.getMessage('emptyError')
        let retryCoolDown
        if (currentVK != null && ((project.rating === 'TopCraft' && currentVK.passwordTopCraft) || (project.rating === 'McTOP' && currentVK.passwordMcTOP))) {
            if (request && request.message && (request.message.includes('Имя пользователя и/или пароль не верны') || request.message.includes('бедитесь, что это значение содержит не более'))) {
                delete currentVK['password' + project.rating]
                await updateValue('vks', currentVK)
            }
        }
        if ((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) {
            sendMessage = message
            if ((project.rating === 'TopCraft' || project.rating === 'McTOP' || project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'QTop') && request.errorAuthVK && currentVK != null) {
                currentVK.notWorking = request.errorAuthVK
                await updateValue('vks', currentVK)
            } else if (project.rating === 'MCRate' && message.includes('Ваш аккаунт заблокирован для голосования за этот проект')) {
                let usedProject = {
                    id: project.id,
                    nextFreeVote: 999999999999999,
                    error: message
                }
                const index = getTopFromList(currentVK, project).findIndex(function(el) {return el.id === usedProject.id})
                if (index > -1) {
                    getTopFromList(currentVK, project).splice(index, 1)
                }
                getTopFromList(currentVK, project).push(usedProject)
                await updateValue('vks', currentVK)
            } else if (project.rating === 'MCRate' && message.includes('Ваш ВК ID заблокирован для голосовани')) {
                currentVK.MCRate = message
                await updateValue('vks', currentVK)
            } else if (currentProxy != null && request) {
                if (request.errorVoteNetwork && (request.errorVoteNetwork[0].includes('PROXY') || request.errorVoteNetwork[0].includes('TUNNEL') || request.errorVoteNetwork[0].includes('TIMED_OUT'))) {
                    currentProxy.notWorking = request.errorVoteNetwork[0]
                    await updateValue('proxies', currentProxy)
                    await stopVote()
                } else if (request.errorCaptcha) {
                    currentProxy.notWorking = request.errorCaptcha
                    await updateValue('proxies', currentProxy)
                    await stopVote()
                }
            }
        } else if (/*project.rating === 'TopCraft' || project.rating === 'McTOP' ||*/ project.rating === 'MCRate' || project.rating === 'MinecraftRating' || project.rating === 'MonitoringMinecraft' || project.rating === 'ServerPact' || project.rating === 'MinecraftIpList') {
            retryCoolDown = 300000
            sendMessage = message + '. ' + chrome.i18n.getMessage('errorNextVote', '5')
        } else {
            retryCoolDown = 900000
            sendMessage = message + '. ' + chrome.i18n.getMessage('errorNextVote', '15')
        }
        if (project.randomize) {
            retryCoolDown = retryCoolDown + Math.floor(Math.random() * 900000)
        }
        if (!settings.useMultiVote && !project.useMultiVote) {
            project.time = Date.now() + retryCoolDown
        } else {
            project.time = Date.now() + 150000
        }
        project.error = message
        console.error(getProjectPrefix(project, true) + sendMessage + ', ' + chrome.i18n.getMessage('timeStamp') + ' ' + project.time)
        if (!settings.disabledNotifError && !(request.errorVote && request.errorVote.charAt(0) === '5')) sendNotification(getProjectPrefix(project, false), sendMessage)

        project.stats.errorVotes++

        generalStats.errorVotes++
    }
    
    await db.put('other', generalStats, 'generalStats')
    await updateValue('projects', project)

    await new Promise(resolve => chrome.alarms.clear(String(project.key), resolve))
    if (project.time != null && project.time > Date.now()) {
        let create2 = true
        await new Promise(resolve => {
            chrome.alarms.getAll(function(alarms) {
                for (const alarm of alarms) {
                    if (alarm.scheduledTime === project.time) {
                        create2 = false
                        resolve()
                        break
                    }
                }
                resolve()
            })
        })
        if (create2) {
            chrome.alarms.create(String(project.key), {when: project.time})
        }
    }

    function removeQueue() {
        for (const value of queueProjects) {
            if (project.key === value.key) {
                queueProjects.delete(value)
            }
        }
        if ((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) {
            if (currentVK != null || currentProxy != null) {
                if (queueProjects.size === 0) {
                    if (currentProxy != null) clearProxy()
                    currentVK = null
                } else {
                    let countVK = 0
                    let countProxy = 0
                    for (const value of queueProjects) {
                        if (countVK > 0 && countProxy > 0) break
                        if (value.useMultiVote !== false) {
                            if (value.rating === 'TopCraft' || value.rating === 'McTOP' || value.rating === 'MCRate' || value.rating === 'MinecraftRating' || value.rating === 'MonitoringMinecraft' || value.rating === 'QTop') {
                                countVK++
                            }
                            if (settings.useProxyOnUnProxyTop) {
                                countProxy++
                            } else if (value.rating !== 'TopCraft' || value.rating !== 'McTOP' || value.rating !== 'MinecraftRating') {
                                countProxy++
                            }
                        }
                    }
                    if (countVK === 0) currentVK = null
                    if (countProxy === 0) clearProxy()
                }
            }
        }
        if (settings.useMultiVote && project.useMultiVote === false) {
            if (currentVK != null) {
                if (queueProjects.size === 0) {
                    currentVK = null
                } else {
                    let countVK = 0
                    for (const value of queueProjects) {
                        if (countVK > 0) break
                        if (value.rating === 'TopCraft' || value.rating === 'McTOP' || value.rating === 'MCRate' || value.rating === 'MinecraftRating' || value.rating === 'MonitoringMinecraft' || value.rating === 'QTop') {
                            countVK++
                        }
                    }
                    if (countVK === 0) currentVK = null
                }
            }
        }
        checkVote()
    }
    if (((settings.useMultiVote && project.useMultiVote !== false) || project.useMultiVote) /*&& (settings.useProxyOnUnProxyTop || (project.rating !== 'TopCraft' && project.rating !== 'McTOP' && project.rating !== 'MinecraftRating'))*/) {
        removeQueue()
    } else {
        setTimeout(()=>{
            removeQueue()
        }, 10000)
    }
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

function getProjectPrefix(project, detailed) {
    if (detailed) {
        return '[' + project.rating + '] ' + (project.nick != null && project.nick !== '' ? project.nick + ' – ' : '') + (project.game != null ? project.game + ' – ' : '') + project.id + (project.name != null ? ' – ' + project.name : '') + ' '
    } else {
        return '[' + project.rating + '] ' + (project.nick != null && project.nick !== '' ? project.nick + ' ' : '') + (project.name != null ? '– ' + project.name : '– ' + project.id)
    }
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
    }
}

// noinspection JSUnusedGlobalSymbols
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

// noinspection JSUnusedGlobalSymbols
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

async function clearProxy() {
    if (debug) console.log('Удаляю прокси')
    currentProxy = null
    await new Promise(resolve => chrome.proxy.settings.set({value: {mode: 'system'}, scope: 'regular'}, resolve))
    await new Promise(resolve => chrome.proxy.settings.clear({scope: 'regular'},resolve))
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

async function updateValue(objStore, value) {
    const found = await db.count(objStore, value.key)
    if (found) {
        await db.put(objStore, value, value.key)
        chrome.runtime.sendMessage({updateValue: objStore, value})
    } else {
        console.warn('The ' + objStore + ' could not be found, it may have been deleted', JSON.stringify(value))
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

async function stopVote() {
    if (debug) console.log('Отмена всех голосований и очистка всего')
    await clearProxy()
    currentVK = null
    queueProjects.clear()
    for (let[key/*,value*/] of openedProjects.entries()) {
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
    // break1 = true
    // break2 = true
    checkVote()
}

//Если требуется авторизация для Прокси
let errorProxy = {ip: '', count: 0}
chrome.webRequest.onAuthRequired.addListener(async function(details, callbackFn) {
    if (details.isProxy && currentProxy) {
        if (errorProxy.ip !== currentProxy.ip) {
            errorProxy.count = 0
        }
        errorProxy.ip = currentProxy.ip
        if (errorProxy.count++ > 5) {
            currentProxy.notWorking = chrome.i18n.getMessage('errorAuthProxy1') + ' ' + chrome.i18n.getMessage('errorAuthProxy2')
            console.error(chrome.i18n.getMessage('errorAuthProxy1') + ' ' + chrome.i18n.getMessage('errorAuthProxy2'))
            if (!settings.disabledNotifError) {
                sendNotification(chrome.i18n.getMessage('errorAuthProxy1'), chrome.i18n.getMessage('errorAuthProxy2'))
            }
            await updateValue('proxies', currentProxy)
            await stopVote()
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
                await db.put('other', settings, 'settings')
                await stopVote()
                chrome.runtime.sendMessage({stopVote: chrome.i18n.getMessage('errorAuthProxyTB')})
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
            await updateValue('proxies', currentProxy)
            await stopVote()
        }
    }
    callbackFn()
}, {urls: ['<all_urls>']}, ['asyncBlocking'])

chrome.runtime.onInstalled.addListener(async function(details) {
    if (details.reason === 'install') {
        chrome.tabs.create({url: 'options.html?installed'})
    } else if (details.reason === 'update' && details.previousVersion && (new Version(details.previousVersion)).compareTo(new Version('6.0.0')) === -1) {
        let storageArea = 'local'
        //Асинхронно достаёт/сохраняет настройки в chrome.storage
        async function getValue(name, area) {
            if (!area) {
                area = storageArea
            }
            return new Promise((resolve, reject)=>{
                chrome.storage[area].get(name, function(data) {
                    if (chrome.runtime.lastError) {
                        sendNotification(chrome.i18n.getMessage('storageError'), chrome.runtime.lastError)
                        console.error(chrome.i18n.getMessage('storageError', chrome.runtime.lastError))
                        reject(chrome.runtime.lastError)
                    } else {
                        resolve(data[name])
                    }
                })
            })
        }
        async function removeValue(name, area) {
            if (!area) {
                area = storageArea
            }
            return new Promise((resolve, reject)=>{
                chrome.storage[area].remove(name, function(data) {
                    if (chrome.runtime.lastError) {
                        sendNotification(chrome.i18n.getMessage('storageErrorSave'), chrome.runtime.lastError)
                        console.error(chrome.i18n.getMessage('storageErrorSave', chrome.runtime.lastError))
                        reject(chrome.runtime.lastError.message)
                    } else {
                        resolve(data)
                    }
                })
            })
        }
        storageArea = await getValue('storageArea', 'local')
        if (storageArea == null || storageArea === '') {
            if (await getValue('AVMRsettings', 'sync') != null) {
                storageArea = 'sync'
            } else {
                storageArea = 'local'
            }
        }
        const oldSettings = await getValue('AVMRsettings')
        if (oldSettings != null) {
            const oldGeneralStats = await getValue('generalStats')

            console.log(chrome.i18n.getMessage('oldSettings'))
            const projects = []
            let key = 0
            for (const item of Object.keys(allProjects)) {
                const list = await getValue('AVMRprojects' + item)
                if (list) {
                    for (const project of list) {
                        delete project[item]
                        project.rating = item
                        if (item === 'Custom') {
                            project.body = project.id
                            delete project.id
                            project.id = project.nick
                            project.nick = ''
                        }
                        if (project.nick == null) project.nick = ''
                        if (project.stats.successVotes == null) project.stats.successVotes = 0
                        if (project.stats.monthSuccessVotes == null) project.stats.monthSuccessVotes = 0
                        if (project.stats.lastMonthSuccessVotes == null) project.stats.lastMonthSuccessVotes = 0
                        if (project.stats.errorVotes == null) project.stats.errorVotes = 0
                        if (project.stats.laterVotes == null) project.stats.laterVotes = 0
                        key++
                        project.key = key
                        projects.push(project)
                    }
                }
            }
            let vks = await getValue('AVMRVKs')
            if (!vks) vks = []
            let proxies = await getValue('AVMRproxies')
            if (!proxies) proxies = []
            let borealis = await getValue('borealisAccounts')
            if (!borealis) borealis = []
            if (!db) {
                await new Promise(resolve => {//Да это странно выглядит
                    setInterval(() => {
                        if (db) {
                            resolve()
                        }
                    }, 1000)
                })
            }
            const tx = db.transaction(['projects', 'vks', 'proxies', 'borealis', 'other'], 'readwrite')
            await tx.objectStore('projects').clear()
            for (const project of projects) {
                await tx.objectStore('projects').add(project, project.key)
            }
            key = 0
            for (const vk of vks) {
                key++
                vk.key = key
                await tx.objectStore('vks').put(vk, vk.key)
            }
            key = 0
            for (const proxy of proxies) {
                key++
                proxy.key = key
                await tx.objectStore('proxies').put(proxy, proxy.key)
            }
            key = 0
            for (const acc of borealis) {
                key++
                acc.key = key
                await tx.objectStore('borealis').put(acc, acc.key)
            }
            if (oldSettings.useMultiVote == null) {
                oldSettings.proxyBlackList = ["*vk.com", "*topcraft.ru", "*mctop.su", "*minecraftrating.ru", "*captcha.website", "*hcaptcha.com", "*google.com", "*gstatic.com", "*cloudflare.com", "<local>"]
                oldSettings.stopVote = 0
                oldSettings.autoAuthVK = false
                oldSettings.clearVKCookies = true
                oldSettings.clearBorealisCookies = true
                oldSettings.repeatAttemptLater = true
                oldSettings.saveVKCredentials = false
                oldSettings.saveBorealisCredentials = false
                oldSettings.useMultiVote = true
                oldSettings.useProxyOnUnProxyTop = false
            }
            settings = oldSettings
            await tx.objectStore('other').put(oldSettings, 'settings')
            await tx.objectStore('other').put(oldGeneralStats, 'generalStats')
            for (const item of Object.keys(allProjects)) {
                await removeValue('AVMRprojects' + item)
            }
            await removeValue('AVMRVKs')
            await removeValue('AVMRproxies')
            await removeValue('borealisAccounts')
            await removeValue('AVMRsettings')
            await removeValue('generalStats')
            await removeValue('storageArea', 'local')
            await reloadAllAlarms()
            console.log(chrome.i18n.getMessage('importingEnd'))
            const botsForDiscord = await getValue('AVMRprojectsBotsForDiscord')
            if (botsForDiscord) {
                if (botsForDiscord.length > 0) {
                    let bots = ''
                    for (const bfd of botsForDiscord) {
                        bots += bfd.name ? bfd.name : bfd.id
                        bots += ' '
                    }
                    let text = 'There was a rebranding on Discords on BotsForDiscord and it was found that you are auto voting on BotsForDiscord, you will have to configure the extension for Discords again in order to auto vote. The bots that you used on BotsForDiscord: ' + bots
                    sendNotification('BotsForDiscord rebranding', text)
                    console.log(text)
                }
                await removeValue('AVMRprojectsBotsForDiscord')
            }
        }
    }
    if (details.previousVersion && (new Version(details.previousVersion)).compareTo(new Version(chrome.runtime.getManifest().version)) === -1) {
        chrome.tabs.create({url: 'options.html?updated'})
    }
})

function getTopFromList(list, project) {
    if (typeof list[project.rating] === 'string') {
        return [{id: project.id, nextFreeVote: Number.POSITIVE_INFINITY}]
    }
    if (!list[project.rating]) list[project.rating] = []
    return list[project.rating]
}

function Version(s){
  this.arr = s.split('.').map(Number)
}
Version.prototype.compareTo = function(v){
    for (let i=0; ;i++) {
        if (i>=v.arr.length) return i>=this.arr.length ? 0 : 1
        if (i>=this.arr.length) return -1
        const diff = this.arr[i]-v.arr[i]
        if (diff) return diff>0 ? 1 : -1
    }
}


/* Store the original log functions. */
console._log = console.log
console._info = console.info
console._warn = console.warn
console._error = console.error
console._debug = console.debug

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

console._collect = function (type, args) {
    const time = new Date().toLocaleString().replace(',', '')

    if (!type) type = 'log'

    if (!args || args.length === 0) return

    console['_' + type].apply(console, args)

    let log = '[' + time + ' ' + type.toUpperCase() + ']:'

    for (let arg of args) {
        if (typeof arg != 'string') arg = JSON.stringify(arg)
        log += ' ' + arg
    }

    if (dbLogs) dbLogs.add('logs', log)
}

/*
Открытый репозиторий:
https://gitlab.com/Serega007/auto-vote-minecraft-rating
*/