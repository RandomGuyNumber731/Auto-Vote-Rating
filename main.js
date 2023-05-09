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
// noinspection ES6ConvertVarToLetConst
var db
//База данных логов
// noinspection ES6ConvertVarToLetConst
var dbLogs
//Текущие открытые вкладки расширением
// noinspection ES6ConvertVarToLetConst
var openedProjects = new Map()
let onLine

self.addEventListener('error', (event) => onUnhandledError(event.error.stack))
self.addEventListener('unhandledrejection', (event) => onUnhandledError(event.reason.stack))
function onUnhandledError(error) {
    if (self.createNotif) { // noinspection JSIgnoredPromiseFromCall
        createNotif(error, 'error', null, null, true)
        document.querySelectorAll('button[disabled]').forEach((el) => el.disabled = false)
    }
    if (!dbLogs) return
    const time = new Date().toLocaleString().replace(',', '')
    const log = '[' + time + ' ERROR]: ' + error
    try {
        dbLogs.put('logs', log).catch(e => {
            if (console._error) console._error(e)
            else console.error(e)
        })
    } catch (e) {
        if (console._error) console._error(e)
        else console.error(e)
    }
}

//Инициализация настроек расширения
async function initializeConfig(background, version) {
    if (!dbLogs) {
        dbLogs = await idb.openDB('logs', 1, {
            upgrade(db/*, oldVersion, newVersion, transaction*/) {
                db.createObjectStore('logs', {autoIncrement: true})
            }
        })
    }
    // noinspection JSUnusedGlobalSymbols
    try {
        db = await idb.openDB('avr', version ? version : 12, {upgrade})
    } catch (error) {
        //На случай если это версия MultiVote
        if (error.name === 'VersionError') {
            if (version) {
                dbError({target: {source: {name: 'avr'}}, error: error})
                return
            }
            console.log('Ошибка версии базы данных, возможно вы на версии MultiVote, пытаемся загрузить настройки версии MultiVote')
            await initializeConfig(background, 120)
            return
        }
        dbError({target: {source: {name: 'avr'}}, error: error})
        return
    }
    db.onerror = (event) => dbError(event, false)
    dbLogs.onerror = (event) => dbError(event, true)
    function dbError(event, logs) {
        if (background) {
            if (!settings || !settings.disabledNotifError) sendNotification(chrome.i18n.getMessage('errordbTitle', event.target.source.name), event.target.error.message)
            if (logs) {
                console._error(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error.message]))
            } else {
                console.error(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error.message]))
            }
        } else {
            createNotif(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error.message]), 'error')
        }
    }
    settings = await db.get('other', 'settings')
    generalStats = await db.get('other', 'generalStats')
    todayStats = await db.get('other', 'todayStats')
    openedProjects = await db.get('other', 'openedProjects')
    onLine = await db.get('other', 'onLine')

    if (!background) return

    if (state !== 'activated') {
        console.log(chrome.i18n.getMessage('start', chrome.runtime.getManifest().version))

        if (openedProjects.size > 0) {
            for (const [key, value] of openedProjects) {
                openedProjects.delete(key)
                // noinspection ES6MissingAwait
                tryCloseTab(key, value, 0)
            }
            await db.put('other', openedProjects, 'openedProjects')
        }

        // noinspection ES6MissingAwait
        checkVote()
    }
}

async function upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion == null) oldVersion = 1

    if (oldVersion !== newVersion) {
        if (self.createNotif) {
            // noinspection ES6MissingAwait
            createNotif(chrome.i18n.getMessage('oldSettings', [oldVersion, newVersion]))
        } else {
            console.log(chrome.i18n.getMessage('oldSettings', [oldVersion, newVersion]))
        }
    }

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
            disabledCheckInternet: false,
            disabledOneVote: false,
            disabledRestartOnTimeout: false,
            disabledFocusedTab: false,
            enableCustom: false,
            timeout: 10000,
            timeoutError: 900000,
            timeoutVote: 900000,
            disabledWarnCaptcha: false,
            debug: false,
            disabledUseRemoteCode: false,
            disabledSendErrorSentry: false,
            expertMode: false,
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
        await other.add(openedProjects, 'openedProjects')
        onLine = true
        other.add(onLine, 'onLine')
        return
    }

    if (!transaction) transaction = db.transaction(['projects', 'other'], 'readwrite')

    if (oldVersion <= 1 || oldVersion <= 3 || oldVersion % 10 !== 0) {
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

        if (transaction.mode === 'versionchange') {
            const vks = db.createObjectStore('vks', {autoIncrement: true})
            vks.createIndex('id', 'id')
            const proxies = db.createObjectStore('proxies', {autoIncrement: true})
            proxies.createIndex('ip, port', ['ip', 'port'])
            const borealis = db.createObjectStore('borealis', {autoIncrement: true})
            borealis.createIndex('nick', 'nick')
        }
    }

    if (oldVersion <= 3 || oldVersion <= 30) {
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
    }

    if (oldVersion <= 3 || oldVersion <= 30) {
        const store = transaction.objectStore('projects')
        let cursor = await store.index('rating').openCursor('DiscordBotList')
        while (cursor) {
            const project = cursor.value
            project.game = 'bots'
            await cursor.update(project)
            // noinspection JSVoidFunctionReturnValueUsed
            cursor = await cursor.continue()
        }
        cursor = await store.index('rating').openCursor('MinecraftRating')
        while (cursor) {
            const project = cursor.value
            project.game = 'projects'
            await cursor.update(project)
            // noinspection JSVoidFunctionReturnValueUsed
            cursor = await cursor.continue()
        }
        cursor = await store.index('rating').openCursor('PixelmonServers')
        while (cursor) {
            const project = cursor.value
            project.game = 'pixelmonservers.com'
            project.rating = 'MineServers'
            await cursor.update(project)
            // noinspection JSVoidFunctionReturnValueUsed
            cursor = await cursor.continue()
        }
    }

    if (oldVersion <= 4 || oldVersion <= 40) {
        const store = transaction.objectStore('projects')
        let cursor = await store.index('rating').openCursor('MCServerList')
        while (cursor) {
            const project = cursor.value
            project.maxCountVote = 5
            project.countVote = 0
            await cursor.update(project)
            // noinspection JSVoidFunctionReturnValueUsed
            cursor = await cursor.continue()
        }
        let cursor2 = await store.index('rating').openCursor('CzechCraft')
        while (cursor2) {
            const project = cursor2.value
            project.maxCountVote = 5
            project.countVote = 0
            await cursor2.update(project)
            // noinspection JSVoidFunctionReturnValueUsed
            cursor2 = await cursor2.continue()
        }
        let cursor3 = await store.index('rating').openCursor('MinecraftServery')
        while (cursor3) {
            const project = cursor3.value
            project.maxCountVote = 5
            project.countVote = 0
            await cursor3.update(project)
            // noinspection JSVoidFunctionReturnValueUsed
            cursor3 = await cursor3.continue()
        }
    }

    if (oldVersion <= 7 || oldVersion <= 70) {
        settings = await transaction.objectStore('other').get('settings')
        settings.timeoutError = 0
        settings.disabledOneVote = false
        settings.disabledFocusedTab = false
        await transaction.objectStore('other').put(settings, 'settings')
    }

    if (oldVersion <= 8 || oldVersion <= 80) {
        const store = transaction.objectStore('projects')
        let cursor = await store.index('rating').openCursor('WARGM')
        while (cursor) {
            const project = cursor.value
            project.randomize = {min: 0, max: 14400000}
            await cursor.update(project)
            // noinspection JSVoidFunctionReturnValueUsed
            cursor = await cursor.continue()
        }
    }

    if (oldVersion <= 9 || oldVersion <= 90) {
        openedProjects = new Map()
        await transaction.objectStore('other').put(openedProjects, 'openedProjects')
    }

    if (oldVersion <= 10) {
        settings = await transaction.objectStore('other').get('settings')
        settings.timeoutVote = 900000
        await transaction.objectStore('other').put(settings, 'settings')
    }

    if (oldVersion <= 11) {
        onLine = true
        await transaction.objectStore('other').put(onLine, 'onLine')
    }

    if (!todayStats) {
        const other = transaction.objectStore('other')
        todayStats = {
            successVotes: 0,
            errorVotes: 0,
            laterVotes: 0,
            lastSuccessVote: null,
            lastAttemptVote: null
        }
        await other.put(todayStats, 'todayStats')
    }

    if (!generalStats) {
        const other = transaction.objectStore('other')
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
        await other.put(generalStats, 'generalStats')
    }
}