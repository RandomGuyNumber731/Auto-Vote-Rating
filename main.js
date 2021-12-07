//Настройки
// noinspection ES6ConvertVarToLetConst
var settings
//Общая статистика
// noinspection ES6ConvertVarToLetConst
var generalStats
//Статистика за сегодня
// noinspection ES6ConvertVarToLetConst
var todayStats
//Оновная база данных
let db
//База данных логов
let dbLogs

//Инициализация настроек расширения
async function initializeConfig(background, version) {
    if (!dbLogs) {
        dbLogs = await idb.openDB('logs', 1, {
            upgrade(db/*, oldVersion, newVersion, transaction*/) {
                db.createObjectStore('logs', {autoIncrement: true})
            }
        })
        window.onerror = (errorMsg, url, lineNumber) => {
            const time = new Date().toLocaleString().replace(',', '')
            const log = '[' + time + ' ERROR]: ' + errorMsg + ' at ' + url + ':' + lineNumber
            dbLogs.add('logs', log)
        }
        window.onunhandledrejection = event => {
            const time = new Date().toLocaleString().replace(',', '')
            const log = '[' + time + ' ERROR]: ' + event.reason.stack
            dbLogs.add('logs', log)
        }
    }
    // noinspection JSUnusedGlobalSymbols
    db = await idb.openDB('avr', 40, {upgrade})
    db.onerror = (event) => dbError(event, false)
    dbLogs.onerror = (event) => dbError(event, true)
    function dbError(event, logs) {
        if (background) {
            if (!settings || !settings.disabledNotifError) sendNotification(chrome.i18n.getMessage('errordbTitle', event.target.source.name), event.target.error)
            if (logs) {
                console._error(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error]))
            } else {
                console.error(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error]))
            }
        } else {
            createNotif(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error]), 'error')
        }
    }
    settings = await db.get('other', 'settings')
    generalStats = await db.get('other', 'generalStats')
    todayStats = await db.get('other', 'todayStats')

    if (!background) return
    console.log(chrome.i18n.getMessage('start'))

    // if (settings && !settings.disabledCheckTime) checkTime()

    checkVote()
}

async function upgrade(db, oldVersion, newVersion, transaction) {
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
        settings = {
            disabledNotifStart: true,
            disabledNotifInfo: false,
            disabledNotifWarn: false,
            disabledNotifError: false,
            enabledSilentVote: true,
            disabledCheckTime: false,
            disabledCheckInternet: false,
            enableCustom: false,
            timeout: 1000,
            proxyBlackList: ["*vk.com", "*minecraftrating.ru", "*captcha.website", "*hcaptcha.com", "*cloudflare.com", "<local>"],
            stopVote: 0,
            autoAuthVK: false,
            clearVKCookies: true,
            addBannedVK: false,
            clearBorealisCookies: true,
            repeatAttemptLater: true,
            repeatLater: 5,
            saveVKCredentials: false,
            saveBorealisCredentials: false,
            useMultiVote: true,
            useProxyOnUnProxyTop: false,
            useProxyPacScript: false,
            proxyPacScript:
`function FindProxyForURL(url, host) {
    return "HTTPS $ip$:$port$";
}`
        }
        await other.add(settings, 'settings')
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
        todayStats = {
            successVotes: 0,
            errorVotes: 0,
            laterVotes: 0,
            lastSuccessVote: null,
            lastAttemptVote: null
        }
        await other.add(generalStats, 'generalStats')
        await other.add(todayStats, 'todayStats')
    } else if (oldVersion === 1 || oldVersion === 3) {
        const other = transaction.objectStore('other')
        settings = await other.get('settings')
        if (oldVersion === 1) settings.timeout = 1000
        settings.proxyBlackList = ["*vk.com", "*minecraftrating.ru", "*captcha.website", "*hcaptcha.com", "*cloudflare.com", "<local>"]
        settings.stopVote = 0
        settings.autoAuthVK = false
        settings.clearVKCookies = true
        settings.addBannedVK = false
        settings.clearBorealisCookies = true
        settings.repeatAttemptLater = true
        settings.repeatLater = 5
        settings.saveVKCredentials = false
        settings.saveBorealisCredentials = false
        settings.useMultiVote = true
        settings.useProxyOnUnProxyTop = false
        settings.useProxyPacScript = false
        settings.proxyPacScript =
`function FindProxyForURL(url, host) {
    return "$scheme$ $ip$:$port$";
}`
        await other.put(settings, 'settings')

        todayStats = {
            successVotes: 0,
            errorVotes: 0,
            laterVotes: 0,
            lastSuccessVote: null,
            lastAttemptVote: null
        }
        await other.put(todayStats, 'todayStats')

        const vks = db.createObjectStore('vks', {autoIncrement: true})
        vks.createIndex('id', 'id')
        const proxies = db.createObjectStore('proxies', {autoIncrement: true})
        proxies.createIndex('ip, port', ['ip', 'port'])
        const borealis = db.createObjectStore('borealis', {autoIncrement: true})
        borealis.createIndex('nick', 'nick')

        if (typeof createNotif !== 'undefined') {
            createNotif(chrome.i18n.getMessage('oldSettings', [oldVersion, newVersion]))
        } else {
            console.log(chrome.i18n.getMessage('oldSettings', [oldVersion, newVersion]))
        }
    }
    if (oldVersion === 2) {
        const other = transaction.objectStore('other')
        settings = await other.get('settings')
        settings.timeout = 1000
        settings.useProxyPacScript = false
        settings.proxyPacScript =
`function FindProxyForURL(url, host) {
    return "$scheme$ $ip$:$port$";
}`
        settings.repeatLater = 5
        await other.put(settings, 'settings')

        todayStats = {
            successVotes: 0,
            errorVotes: 0,
            laterVotes: 0,
            lastSuccessVote: null,
            lastAttemptVote: null
        }
        await other.put(todayStats, 'todayStats')

        if (typeof createNotif !== 'undefined') {
            createNotif(chrome.i18n.getMessage('oldSettings', [oldVersion, newVersion]))
        } else {
            console.log(chrome.i18n.getMessage('oldSettings', [oldVersion, newVersion]))
        }
    }
    if (oldVersion === 3 || oldVersion === 30) {
        let cursor = await db.transaction('projects', 'readwrite').store.index('rating').openCursor('DiscordBotList')
        while (cursor) {
            const project = cursor.value
            project.game = 'bots'
            await cursor.update(project)
            cursor = await cursor.continue()
        }
        cursor = await db.transaction('projects', 'readwrite').store.index('rating').openCursor('MinecraftRating')
        while (cursor) {
            const project = cursor.value
            project.game = 'projects'
            await cursor.update(project)
            cursor = await cursor.continue()
        }
    }
}