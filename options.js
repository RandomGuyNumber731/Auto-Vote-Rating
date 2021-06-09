var settings
var generalStats = {}
//Хранит значение отключения проверки на совпадение проектов
var disableCheckProjects = false
//Нужно ли return если обнаружило ошибку при добавлении проекта
var returnAdd
//Где храним настройки
let storageArea = 'local'
//Блокировать ли кнопки которые требуют времени на выполнение?
let blockButtons = false

var authVKUrls = new Map([
    ['TopCraft', 'https://oauth.vk.com/authorize?auth_type=reauthenticate&state=Pxjb0wSdLe1y&redirect_uri=close.html&response_type=token&client_id=5128935&scope=email'],
    ['McTOP', 'https://oauth.vk.com/authorize?auth_type=reauthenticate&state=4KpbnTjl0Cmc&redirect_uri=close.html&response_type=token&client_id=5113650&scope=email'],
    ['MCRate', 'https://oauth.vk.com/authorize?client_id=3059117&redirect_uri=close.html&response_type=token&scope=0&v=&state=&display=page&__q_hash=a11ee68ba006307dbef29f34297bee9a'],
    ['MinecraftRating', 'https://oauth.vk.com/authorize?client_id=5216838&display=page&redirect_uri=close.html&response_type=token&v=5.45'],
    ['MonitoringMinecraft', 'https://oauth.vk.com/authorize?client_id=3697128&scope=0&response_type=token&redirect_uri=close.html'],
    ['QTop', 'https://oauth.vk.com/authorize?client_id=2856079&scope=SETTINGS&redirect_uri=close.html']
])

const svgFail = document.createElement('img')
svgFail.src = 'images/icons/error.svg'

const svgSuccess = document.createElement('img')
svgSuccess.src = 'images/icons/success.svg'

//Конструктор настроек
function Settings(disabledNotifStart, disabledNotifInfo, disabledNotifWarn, disabledNotifError, enabledSilentVote, disabledCheckTime, cooldown) {
    this.disabledNotifStart = disabledNotifStart
    this.disabledNotifInfo = disabledNotifInfo
    this.disabledNotifWarn = disabledNotifWarn
    this.disabledNotifError = disabledNotifError
    this.enabledSilentVote = enabledSilentVote
    this.disabledCheckTime = disabledCheckTime
    this.cooldown = cooldown
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
async function restoreOptions() {
    storageArea = await getValue('storageArea', 'local')
    if (storageArea == null || storageArea == '') {
        storageArea = 'local'
        await setValue('storageArea', storageArea, 'local')
    }
    for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
        window['projects' + item] = await getValue('AVMRprojects' + item)
    }
    settings = await getValue('AVMRsettings')
    generalStats = await getValue('generalStats')
    if (generalStats == null)
        generalStats = {
            added: Date.now()
        }
    if (projectsTopCraft == null || !(typeof projectsTopCraft[Symbol.iterator] === 'function')) {
        createNotif(chrome.i18n.getMessage('firstSettings'))
        
        for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
            window['projects' + item] = []
            await setValue('AVMRprojects' + item, window['projects' + item])
        }

        settings = new Settings(true, false, false, false, true, false, 1000, false)
        await setValue('AVMRsettings', settings)

        console.log(chrome.i18n.getMessage('settingsGen'))
        createNotif(chrome.i18n.getMessage('firstSettingsSave'), 'success')
        alert(chrome.i18n.getMessage('firstInstall'))
    }

    await checkUpdateConflicts(true)

    updateProjectList()

    //Слушатель дополнительных настроек
    let checkbox = document.querySelectorAll('input[name=checkbox]')
    for (const check of checkbox) {
        check.addEventListener('change', async function() {
            if (blockButtons) {
                createNotif(chrome.i18n.getMessage('notFast'), 'warn')
                return
            } else {
                blockButtons = true
            }
            let _return = false
            if (this.id == 'disabledNotifStart')
                settings.disabledNotifStart = this.checked
            else if (this.id == 'disabledNotifInfo')
                settings.disabledNotifInfo = this.checked
            else if (this.id == 'disabledNotifWarn')
                settings.disabledNotifWarn = this.checked
            else if (this.id == 'disabledNotifError') {
                if (this.checked && confirm(chrome.i18n.getMessage('confirmDisableErrors'))) {
                    settings.disabledNotifError = this.checked
                } else if (this.checked) {
                    this.checked = false
                    _return = true
                } else {
                    settings.disabledNotifError = this.checked
                }
            } else if (this.id == 'disabledCheckTime')
                settings.disabledCheckTime = this.checked
            else if (this.id == 'disabledCheckInternet')
                settings.disabledCheckInternet = this.checked
            else if (this.id == 'disableCheckProjects') {
                if (this.checked && confirm(chrome.i18n.getMessage('confirmDisableCheckProjects'))) {
                    disableCheckProjects = this.checked
                } else if (this.checked) {
                    this.checked = false
                } else {
                    disableCheckProjects = this.checked
                }
                _return = true
            } else if (this.id == 'priority') {
                if (this.checked && !confirm(chrome.i18n.getMessage('confirmPrioriry'))) {
                    this.checked = false
                }
                _return = true
            } else if (this.id == 'customTimeOut') {
                if (this.checked) {
                    document.getElementById('lastDayMonth').disabled = false
                    document.getElementById('label6').removeAttribute('style')
                    if (document.getElementById('selectTime').value == 'ms') {
                        document.getElementById('label3').removeAttribute('style')
                        document.getElementById('time').required = true
                        document.getElementById('label7').style.display = 'none'
                        document.getElementById('hour').required = false
                    } else {
                        document.getElementById('label7').removeAttribute('style')
                        document.getElementById('hour').required = true
                        document.getElementById('label3').style.display = 'none'
                        document.getElementById('time').required = false
                    }
                } else {
                    document.getElementById('lastDayMonth').disabled = true
                    document.getElementById('label6').style.display = 'none'
                    document.getElementById('label3').style.display = 'none'
                    document.getElementById('time').required = false
                    document.getElementById('label7').style.display = 'none'
                    document.getElementById('hour').required = false
                }
                _return = true
            } else if (this.id == 'lastDayMonth' || this.id == 'randomize') {
                _return = true
            } else if (this.id == 'sheldTimeCheckbox') {
                if (this.checked) {
                    document.getElementById('label9').removeAttribute('style')
                    document.getElementById('sheldTime').required = true
                } else {
                    document.getElementById('label9').style.display = 'none'
                    document.getElementById('sheldTime').required = false
                }
                _return = true
            } else if (this.id == 'enableSyncStorage') {
                _return = true
                let oldStorageArea = storageArea
                if (this.checked) {
                    if (await getValue('AVMRsettings', 'sync') != null) {
                        toggleModal('conflictSync')
                        this.checked = false
                        blockButtons = false
                        return
                    }
                    storageArea = 'sync'
                    createNotif(chrome.i18n.getMessage('settingsSyncCopy'))
                } else {
                    storageArea = 'local'
                    createNotif(chrome.i18n.getMessage('settingsSyncCopyLocal'))
                }
                await setValue('storageArea', storageArea, 'local')
                for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
                    await setValue('AVMRprojects' + item, window['projects' + item])
                    await removeValue('AVMRprojects' + item, oldStorageArea)
                }
                await setValue('AVMRsettings', settings)
                await setValue('generalStats', generalStats)
                await removeValue('AVMRsettings', oldStorageArea)
                await removeValue('generalStats', oldStorageArea)

                if (this.checked) {
                    createNotif(chrome.i18n.getMessage('settingsSyncCopySuccess'), 'success');
                } else {
                    createNotif(chrome.i18n.getMessage('settingsSyncCopyLocalSuccess'), 'success');
                }
            } else if (this.id == 'voteMode') {
                if (this.checked) {
                    document.getElementById('label8').removeAttribute('style')
                } else {
                    document.getElementById('label8').style.display = 'none'
                }
                _return = true
            }
            if (!_return) await setValue('AVMRsettings', settings)
            blockButtons = false
        })
    }
    //Считывает настройки расширение и выдаёт их в html
    document.getElementById('disabledNotifStart').checked = settings.disabledNotifStart
    document.getElementById('disabledNotifInfo').checked = settings.disabledNotifInfo
    document.getElementById('disabledNotifWarn').checked = settings.disabledNotifWarn
    document.getElementById('disabledNotifError').checked = settings.disabledNotifError
    if (settings.enabledSilentVote) {
        document.getElementById('enabledSilentVote').value = 'enabled'
    } else {
        document.getElementById('enabledSilentVote').value = 'disabled'
    }
    if (storageArea == 'sync') {
        document.getElementById('enableSyncStorage').checked = true
    }
    document.getElementById('disabledCheckTime').checked = settings.disabledCheckTime
    document.getElementById('disabledCheckInternet').checked = settings.disabledCheckInternet
    document.getElementById('cooldown').value = settings.cooldown
    if (settings.enableCustom || projectsCustom.length > 0) addCustom()
    //Для FireFox почему-то не доступно это API
    if (chrome.notifications.getPermissionLevel != null) {
        chrome.notifications.getPermissionLevel(function(callback) {
            if (callback != 'granted' && (!settings.disabledNotifError || !settings.disabledNotifWarn)) {
                createNotif(chrome.i18n.getMessage('notificationsDisabled'), 'error')
            }
        })
    }
}

//Добавить проект в список проекта
async function addProjectList(project, visually) {
    let listProject = document.getElementById(getProjectName(project) + 'List')
    if (listProject == null) {//Генерация тела списка добавленных проектов для текущего рейтинга
        let ul = document.createElement('ul')
        ul.id = getProjectName(project) + 'Tab'
        ul.classList.add('listcontent')
        ul.style.display = 'none'
        let div = document.createElement('div')
        div.setAttribute('data-resource', 'notAdded')
        div.textContent = chrome.i18n.getMessage('notAdded')
        ul.append(div)
        if (!(project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.ServerPact || project.MinecraftIpList || project.MCServerList)) {
            let label = document.createElement('label')
            label.setAttribute('data-resource', 'notAvaibledInSilent')
            label.textContent = chrome.i18n.getMessage('notAvaibledInSilent')
            let span = document.createElement('span')
            span.classList.add('tooltip2')
            let span2 = document.createElement('span')
            span2.setAttribute('data-resource', 'warnSilentVoteTooltip')
            span2.textContent = chrome.i18n.getMessage('warnSilentVoteTooltip')
            span2.classList.add('tooltip2text')
            span.append(span2)
            label.append(span)
            ul.append(label)
        }
        let div2 = document.createElement('div')
        div2.id = getProjectName(project) + 'List'
        ul.append(div2)
        const button = document.createElement('button')
        button.className = 'submitBtn redBtn'
        button.textContent = chrome.i18n.getMessage('deleteAll')
        button.addEventListener('click', async function () {
            if (confirm(chrome.i18n.getMessage('deleteAllRating'))) {
                window['projects' + getProjectName(project)] = []
                await setValue('AVMRprojects' + getProjectName(project), window['projects' + getProjectName(project)])
                updateProjectList()
            }
        })
        ul.append(button)
        listProject = div2
        document.querySelector('div.projectsBlock > div.contentBlock').append(ul)
    }
    listProject.parentElement.firstElementChild.style.display = 'none'
    let li = document.createElement('li')
    li.id = getProjectName(project) + '_' + project.id + '_' + project.nick
    //Расчёт времени
    let text = chrome.i18n.getMessage('soon')
    if (!(project.time == null || project.time == '') && Date.now() < project.time) {
        text = new Date(project.time).toLocaleString().replace(',', '')
    } else {
        const queueProjects = chrome.extension.getBackgroundPage().queueProjects
        for (let value of queueProjects) {
            if (getProjectName(value) == getProjectName(project)) {
                text = chrome.i18n.getMessage('inQueue')
                if (JSON.stringify(value.id) == JSON.stringify(project.id) && value.nick == project.nick) {
                    text = chrome.i18n.getMessage('now')
                    break
                }
            }
        }
    }

    const div = document.createElement('div')
    div.classList.add('controlItems')

    const img1 = document.createElement('img')
    img1.src = 'images/icons/stats.svg'
    div.appendChild(img1)

    const img2 = document.createElement('img')
    img2.src = 'images/icons/delete.svg'
    div.appendChild(img2)

    const contDiv = document.createElement('div')
    contDiv.classList.add('message')

    const nameProjectMes = document.createElement('div')
    nameProjectMes.textContent = (project.nick != null && project.nick != '' ? project.Custom ? project.nick : project.nick + ' – ' : '') + (project.game != null ? project.game + ' – ' : '') + (project.Custom ? '' : project.id) + (project.name != null ? ' – ' + project.name : '') + (!project.priority ? '' : ' (' + chrome.i18n.getMessage('inPriority') + ')') + (!project.randomize ? '' : ' (' + chrome.i18n.getMessage('inRandomize') + ')') + (!project.Custom && (project.timeout || project.timeoutHour) ? ' (' + chrome.i18n.getMessage('customTimeOut2') + ')' : '') + (project.lastDayMonth ? ' (' + chrome.i18n.getMessage('lastDayMonth2') + ')' : '') + (project.silentMode ? ' (' + chrome.i18n.getMessage('enabledSilentVoteSilent') + ')' : '') + (project.emulateMode ? ' (' + chrome.i18n.getMessage('enabledSilentVoteNoSilent') + ')' : '')
    contDiv.append(nameProjectMes)

    if (project.error) {
        const div2 = document.createElement('div')
        div2.style = 'color:#da5e5e;'
        div2.append(project.error)
        contDiv.appendChild(div2)
    }

    const nextVoteMes = document.createElement('div')
    nextVoteMes.textContent = chrome.i18n.getMessage('nextVote') + ' ' + text
    contDiv.append(nextVoteMes)

    li.append(contDiv)
    li.append(div)

    listProject.append(li)
    //Слушатель кнопки Удалить на проект
    img2.addEventListener('click', async function() {
        if (blockButtons) {
            createNotif(chrome.i18n.getMessage('notFast'), 'warn')
            return
        } else {
            blockButtons = true
        }
        await removeProjectList(project, false)
        blockButtons = false
    })
    //Слушатель кнопки Статистики и вывод её в модалку
    img1.addEventListener('click', function() {
        toggleModal('stats')
        document.getElementById('statsSubtitle').textContent = getProjectName(project) + ' – ' + project.nick + (project.game != null ? ' – ' + project.game : '') + (project.Custom ? '' : ' – ' + (project.name != null ? project.name : project.id))
        document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent = project.stats.successVotes ? project.stats.successVotes : 0
        document.querySelector('td[data-resource="statsMonthSuccessVotes"]').nextElementSibling.textContent = project.stats.monthSuccessVotes ? project.stats.monthSuccessVotes : 0
        document.querySelector('td[data-resource="statsLastMonthSuccessVotes"]').nextElementSibling.textContent = project.stats.lastMonthSuccessVotes ? project.stats.lastMonthSuccessVotes : 0
        document.querySelector('td[data-resource="statsErrorVotes"]').nextElementSibling.textContent = project.stats.errorVotes ? project.stats.errorVotes : 0
        document.querySelector('td[data-resource="statsLaterVotes"]').nextElementSibling.textContent = project.stats.laterVotes ? project.stats.laterVotes : 0
        document.querySelector('td[data-resource="statsLastSuccessVote"]').nextElementSibling.textContent = project.stats.lastSuccessVote ? new Date(project.stats.lastSuccessVote).toLocaleString().replace(',', '') : 'None'
        document.querySelector('td[data-resource="statsLastAttemptVote"]').nextElementSibling.textContent = project.stats.lastAttemptVote ? new Date(project.stats.lastAttemptVote).toLocaleString().replace(',', '') : 'None'
        document.querySelector('td[data-resource="statsAdded"]').nextElementSibling.textContent = project.stats.added ? new Date(project.stats.added).toLocaleString().replace(',', '') : 'None'
    })
    if (document.getElementById(getProjectName(project) + 'Button') == null) {
        if (document.querySelector('.buttonBlock').childElementCount == 0) {
            document.querySelector('.buttonBlock').innerText = ''
        }

        let button = document.createElement('button')
        button.setAttribute('class', 'selectsite')
        button.setAttribute('id', getProjectName(project) + 'Button')
        button.style.order = Object.keys(chrome.extension.getBackgroundPage().allProjects).indexOf(getProjectName(project))
        button.textContent = chrome.extension.getBackgroundPage().allProjects[getProjectName(project)]('URL')

        let count = document.createElement('span')
        count.textContent = getProjectList(project).length
        button.append(count)

        document.querySelector('.buttonBlock').append(button)
        document.getElementById(getProjectName(project) + 'Button').addEventListener('click', function() {
            listSelect(event, getProjectName(project) + 'Tab')
        })
    }
    if (visually) return
    if (project.priority) {
        getProjectList(project).unshift(project)
    } else {
        getProjectList(project).push(project)
    }
    await setValue('AVMRprojects' + getProjectName(project), getProjectList(project))
    if (project.Custom && !settings.enableCustom) addCustom()
    //projects.push(project)
    //await setValue('AVMRprojects', projects)
    if (document.querySelector('.buttonBlock').childElementCount > 0) {
        document.querySelector('p[data-resource="notAddedAll"]').textContent = ''
    }
    document.querySelector('#' + getProjectName(project) + 'Button > span').textContent = getProjectList(project).length
}

//Удалить проект из списка проекта
async function removeProjectList(project, visually) {
    let li = document.getElementById(getProjectName(project) + '_' + project.id + '_' + project.nick)
    if (li != null) {
        li.remove()
    } else {
        return
    }
    if ((getProjectList(project).length - 1) == 0) document.getElementById(getProjectName(project) + 'Tab').firstElementChild.removeAttribute('style')
    if (visually) return
    for (let i = getProjectList(project).length; i--; ) {
        let temp = getProjectList(project)[i]
        if (temp.nick == project.nick && JSON.stringify(temp.id) == JSON.stringify(project.id) && getProjectName(temp) == getProjectName(project))
            getProjectList(project).splice(i, 1)
    }
    await setValue('AVMRprojects' + getProjectName(project), getProjectList(project))
    //projects.splice(deleteCount, 1)
    //await setValue('AVMRprojects', projects)
    document.querySelector('#' + getProjectName(project) + 'Button > span').textContent = getProjectList(project).length
    for (let value of chrome.extension.getBackgroundPage().queueProjects) {
        if (value.nick == project.nick && JSON.stringify(value.id) == JSON.stringify(project.id) && getProjectName(value) == getProjectName(project)) {
            chrome.extension.getBackgroundPage().queueProjects.delete(value)
        }
    }
    //Если эта вкладка была уже открыта, он закрывает её
    for (let[key,value] of chrome.extension.getBackgroundPage().openedProjects.entries()) {
        if (value.nick == project.nick && JSON.stringify(value.id) == JSON.stringify(project.id) && getProjectName(value) == getProjectName(project)) {
            chrome.extension.getBackgroundPage().openedProjects.delete(key)
            chrome.tabs.remove(key)
        }
    }
}

//Перезагрузка списка проектов
    function updateProjectList(projects) {
    if (projects != null) {
        if (projects.length > 0) {
            const projectName = getProjectName(projects[0])
            if (document.getElementById(projectName + 'List') != null) document.getElementById(projectName + 'List').parentNode.replaceChild(document.getElementById(projectName + 'List').cloneNode(false), document.getElementById(projectName + 'List'))
            for (const project of projects) {
                addProjectList(project, true)
            }
        }
    } else {
        for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
            if (document.getElementById(item + 'List') != null) document.getElementById(item + 'List').parentNode.replaceChild(document.getElementById(item + 'List').cloneNode(false), document.getElementById(item + 'List'))
        }
        document.querySelector('div.buttonBlock').parentNode.replaceChild(document.querySelector('div.buttonBlock').cloneNode(false), document.querySelector('div.buttonBlock'))
        if (document.querySelector('div.projectsBlock > div.contentBlock > ul[style="display: block;"]') != null) {
            document.querySelector('div.projectsBlock > div.contentBlock > ul[style="display: block;"]').style.display = 'none'
        }
        forLoopAllProjects(async function(proj) {
            await addProjectList(proj, true)
        })
    }
    if (document.querySelector('.buttonBlock').childElementCount > 0) {
        document.querySelector('p[data-resource="notAddedAll"]').textContent = ''
    }
}

//Слушатель кнопки "Добавить"
document.getElementById('addProject').addEventListener('submit', async()=>{
    event.preventDefault()
    if (blockButtons) {
        createNotif(chrome.i18n.getMessage('notFast'), 'warn')
        return
    } else {
        blockButtons = true
    }
    let project = {}
    let name
    if (document.querySelector('#projectList > option[value="' + this.project.value + '"]') != null) {
        name = document.querySelector('#projectList > option[value="' + this.project.value + '"]').getAttribute('name')
    }
    if (name == null) {
        createNotif(chrome.i18n.getMessage('errorSelectSiteRating'), 'error')
        blockButtons = false
        return
    }
    project[name] = true
    project.id = document.getElementById('id').value
    if (!project.TopGG && !project.DiscordBotList && !project.BotsForDiscord && document.getElementById('nick').value != '') {
        project.nick = document.getElementById('nick').value
    }
    project.stats = {
        added: Date.now()
    }
    if (document.getElementById('sheldTimeCheckbox').checked && document.getElementById('sheldTime').value != '') {
        project.time = new Date(document.getElementById('sheldTime').value).getTime()
    } else {
        project.time = null
    }
    if (document.getElementById('customTimeOut').checked || project.Custom) {
        if (document.getElementById('selectTime').value == 'ms') {
            project.timeout = document.getElementById('time').valueAsNumber
        } else {
            project.timeoutHour = Number(document.getElementById('hour').value.split(':')[0])
            project.timeoutMinute = Number(document.getElementById('hour').value.split(':')[1])
            project.timeoutSecond = Number(document.getElementById('hour').value.split(':')[2])
        }
    }
    if (document.getElementById('lastDayMonth').checked) {
        project.lastDayMonth = true
    }
    if (!project.Custom && document.getElementById('voteMode').checked) {
        project[document.getElementById('voteModeSelect').value] = true
    }
    if (document.getElementById('priority').checked) {
        project.priority = true
    }
    if (document.getElementById('randomize').checked) {
        project.randomize = true
    }
    if (project.ListForge) {
        project.game = document.getElementById('chooseGameListForge').value
    } else if (project.TopG) {
        project.game = document.getElementById('chooseGameTopG').value
    } else if (project.TopGames) {
        project.game = document.getElementById('chooseGameTopGames').value
        project.lang = document.getElementById('selectLangTopGames').value
        project.maxCountVote = document.getElementById('countVote').valueAsNumber
        project.countVote = 0
    } else if (project.ServeurPrive) {
        project.game = document.getElementById('chooseGameServeurPrive').value
        project.lang = document.getElementById('selectLangServeurPrive').value
        project.maxCountVote = document.getElementById('countVote').valueAsNumber
        project.countVote = 0
    } else if (project.MMoTopRU) {
        project.game = document.getElementById('chooseGameMMoTopRU').value
        project.lang = document.getElementById('selectLangMMoTopRU').value
        project.ordinalWorld = document.getElementById('ordinalWorld').valueAsNumber
    } else if (project.TopGG) {
        project.game = document.getElementById('chooseTopGG').value
        project.addition = document.getElementById('additionTopGG').value
    }
    
    if (project.Custom) {
        let body
        try {
            body = JSON.parse(document.getElementById('customBody').value)
        } catch (e) {
            createNotif(e, 'error')
            blockButtons = false
            return
        }
        project.id = body
        project.responseURL = document.getElementById('responseURL').value
        await addProject(project, null)
    } else {
        await addProject(project, null)
    }
    blockButtons = false
})

//Слушатель кнопки "Установить" на кулдауне
document.getElementById('timeout').addEventListener('submit', async ()=>{
    event.preventDefault()
    if (blockButtons) {
        createNotif(chrome.i18n.getMessage('notFast'), 'warn')
        return
    } else {
        blockButtons = true
    }
    await setCoolDown()
    blockButtons = false
})

async function addProject(project, element) {
    createNotif(chrome.i18n.getMessage('adding'), null, null, element)

    //Получение бонусов на проектах где требуется подтвердить получение бонуса
    let secondBonusText
    let secondBonusButton = document.createElement('button')
    secondBonusButton.type = 'button'
    secondBonusButton.textContent = chrome.i18n.getMessage('lets')
    /*if (project.id == 'mythicalworld' || project.id == 5323 || project.id == 1654 || project.id == 6099) {
        secondBonusText = chrome.i18n.getMessage('secondBonus', 'MythicalWorld')
        secondBonusButton.id = 'secondBonusMythicalWorld'
        secondBonusButton.className = 'secondBonus'
    } else*/ if (project.id == 'victorycraft' || project.id == 8179 || project.id == 4729) {
        secondBonusText = chrome.i18n.getMessage('secondBonus', 'VictoryCraft')
        secondBonusButton.id = 'secondBonusVictoryCraft'
        secondBonusButton.className = 'secondBonus'
    }

    await forLoopAllProjects(function(proj) {
        if (getProjectName(proj) == getProjectName(project) && JSON.stringify(proj.id) == JSON.stringify(project.id) && !project.Custom) {
            const message = chrome.i18n.getMessage('alreadyAdded')
            if (!secondBonusText) {
                createNotif(message, 'success', null, element)
            } else {
                createNotif([message, document.createElement('br'), secondBonusText, secondBonusButton], 'success', 30000, element)
            }
            returnAdd = true
            return
        } else if (((proj.MCRate && project.MCRate) || (proj.ServerPact && project.ServerPact) || (proj.MinecraftServersOrg && project.MinecraftServersOrg) || (proj.HotMC && project.HotMC) || (proj.MMoTopRU && project.MMoTopRU && proj.game == project.game)) /*&& proj.nick == project.nick*/ && !disableCheckProjects) {
            createNotif(chrome.i18n.getMessage('oneProject', getProjectName(proj)), 'error', null, element)
            returnAdd = true
            return
        } else if (proj.MinecraftIpList && project.MinecraftIpList && !disableCheckProjects && projectsMinecraftIpList.length >= 5) {
            createNotif(chrome.i18n.getMessage('oneProjectMinecraftIpList'), 'error', null, element)
            returnAdd = true
            return
        } else if (proj.Custom && project.Custom && proj.nick == project.nick) {
            createNotif(chrome.i18n.getMessage('alreadyAdded'), 'success', null, element)
            returnAdd = true
            return
        }
    })
    if (returnAdd) {
        addProjectsBonus(project, element)
        returnAdd = false
        return
    }
    let projectURL = ''
    const url = chrome.extension.getBackgroundPage().allProjects[getProjectName(project)]('pageURL', project)
    const jsPath = chrome.extension.getBackgroundPage().allProjects[getProjectName(project)]('jsPath', project)
    const domain = getDomainWithoutSubdomain(url)

    const origins = []
    const permissions = []
    origins.push('*://*.' + domain + '/*')
    if (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.QTop) {
        origins.push('*://*.vk.com/*')
    }
    if (project.MonitoringMinecraft) {
        permissions.push('cookies')
    }
    
    let granted = await new Promise(resolve=>{
        chrome.permissions.contains({origins, permissions}, resolve)
    })
    if (!granted) {
        if (!chrome.app) {//Костыль для FireFox, что бы запросить права нужно что бы пользователь обязатльно кликнул
            const button = document.createElement('button')
            button.textContent = chrome.i18n.getMessage('grant')
            button.classList.add('submitBtn')
            button.addEventListener('click', async ()=>{
                granted = await new Promise(resolve=>{
                    chrome.permissions.request({origins, permissions}, resolve)
                })
                if (!granted) {
                    createNotif(chrome.i18n.getMessage('notGrantUrl'), 'error', null, element)
                    return
                } else {
                    addProject(project, element)
                }
            })
            createNotif([chrome.i18n.getMessage('grantUrl'), button])
            return
        }
        granted = await new Promise(resolve=>{
            chrome.permissions.request({origins, permissions}, resolve)
        })
        if (!granted) {
            createNotif(chrome.i18n.getMessage('notGrantUrl'), 'error', null, element)
            return
        }
    }

    if (!(disableCheckProjects || project.Custom)) {
        createNotif(chrome.i18n.getMessage('checkHasProject'), null, null, element)

        let response
        try {
            if (project.MinecraftIpList) {
                response = await fetch(url, {credentials: 'omit'})
            } else {
                response = await fetch(url, {credentials: 'include'})
            }
        } catch (e) {
            if (e == 'TypeError: Failed to fetch') {
                createNotif(chrome.i18n.getMessage('notConnectInternet'), 'error', null, element)
                return
            } else {
                createNotif(e, 'error', null, element)
                return
            }
        }

        if (response.status == 404) {
            createNotif(chrome.i18n.getMessage('notFoundProjectCode', String(response.status)), 'error', null, element)
            return
        } else if (response.redirected) {
            if (project.ServerPact || project.TopMinecraftServers || project.MCServers || project.MinecraftList || project.MinecraftIndex || project.ServerList101 || project.CraftList || project.MinecraftBuzz) {
                createNotif(chrome.i18n.getMessage('notFoundProject'), 'error', null, element)
                return
            }
            createNotif(chrome.i18n.getMessage('notFoundProjectRedirect') + response.url, 'error', null, element)
            return
        } else if (response.status == 503) {//None
        } else if (!response.ok) {
            createNotif(chrome.i18n.getMessage('notConnect', [getProjectName(project), String(response.status)]), 'error', null, element)
            return
        }

        try {
            let html = await response.text()
            let doc = new DOMParser().parseFromString(html, 'text/html')
            if (project.MCRate) {
                //А зачем 404 отдавать в status код? Мы лучше отошлём 200 и только потом на странице напишем что не найдено 404
                if (doc.querySelector('div[class=error]') != null) {
                    createNotif(doc.querySelector('div[class=error]').textContent, 'error', null, element)
                    return
                }
            } else if (project.ServerPact) {
                if (doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > center') != null && doc.querySelector('body > div.container.sp-o > div.row > div.col-md-9 > center').textContent.includes('This server does not exist')) {
                    createNotif(chrome.i18n.getMessage('notFoundProject'), 'error', null, element)
                    return
                }
            } else if (project.ListForge) {
                if (doc.querySelector('a[href="https://listforge.net/"]') == null && doc.querySelector('a[href="http://listforge.net/"]') == null) {
                    createNotif(chrome.i18n.getMessage('notFoundProject'), 'error', null, element)
                    return
                }
            } else if (project.MinecraftIpList) {
                if (doc.querySelector(jsPath) == null) {
                    createNotif(chrome.i18n.getMessage('notFoundProject'), 'error', null, element)
                    return
                }
            } else if (project.IonMc) {
                if (doc.querySelector('#app > div.mt-2.md\\:mt-0.wrapper.container.mx-auto > div.flex.items-start.mx-0.sm\\:mx-5 > div > div:nth-child(3) > div') != null) {
                    createNotif(doc.querySelector('#app > div.mt-2.md\\:mt-0.wrapper.container.mx-auto > div.flex.items-start.mx-0.sm\\:mx-5 > div > div:nth-child(3) > div').innerText, 'error', null, element)
                    return
                }
//          } else if (project.TopGG) {
//              if (doc.querySelector('a.btn.primary') != null && doc.querySelector('a.btn.primary').textContent.includes('Login')) {
//                  createNotif(chrome.i18n.getMessage('discordLogIn'), 'error', null, element)
//                  return
//              }
//          } else if (project.DiscordBotList) {
//              if (doc.querySelector('#nav-collapse > ul.navbar-nav.ml-auto > li > a').firstElementChild.textContent.includes('Log in')) {
//                  createNotif(chrome.i18n.getMessage('discordLogIn'), 'error', null, element)
//                  return
//              }
//          } else if (project.BotsForDiscord) {
//              if (doc.getElementById("sign-in") != null) {
//                  createNotif(chrome.i18n.getMessage('discordLogIn'), 'error', null, element)
//                  return
//              }
            } else if (project.MMoTopRU) {
                if (doc.querySelector('body > div') == null && doc.querySelectorAll('body > script[type="text/javascript"]').length == 1) {
                    createNotif(chrome.i18n.getMessage('emptySite'), 'error', null, element)
                    return
                } else if (doc.querySelector('a[href="https://mmotop.ru/users/sign_in"]') != null) {
                    createNotif(chrome.i18n.getMessage('auth'), 'error', null, element)
                    return
                }
            }
            
            if (project.MCServerList) {
                projectURL = JSON.parse(html)[0].name
            } else
            if (doc.querySelector(jsPath).text != null && doc.querySelector(jsPath).text != '') {
                projectURL = extractHostname(doc.querySelector(jsPath).text)
            } else if (doc.querySelector(jsPath).textContent != null && doc.querySelector(jsPath).textContent != '') {
                projectURL = extractHostname(doc.querySelector(jsPath).textContent)
            } else if (doc.querySelector(jsPath).value != null && doc.querySelector(jsPath).value != '') {
                projectURL = extractHostname(doc.querySelector(jsPath).value)
            } else if (doc.querySelector(jsPath).href != null && doc.querySelector(jsPath).href != '') {
                projectURL = extractHostname(doc.querySelector(jsPath).href)
            } else {
                projectURL = ''
            }

            if (projectURL != '') {
                projectURL = projectURL.trim()
                if (project.HotMC) {
                    projectURL = projectURL.replace(' сервер Майнкрафт', '')
                } else if (project.ListForge) {
                    projectURL = projectURL.substring(9, projectURL.length)
                } else if (project.MinecraftList) {
                    projectURL = projectURL.replace(' Minecraft Server', '')
                }
                project.name = projectURL
            }

//          if (project.nick == '') {
//              if (projectURL != '') {
//                  delete project.name
//                  project.nick = projectURL
//              } else {
//                  project.nick = project.id
//              }
//          }
        } catch (e) {
            console.error(e)
        }
        createNotif(chrome.i18n.getMessage('checkHasProjectSuccess'), null, null, element)

        //Проверка авторизации ВКонтакте
        if (project.TopCraft || project.McTOP || project.MCRate || project.MinecraftRating || project.MonitoringMinecraft || project.QTop) {
            createNotif(chrome.i18n.getMessage('checkAuthVK'), null, null, element)
            let url2 = authVKUrls.get(getProjectName(project))
            let response2
            try {
                response2 = await fetch(url2, {redirect: 'manual', credentials: 'include'})
            } catch (e) {
                if (e == 'TypeError: Failed to fetch') {
                    createNotif(chrome.i18n.getMessage('notConnectInternetVPN'), 'error', null, element)
                    return
                } else {
                    createNotif(e, 'error', null, element)
                    return
                }
            }

            if (response2.ok) {
                const message = chrome.i18n.getMessage('authVK', getProjectName(project))
                const button = document.createElement('button')
                button.id = 'authvk'
                button.classList.add('btn')
                let img = document.createElement('img')
                img.src = 'images/icons/arrow.svg'
                button.append(img)
                let text = document.createElement('div')
                text.textContent = chrome.i18n.getMessage('authButton')
                button.append(text)
                createNotif([message, document.createElement('br'), button], 'warn', 30000, element)
                button.addEventListener('click', function() {
                    if (element != null) {
                        openPopup(url2, function() {
                            document.location.reload(true)
                        })
                    } else {
                        openPopup(url2, async function() {
                            if (blockButtons) {
                                createNotif(chrome.i18n.getMessage('notFast'), 'warn')
                                return
                            } else {
                                blockButtons = true
                            }
                            await addProject(project, element)
                            blockButtons = false
                        })
                    }
                })
                return
            } else if (response2.status != 0) {
                createNotif(chrome.i18n.getMessage('notConnect', [extractHostname(response.url), String(response2.status)]), 'error', null, element)
                return
            }
            createNotif(chrome.i18n.getMessage('checkAuthVKSuccess'), null, null, element)
        }
    }

//  let random = false
//  if (projectURL.toLowerCase().includes('pandamium')) {
//      project.randomize = true
//      random = true
//  }

    await addProjectList(project, false)

    /*f (random) {
        updateStatusAdd('<div style="color:#4CAF50;">' + chrome.i18n.getMessage('addSuccess') + ' ' + projectURL + '</div> <div align="center" style="color:#da5e5e;">' + chrome.i18n.getMessage('warnSilentVote', getProjectName(project)) + '</div> <span class="tooltip2"><span class="tooltip2text">' + chrome.i18n.getMessage('warnSilentVoteTooltip') + '</span></span><br><div align="center"> Auto-voting is not allowed on this server, a randomizer for the time of the next vote is enabled in order to avoid punishment.</div>', true, element);
    } else*/
    let array = []
    array.push(chrome.i18n.getMessage('addSuccess') + ' ' + projectURL)
//  if ((project.PlanetMinecraft || project.TopG || project.MinecraftServerList || project.IonMc || project.MinecraftServersOrg || project.ServeurPrive || project.TopMinecraftServers || project.MinecraftServersBiz || project.HotMC || project.MinecraftServerNet || project.TopGames || project.TMonitoring || project.TopGG || project.DiscordBotList || project.MMoTopRU || project.MCServers || project.MinecraftList || project.MinecraftIndex || project.ServerList101) && settings.enabledSilentVote && !element) {
//      const messageWSV = chrome.i18n.getMessage('warnSilentVote', getProjectName(project))
//      const span = document.createElement('span')
//      span.className = 'tooltip2'
//      span.style = 'color: white;'
//      const span2 = document.createElement('span')
//      span2.className = 'tooltip2text'
//      span2.textContent = chrome.i18n.getMessage('warnSilentVoteTooltip')
//      span.appendChild(span2)
//      messageWSV.appendChild(span)
//      array.push(document.createElement('br'))
//      array.push(messageWSV)
//  }
    if (secondBonusText) {
        array.push(document.createElement('br'))
        array.push(secondBonusText)
        array.push(secondBonusButton)
    }
    if (project.MinecraftServersOrg || project.ListForge || project.ServerList101) {
        array.push(document.createElement('br'))
        array.push(chrome.i18n.getMessage('privacyPass'))
        const a = document.createElement('a')
        a.target = 'blank_'
        a.classList.add('link')
        a.href = 'https://chrome.google.com/webstore/detail/privacy-pass/ajhmfdgkijocedmfjonnpjfojldioehi'
//      a.href = 'https://addons.mozilla.org/ru/firefox/addon/privacy-pass/'
        a.textContent = 'Privacy Pass'
        array.push(a)
        array.push(chrome.i18n.getMessage('privacyPass2'))
        array.push(document.createElement('br'))
        array.push(chrome.i18n.getMessage('privacyPass3'))
        const a2 = document.createElement('a')
        a2.target = 'blank_'
        a2.classList.add('link')
        a2.href = 'https://www.hcaptcha.com/accessibility'
        a2.textContent = 'https://www.hcaptcha.com/accessibility'
        array.push(a2)
        array.push(chrome.i18n.getMessage('privacyPass4'))
        const a3 = document.createElement('a')
        a3.target = 'blank_'
        a3.classList.add('link')
        a3.href = 'https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg'
//      a3.href = 'https://addons.mozilla.org/ru/firefox/addon/etc2/'
//      a3.href = 'https://addons.opera.com/ru/extensions/details/edit-this-cookie/'
        a3.textContent = chrome.i18n.getMessage('this')
        array.push(a3)
        array.push(chrome.i18n.getMessage('privacyPass5'))
    }
    if (array.length > 1) {
        createNotif(array, 'success', 60000, element)
    } else {
        createNotif(array, 'success', null, element)
    }

    if (project.MinecraftIndex || project.PixelmonServers) {
        alert(chrome.i18n.getMessage('alertCaptcha'))
    }

    addProjectsBonus(project, element)
}
//Получение бонусов на проектах где требуется подтвердить получение бонуса
function addProjectsBonus(project, element) {
//  if (project.id == 'mythicalworld' || project.id == 5323 || project.id == 1654 || project.id == 6099) {
//      document.getElementById('secondBonusMythicalWorld').addEventListener('click', async()=>{
//          let response = await fetch('https://mythicalworld.su/bonus')
//          if (!response.ok) {
//              createNotif(chrome.i18n.getMessage('notConnect', [response.url, String(response.status)]), 'error', null, element)
//              return
//          } else if (response.redirected) {
//              createNotif(chrome.i18n.getMessage('redirectedSecondBonus', response.url), 'error', null, element)
//              return
//          }
//          await addProject('Custom', 'MythicalWorldBonus1Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=1&item=1","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
//          await addProject('Custom', 'MythicalWorldBonus2Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=2&item=2","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
//          await addProject('Custom', 'MythicalWorldBonus3Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=3&item=4","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
//          await addProject('Custom', 'MythicalWorldBonus4Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=4&item=7","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
//          await addProject('Custom', 'MythicalWorldBonus5Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=5&item=9","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
//          await addProject('Custom', 'MythicalWorldBonus6Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=6&item=11","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
//          await addProject('Custom', 'MythicalWorldBonusMith', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"type=1&bonus=1&value=5","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
//      })
/*  } else */if (project.id == 'victorycraft' || project.id == 8179 || project.id == 4729) {
        document.getElementById('secondBonusVictoryCraft').addEventListener('click', async()=>{
            if (blockButtons) {
                createNotif(chrome.i18n.getMessage('notFast'), 'warn')
                return
            } else {
                blockButtons = true
            }
            let vict = {
                Custom: true,
                nick: 'VictoryCraft ' + chrome.i18n.getMessage('dailyBonus'),
                id: JSON.parse('{"headers": {"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language": "ru,en-US;q=0.9,en;q=0.8","content-type": "application/x-www-form-urlencoded","sec-fetch-dest": "document","sec-fetch-mode": "navigate","sec-fetch-site": "same-origin","sec-fetch-user": "?1","upgrade-insecure-requests": "1"},"body": "give_daily_posted=1&token=%7Btoken%7D&return=%252F","method": "POST"}'),
                time: null,
                responseURL: 'https://victorycraft.ru/?do=cabinet&loc=bonuses',
                timeoutHour: 0,
                timeoutMinute: 10,
                timeoutSecond: 0,
                stats: {
                    added: Date.now()
                }
            }
            await addProject(vict, null)
            //await addProject('Custom', 'VictoryCraft Голосуйте минимум в 2х рейтингах в день', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://victorycraft.ru/?do=cabinet&loc=vote","referrerPolicy":"no-referrer-when-downgrade","body":"receive_month_bonus_posted=1&reward_id=1&token=%7Btoken%7D","method":"POST","mode":"cors"}', {ms: 604800000}, 'https://victorycraft.ru/?do=cabinet&loc=vote', null, priorityOption, null)
            blockButtons = false
        })
    }
}

async function setCoolDown() {
    if (settings.cooldown && settings.cooldown == document.getElementById('cooldown').valueAsNumber)
        return
    settings.cooldown = document.getElementById('cooldown').valueAsNumber
    await setValue('AVMRsettings', settings)
    if (confirm(chrome.i18n.getMessage('cooldownChanged'))) {
        chrome.runtime.reload()
    }
}

function getProjectName(project) {
    return Object.keys(project)[0]
}

function getProjectList(project) {
    return window['projects' + getProjectName(project)]
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
    //find & remove "?"
    hostname = hostname.split('?')[0]

    hostname = hostname.replace(/\r?\n/g, '')
//  hostname = hostname.replace(/\s+/g, '')

    return hostname
}
const getDomainWithoutSubdomain = url => {
  const urlParts = new URL(url).hostname.split('.')

  return urlParts
    .slice(0)
    .slice(-(urlParts.length === 4 ? 3 : 2))
    .join('.')
}

//Асинхронно достаёт/сохраняет настройки в chrome.storage
async function getValue(name, area) {
    if (!area) {
        area = storageArea
    }
    return new Promise((resolve, reject)=>{
        chrome.storage[area].get(name, function(data) {
            if (chrome.runtime.lastError) {
                createNotif(chrome.i18n.getMessage('storageError', chrome.runtime.lastError.message), 'error')
//              console.error(chrome.i18n.getMessage('storageError', chrome.runtime.lastError.message))
                reject(chrome.runtime.lastError.message)
            } else {
                resolve(data[name])
            }
        })
    })
}
async function setValue(key, value, area) {
    if (!area) {
        area = storageArea
    }
    return new Promise((resolve, reject)=>{
        chrome.storage[area].set({[key]: value}, function(data) {
            if (chrome.runtime.lastError) {
                createNotif(chrome.i18n.getMessage('storageErrorSave', chrome.runtime.lastError.message), 'error')
//              console.error(chrome.i18n.getMessage('storageErrorSave', chrome.runtime.lastError.message))
                reject(chrome.runtime.lastError.message)
            } else {
                resolve(data)
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
                createNotif(chrome.i18n.getMessage('storageErrorSave', chrome.runtime.lastError.message), 'error')
//              console.error(chrome.i18n.getMessage('storageErrorSave', chrome.runtime.lastError.message))
                reject(chrome.runtime.lastError.message)
            } else {
                resolve(data)
            }
        })
    })
}

//Слушатель на изменение настроек
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace != storageArea) return
    for (const key in changes) {
        let storageChange = changes[key]
        if (key.startsWith('AVMRprojects')) {
            window['projects' + key.replace('AVMRprojects', '')] = storageChange.newValue
        } else if (key == 'AVMRsettings') {
            settings = storageChange.newValue
            return
        } else if (key == 'generalStats') {
            generalStats = storageChange.newValue
            return
        } else if (key == 'storageArea') {
            return
        }
        if (storageChange.oldValue == null || !(typeof storageChange.oldValue[Symbol.iterator] === 'function') || storageChange.newValue == null || !(typeof storageChange.newValue[Symbol.iterator] === 'function')) return
//      if (storageChange.oldValue.length == storageChange.newValue.length) {
        updateProjectList(storageChange.newValue)
//      }
    }
})

async function forLoopAllProjects(fuc) {
    for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
        for (let proj of window['projects' + item]) {
            await fuc(proj)
        }
    }
}

//Слушатель на экспорт настроек
document.getElementById('file-download').addEventListener('click', ()=>{
    createNotif(chrome.i18n.getMessage('exporting'))
    let allSetting = {
        settings,
        generalStats
    }
    for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
        allSetting['projects' + item] = window['projects' + item]
    }
    let text = JSON.stringify(allSetting, null, '\t')
    let blob = new Blob([text],{type: 'text/json;charset=UTF-8;'})
    let anchor = document.createElement('a')

    anchor.download = 'AVR.json'
    anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
    anchor.dataset.downloadurl = ['text/json;charset=UTF-8;', anchor.download, anchor.href].join(':')
    anchor.click()
    createNotif(chrome.i18n.getMessage('exportingEnd'), 'success')
})

document.getElementById('logs-download').addEventListener('click', ()=>{
    createNotif(chrome.i18n.getMessage('exporting'))
    const openRequest = indexedDB.open('logs', 1)
    openRequest.onupgradeneeded = function() {
        // срабатывает, если на клиенте нет базы данных
        // ...выполнить инициализацию...
        openRequest.result.createObjectStore('logs', {autoIncrement: true})
        //Удаляем старые логи из localStorage
        if (localStorage.consoleHistory) localStorage.removeItem('consoleHistory')
    }
    openRequest.onerror = function() {
        createNotif(chrome.i18n.getMessage('errordb', 'logs') + ' ' + openRequest.error, 'e')
    }
    openRequest.onsuccess = function() {
        const db = openRequest.result
        db.onerror = function(event) {
            let request = event.target; // запрос, в котором произошла ошибка
            createNotif(chrome.i18n.getMessage('errordb', 'logs') + ' ' + request.error, 'e');
        }
        // продолжить работу с базой данных, используя объект db
        const transaction = db.transaction('logs', 'readonly')
        const logs = transaction.objectStore('logs')
        const request = logs.getAll()
        request.onsuccess = function() {
            let text = ''
            for (const log of request.result) {
                text += log
                text += '\n'
            }
            
            let blob = new Blob([text],{type: 'text/plain;charset=UTF-8;'})
            let anchor = document.createElement('a')
            
            anchor.download = 'console_history.txt'
            anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
            anchor.dataset.downloadurl = ['text/plain;charset=UTF-8;', anchor.download, anchor.href].join(':')
            
            openPopup(anchor.href)
            
            createNotif(chrome.i18n.getMessage('exportingEnd'), 'success')
        }
    }
})

//Сколько использовано места на логи
usageLogs()
async function usageLogs() {
    const quota = await navigator.storage.estimate()
    //На FireFox почему-то не поддерживается это API
    if (quota.usageDetails == null) return
    const usage = quota.usageDetails.indexedDB / (1024 * 1024)
    document.querySelector('span[data-resource="clearLogs"]').textContent = chrome.i18n.getMessage('clearLogs') + ' (' + usage.toFixed(3) + ' Mib)'
}
//Очистка логов
document.getElementById('logs-clear').addEventListener('click', ()=>{
    createNotif(chrome.i18n.getMessage('clearingLogs'))
    const openRequest = indexedDB.open('logs', 1)
    openRequest.onupgradeneeded = function() {
        // срабатывает, если на клиенте нет базы данных
        // ...выполнить инициализацию...
        openRequest.result.createObjectStore('logs', {autoIncrement: true})
        //Удаляем старые логи из localStorage
        if (localStorage.consoleHistory) localStorage.removeItem('consoleHistory')
    }
    openRequest.onerror = function() {
        createNotif(chrome.i18n.getMessage('errordb', 'logs') + ' ' + openRequest.error, 'e')
    }
    openRequest.onsuccess = function() {
        const db = openRequest.result
        db.onerror = function(event) {
            let request = event.target; // запрос, в котором произошла ошибка
            createNotif(chrome.i18n.getMessage('errordb', 'logs') + ' ' + request.error, 'e');
        }
        // продолжить работу с базой данных, используя объект db
        const transaction = db.transaction('logs', 'readwrite')
        const logs = transaction.objectStore('logs')
        const request = logs.clear()
        request.onsuccess = function() {
            createNotif(chrome.i18n.getMessage('clearedLogs'), 'success')
            usageLogs()
        }
    }
})

//Слушатель на импорт настроек
document.getElementById('file-upload').addEventListener('change', async (evt)=>{
    if (blockButtons) {
        createNotif(chrome.i18n.getMessage('notFast'), 'warn')
        return
    }
    createNotif(chrome.i18n.getMessage('importing'))
    try {
        if (evt.target.files.length == 0) return
        const file = evt.target.files[0]
        const data = await new Response(file).json()
        for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
            window['projects' + item] = data['projects' + item]
        }
        settings = data.settings
        generalStats = data.generalStats

        await checkUpdateConflicts(false)

        for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
            await setValue('AVMRprojects' + item, window['projects' + item])
        }
        await setValue('AVMRsettings', settings)
        await setValue('generalStats', generalStats)

        document.getElementById('disabledNotifStart').checked = settings.disabledNotifStart
        document.getElementById('disabledNotifInfo').checked = settings.disabledNotifInfo
        document.getElementById('disabledNotifWarn').checked = settings.disabledNotifWarn
        document.getElementById('disabledNotifError').checked = settings.disabledNotifError
        document.getElementById('disabledCheckTime').checked = settings.disabledCheckTime
        document.getElementById('disabledCheckInternet').checked = settings.disabledCheckInternet
        document.getElementById('cooldown').value = settings.cooldown
        if (settings.enabledSilentVote) {
            document.getElementById('enabledSilentVote').value = 'enabled'
        } else {
            document.getElementById('enabledSilentVote').value = 'disabled'
        }
        if (settings.enableCustom) addCustom()

        await updateProjectList()

        createNotif(chrome.i18n.getMessage('importingEnd'), 'success')
    } catch (e) {
        console.error(e)
        createNotif(e, 'error')
    } finally {
        document.getElementById('file-upload').value = ''
    }
}, false)

async function checkUpdateConflicts(save) {
    let updated = false
    //Если пользователь обновился с версии 3.3.1
    if (projectsTopGames == null || !(typeof projectsTopGames[Symbol.iterator] === 'function')) {
        updated = true
        createNotif(chrome.i18n.getMessage('settingsUpdate'))
        await forLoopAllProjects(async function(proj) {
            proj.stats = {}
            //Да, это весьма не оптимизированно
            if (save) await setValue('AVMRprojects' + getProjectName(proj), getProjectList(proj))
        })
    }
    if (generalStats == null) {
        updated = true
        createNotif(chrome.i18n.getMessage('settingsUpdate'))
        generalStats = {}
        if (save) await setValue('generalStats', generalStats)
    }

    for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
        if (window['projects' + item] == null || !(typeof window['projects' + item][Symbol.iterator] === 'function')) {
            if (!updated) {
                createNotif(chrome.i18n.getMessage('settingsUpdate'))
                updated = true
            }
            window['projects' + item] = []
            if (save)
                await setValue('AVMRprojects' + item, window['projects' + item])
        }
    }

    if (updated) {
        console.log(chrome.i18n.getMessage('settingsUpdateEnd'))
        createNotif(chrome.i18n.getMessage('settingsUpdateEnd2'), 'success')
    }
}

//Слушатель переключателя режима голосования
let modeVote = document.getElementById('enabledSilentVote')
modeVote.addEventListener('change', async function() {
    if (blockButtons) {
        createNotif(chrome.i18n.getMessage('notFast'), 'warn')
        return
    } else {
        blockButtons = true
    }
    if (modeVote.value == 'enabled') {
        settings.enabledSilentVote = true
    } else {
        settings.enabledSilentVote = false
    }
    await setValue('AVMRsettings', settings)
    blockButtons = false
})

//Достаёт все проекты указанные в URL
function getUrlProjects() {
    let projects = []
    let project = {}
    let parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        if (key == 'top' || key == 'nick' || key == 'id' || key == 'game' || key == 'lang' || key == 'maxCountVote' || key == 'ordinalWorld' || key == 'randomize' || key == 'addition' || key == 'silentMode' || key == 'emulateMode') {
            if (key == 'top' && Object.keys(project).length > 0) {
                project.time = null
                project.stats = {
                    added: Date.now()
                }
                projects.push(project)
                project = {}
            }
            if (key == 'top' || key == 'randomize' || key == 'silentMode' || key == 'emulateMode') {
                project[value] = true
            } else {
                project[key] = value
            }
        }
    })
    if (Object.keys(project).length > 0) {
        project.time = null
        project.stats = {
            added: Date.now()
        }
        projects.push(project)
    }
    return projects
}

//Достаёт все указанные аргументы из URL
function getUrlVars() {
    let vars = {}
    let parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value
    })
    return vars
}

//Если страница настроек была открыта сторонним проектом то расширение переходит к быстрому добавлению проектов
async function fastAdd() {
    if (window.location.href.includes('addFastProject')) {
        toggleModal('addFastProject')
        let vars = getUrlVars()
        if (vars['name'] != null) document.querySelector('[data-resource="fastAdd"]').textContent = getUrlVars()['name']
            
        let listFastAdd = document.querySelector('#addFastProject > div.content > .message')
        listFastAdd.textContent = ''

        if (vars['disableNotifInfo'] != null && vars['disableNotifInfo'] == 'true') {
            settings.disabledNotifInfo = true
            await setValue('AVMRsettings', settings)
            document.getElementById('disabledNotifInfo').checked = settings.disabledNotifInfo
            let html = document.createElement('div')
            html.classList.add('fastAddEl')
            html.append(svgSuccess.cloneNode(true))
            let div = document.createElement('div')
            let p = document.createElement('p')
            p.textContent = chrome.i18n.getMessage('disableNotifInfo')
            div.append(p)

            html.append(div)
            listFastAdd.append(html)
        }
        if (vars['disableNotifWarn'] != null && vars['disableNotifWarn'] == 'true') {
            settings.disabledNotifWarn = true
            await setValue('AVMRsettings', settings)
            document.getElementById('disabledNotifWarn').checked = settings.disabledNotifWarn
            let html = document.createElement('div')
            html.classList.add('fastAddEl')
            html.append(svgSuccess.cloneNode(true))
            let div = document.createElement('div')
            let p = document.createElement('p')
            p.textContent = chrome.i18n.getMessage('disableNotifWarn')
            div.append(p)

            html.append(div)
            listFastAdd.append(html)
        }
        if (vars['disableNotifStart'] != null && vars['disableNotifStart'] == 'true') {
            settings.disabledNotifStart = true
            await setValue('AVMRsettings', settings)
            document.getElementById('disabledNotifStart').checked = settings.disabledNotifStart
            let html = document.createElement('div')
            html.classList.add('fastAddEl')
            html.append(svgSuccess.cloneNode(true))
            let div = document.createElement('div')
            let p = document.createElement('p')
            p.textContent = chrome.i18n.getMessage('disableNotifStart')
            div.append(p)

            html.append(div)
            listFastAdd.append(html)
        }

        for (const project of getUrlProjects()) {
            let html = document.createElement('div')
            html.classList.add('fastAddEl')
            html.setAttribute('div', getProjectName(project)+'–'+project.nick+'–'+project.id)
            html.appendChild(svgFail.cloneNode(true))

            let div = document.createElement('div')
            let p = document.createElement('p')
            p.textContent = getProjectName(project)+' – '+project.nick+' – '+project.id
            const status = document.createElement('span')
            p.append(document.createElement('br'))
            p.append(status)

            div.append(p)
            html.append(div)
            listFastAdd.append(html)
            await addProject(project, status)
        }

        if (document.querySelector('#addFastProject img[src="images/icons/error.svg"]') != null) {
            let buttonRetry = document.createElement('button')
            buttonRetry.classList.add('btn')
            buttonRetry.textContent = chrome.i18n.getMessage('retry')
            document.querySelector('#addFastProject > div.content > .events').append(buttonRetry)
            buttonRetry.addEventListener('click', ()=> {
                document.location.reload(true)
            })
        } else if (document.querySelector('#addFastProject > div.content > div.message').childElementCount > 0) {
            let successFastAdd = document.createElement('div')
            successFastAdd.setAttribute('class', 'successFastAdd')
            successFastAdd.append(chrome.i18n.getMessage('successFastAdd'))
            successFastAdd.append(document.createElement('br'))
            successFastAdd.append(chrome.i18n.getMessage('closeTab'))
            listFastAdd.append(successFastAdd)
        } else {
            return
        }

        let buttonClose = document.createElement('button')
        buttonClose.classList.add('btn', 'redBtn')
        buttonClose.textContent = chrome.i18n.getMessage('closeTabButton')
        document.querySelector('#addFastProject > div.content > .events').append(buttonClose)
        buttonClose.addEventListener('click', ()=> {
            window.close()
        })
    }
}

function addCustom() {
    if (document.querySelector('option[name="Custom"]').disabled) {
        document.querySelector('option[name="Custom"]').disabled = false
    }

//  if (document.getElementById('CustomButton') == null) {
//      let buttonMS = document.createElement('button')
//      buttonMS.setAttribute('class', 'selectsite')
//      buttonMS.setAttribute('id', 'CustomButton')
//      buttonMS.setAttribute('hidden', false)
//      buttonMS.textContent = chrome.i18n.getMessage('Custom')
//      document.querySelector('#added > div > div:nth-child(4)').insertBefore(buttonMS, document.querySelector('#added > div > div:nth-child(4)').children[4])

//      document.getElementById('CustomButton').addEventListener('click', function() {
//          listSelect(event, 'CustomTab')
//      })
//  }
    if (!settings.enableCustom) {
        settings.enableCustom = true
        setValue('AVMRsettings', settings)
    }
}

async function openPopup(url, onClose) {
    const width = 655
    const height = 430
    const left = parseInt(Math.max(0, (screen.width - width) / 2) + (screen.availLeft | 0))
        , top = parseInt(Math.max(0, (screen.height - height) / 2) + (screen.availTop | 0))
    let close = 'setSelfAsOpener'
    if (!chrome.app) {//Костыль с FireFox
        //FireFox зачем-то решил это называть allowScriptsToClose когда в Chrome это называется setSelfAsOpener, как же это "удобно"
        close = 'allowScriptsToClose'
    }
    const tabID = await new Promise(resolve=>{
        chrome.windows.create({type: 'popup', url, [close]: true, top, left, width, height}, function (details) {
            resolve(details.tabs[0].id)
        })
    })
    if (onClose) {
        function onRemoved(tabId, removeInfo) {
            if (tabID == tabId) {
                onClose()
                chrome.tabs.onRemoved.removeListener(onRemoved)
            }
        }
        chrome.tabs.onRemoved.addListener(onRemoved)
    }
    return tabID
}

document.addEventListener('DOMContentLoaded', async()=>{
    await restoreOptions()
    fastAdd()
})

document.querySelector('.burger').addEventListener('click', ()=>{
    document.querySelector('.burger').classList.toggle('active')
    document.querySelector('nav').classList.toggle('active')
})

//Переключение между вкладками
document.querySelectorAll('.tablinks').forEach((item)=> {
    item.addEventListener('click', ()=> {
        if (item.classList.contains('active')) return

        if (document.querySelector('.burger.active')) {
            document.querySelector('.burger.active').classList.remove('active')
            document.querySelector('nav').classList.remove('active')
        }

        document.querySelectorAll('.tabcontent').forEach((elem)=> {
            elem.style.display = 'none'
        })
        document.querySelectorAll('.tablinks').forEach((elem)=> {
            elem.classList.remove('active')
        })

        let genStats = document.querySelector('#generalStats')
        if (item.getAttribute('data-tab') == 'added') genStats.style.visibility = 'visible'
        else genStats.removeAttribute('style')
 
        item.classList.add('active')
        document.getElementById(item.getAttribute('data-tab')).style.display = 'block'
    })
})

//Переключение между списками добавленных проектов
function listSelect(evt, tabs) {
    let x, listcontent, selectsite

    listcontent = document.getElementsByClassName('listcontent')
    for (let x = 0; x < listcontent.length; x++) {
        listcontent[x].style.display = 'none'
    }

    selectsite = document.getElementsByClassName('selectsite')
    for (let x = 0; x < selectsite.length; x++) {
        selectsite[x].className = selectsite[x].className.replace(' activeList', '')
    }

    document.getElementById(tabs).style.display = 'block'
    evt.currentTarget.className += ' activeList'
}

//Слушатели кнопок списка доавленных проектов
if (document.getElementById('CustomButton')) {
    document.getElementById('CustomButton').addEventListener('click', ()=> {
        listSelect(event, 'CustomTab')
    })
}

//Слушатель закрытия модалки статистики и её сброс
document.querySelector('#stats .close').addEventListener('click', ()=> {
    if (document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent != '') {
        document.getElementById('statsSubtitle').firstChild.remove()
        document.getElementById('statsSubtitle').append('\u00A0')
        document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsMonthSuccessVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLastMonthSuccessVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsErrorVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLaterVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLastSuccessVote"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLastAttemptVote"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsAdded"]').textContent = chrome.i18n.getMessage('statsAdded')
    }
})


//Слушатель общей статистики и вывод её в модалку
document.getElementById('generalStats').addEventListener('click', ()=> {
    // document.getElementById('modalStats').click()
    toggleModal('stats')
    document.getElementById('statsSubtitle').textContent = chrome.i18n.getMessage('generalStats')
    document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent = generalStats.successVotes ? generalStats.successVotes : 0
    document.querySelector('td[data-resource="statsMonthSuccessVotes"]').nextElementSibling.textContent = generalStats.monthSuccessVotes ? generalStats.monthSuccessVotes : 0
    document.querySelector('td[data-resource="statsLastMonthSuccessVotes"]').nextElementSibling.textContent = generalStats.lastMonthSuccessVotes ? generalStats.lastMonthSuccessVotes : 0
    document.querySelector('td[data-resource="statsErrorVotes"]').nextElementSibling.textContent = generalStats.errorVotes ? generalStats.errorVotes : 0
    document.querySelector('td[data-resource="statsLaterVotes"]').nextElementSibling.textContent = generalStats.laterVotes ? generalStats.laterVotes : 0
    document.querySelector('td[data-resource="statsLastSuccessVote"]').nextElementSibling.textContent = generalStats.lastSuccessVote ? new Date(generalStats.lastSuccessVote).toLocaleString().replace(',', '') : 'None'
    document.querySelector('td[data-resource="statsLastAttemptVote"]').nextElementSibling.textContent = generalStats.lastAttemptVote ? new Date(generalStats.lastAttemptVote).toLocaleString().replace(',', '') : 'None'
    document.querySelector('td[data-resource="statsAdded"]').textContent = chrome.i18n.getMessage('statsInstalled')
    document.querySelector('td[data-resource="statsAdded"]').nextElementSibling.textContent = generalStats.added ? new Date(generalStats.added).toLocaleString().replace(',', '') : 'None'
})

document.getElementById('localStorage').addEventListener('click', async ()=>{
    toggleModal('conflictSync')
    await removeValue('AVMRsettings', 'sync')
    document.getElementById('enableSyncStorage').click()
})
document.getElementById('syncStorage').addEventListener('click', async ()=>{
    toggleModal('conflictSync')
    await setValue('storageArea', 'sync', 'local')
    document.location.reload()
})

//Генерация поля ввода ID
var selectedTop = document.getElementById('project')

// selectedTop.addEventListener('click', function() {
//     let options = selectedTop.querySelectorAll('option')
//     let count = options.length
//     if (typeof (count) === 'undefined' || count < 2) {
//         addActivityItem()
//     }
// })

var laterChoose
selectedTop.addEventListener('change', function() {
    document.getElementById('id').value = ''
    let name
    if (document.querySelector('#projectList > option[value="' + this.value + '"]') != null) {
        name = document.querySelector('#projectList > option[value="' + this.value + '"]').getAttribute('name')
    }
    if (name == null) {
        this.value = ''
        document.getElementById('idSelector').style.display = 'none'
        document.getElementById('label1').style.display = 'none'
        document.getElementById('label2').style.display = 'none'
        document.getElementById('label3').style.display = 'none'
        document.getElementById('label4').style.display = 'none'
        document.getElementById('label5').style.display = 'none'
        document.getElementById('label6').style.display = 'none'
        document.getElementById('label7').style.display = 'none'
        document.getElementById('label8').style.display = 'none'
        document.getElementById('label9').style.display = 'none'
        document.getElementById('label10').style.display = 'none'
        document.getElementById('countVote').required = false
        document.getElementById('id').required = false
        document.getElementById('ordinalWorld').required = false
        document.getElementById('time').required = false
        document.getElementById('hour').required = false
        document.getElementById('nick').required = true
        document.getElementById('nick').parentElement.removeAttribute('style')
        document.querySelector('[data-resource="yourNick"]').textContent = chrome.i18n.getMessage('yourNick')
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')
        if (laterChoose && (laterChoose == 'ServeurPrive' || laterChoose == 'TopGames' || laterChoose == 'MMoTopRU')) {
            document.getElementById('selectLang' + laterChoose).style.display = 'none'
            document.getElementById('selectLang' + laterChoose).required = false
            document.getElementById('chooseGame' + laterChoose).style.display = 'none'
            document.getElementById('chooseGame' + laterChoose).required = false
        }
        return
    }
    document.getElementById('idSelector').removeAttribute('style')

    if (document.getElementById(name + 'IDList') != null) {
        document.getElementById('id').setAttribute('list', name + 'IDList')
        document.getElementById('id').placeholder = chrome.i18n.getMessage('inputProjectIDOrList')
    } else {
        document.getElementById('id').removeAttribute('list')
        document.getElementById('id').placeholder = chrome.i18n.getMessage('inputProjectID')
    }

    document.getElementById('id').required = true

    const exampleURL = chrome.extension.getBackgroundPage().allProjects[name]('exampleURL')
    document.getElementById('projectIDTooltip1').textContent = exampleURL[0]
    document.getElementById('projectIDTooltip2').textContent = exampleURL[1]
    document.getElementById('projectIDTooltip3').textContent = exampleURL[2]

    if (name == 'Custom' || name == 'ServeurPrive' || name == 'TopGames' || name == 'MMoTopRU' || laterChoose == 'Custom' || laterChoose == 'ServeurPrive' || laterChoose == 'TopGames' || laterChoose == 'MMoTopRU') {
        document.querySelector('[data-resource="yourNick"]').textContent = chrome.i18n.getMessage('yourNick')
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')

        idSelector.removeAttribute('style')

        document.getElementById('label1').style.display = 'none'
        document.getElementById('label2').style.display = 'none'
        document.getElementById('label4').style.display = 'none'
        document.getElementById('label5').style.display = 'none'
        document.getElementById('label10').style.display = 'none'
        document.getElementById('countVote').required = false
        document.getElementById('ordinalWorld').required = false
        if (laterChoose && (laterChoose == 'ServeurPrive' || laterChoose == 'TopGames' || laterChoose == 'MMoTopRU')) {
            document.getElementById('selectLang' + laterChoose).style.display = 'none'
            document.getElementById('selectLang' + laterChoose).required = false
            document.getElementById('chooseGame' + laterChoose).style.display = 'none'
            document.getElementById('chooseGame' + laterChoose).required = false
        }
        document.getElementById('idGame').style.display = 'none'
        document.getElementById('customTimeOut').disabled = false
        document.getElementById('voteMode').disabled = false
        if (!document.getElementById('customTimeOut').checked) {
            document.getElementById('label6').style.display = 'none'
            document.getElementById('label3').style.display = 'none'
            document.getElementById('time').required = false
            document.getElementById('label7').style.display = 'none'
            document.getElementById('hour').required = false
        }

        if (name == 'Custom') {
            document.getElementById('customTimeOut').disabled = true
            document.getElementById('customTimeOut').checked = false
            document.getElementById('lastDayMonth').disabled = true
            document.getElementById('lastDayMonth').checked = false
            document.getElementById('voteMode').disabled = true
            document.getElementById('voteMode').checked = false

            idSelector.setAttribute('style', 'height: 0px;')
            idSelector.style.display = 'none'

            document.getElementById('id').required = false

            document.getElementById('label6').removeAttribute('style')
            document.getElementById('label1').removeAttribute('style')
            document.getElementById('label2').removeAttribute('style')
            if (document.getElementById('selectTime').value == 'ms') {
                document.getElementById('label3').removeAttribute('style')
                document.getElementById('time').required = true
                document.getElementById('label7').style.display = 'none'
                document.getElementById('hour').required = false
            } else {
                document.getElementById('label7').removeAttribute('style')
                document.getElementById('hour').required = true
                document.getElementById('label3').style.display = 'none'
                document.getElementById('time').required = false
            }

            document.querySelector('[data-resource="yourNick"]').textContent = chrome.i18n.getMessage('name')
            document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterName')
//          document.getElementById('nick').required = true

            selectedTop.after(' ')
        } else if (name == 'TopGames' || name == 'ServeurPrive' || name == 'MMoTopRU') {
//          document.getElementById('nick').required = false
            
            if (name != 'MMoTopRU') {
                document.getElementById('countVote').required = true
                document.getElementById('label5').removeAttribute('style')
            } else {
                document.getElementById('ordinalWorld').required = true
                document.getElementById('label10').removeAttribute('style')
            }

            document.getElementById('selectLang' + name).removeAttribute('style')
            document.getElementById('selectLang' + name).required = true
            document.getElementById('chooseGame' + name).removeAttribute('style')
            document.getElementById('chooseGame' + name).required = true

            document.getElementById('label4').removeAttribute('style')
            document.getElementById('idGame').removeAttribute('style')
            if (name == 'ServeurPrive') {
                document.getElementById('gameIDTooltip1').textContent = 'https://serveur-prive.net/'
                document.getElementById('gameIDTooltip2').textContent = 'minecraft'
                document.getElementById('gameIDTooltip3').textContent = '/gommehd-net-4932'
            } else if (name == 'TopGames') {
                document.getElementById('gameIDTooltip1').textContent = 'https://top-serveurs.net/'
                document.getElementById('gameIDTooltip2').textContent = 'minecraft'
                document.getElementById('gameIDTooltip3').textContent = '/hailcraft'
            } else if (name == 'MMoTopRU') {
                document.getElementById('gameIDTooltip1').textContent = 'https://'
                document.getElementById('gameIDTooltip2').textContent = 'pw'
                document.getElementById('gameIDTooltip3').textContent = '.mmotop.ru/servers/25895/votes/new'
            }
        }
    }

    if (name == 'TopGG' || name == 'DiscordBotList' || name == 'BotsForDiscord') {
        document.getElementById('nick').required = false
        document.getElementById('nick').parentElement.style.display = 'none'
    } else if (laterChoose == 'TopGG' || laterChoose == 'DiscordBotList' || laterChoose == 'BotsForDiscord') {
        document.getElementById('nick').required = true
        document.getElementById('nick').parentElement.removeAttribute('style')
    }
    
    if (name == 'ListForge') {
        document.getElementById('nick').required = false
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNickOptional')
        document.getElementById('urlGame').removeAttribute('style')
        document.getElementById('chooseGameListForge').required = true
    } else if (laterChoose == 'ListForge') {
        if (name != 'TopGG' && name != 'DiscordBotList' && name != 'BotsForDiscord') document.getElementById('nick').required = true
        if (name != 'Custom') document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')
        document.getElementById('urlGame').style.display = 'none'
        document.getElementById('chooseGameListForge').required = false
    }

    if (name == 'BestServersCom') {
        document.getElementById('nick').required = false
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNickOptional')
    } else if (laterChoose == 'BestServersCom') {
        if (name != 'TopGG' && name != 'DiscordBotList' && name != 'BotsForDiscord' && name != 'BestServersCom') document.getElementById('nick').required = true
        if (name != 'Custom') document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')
    }

    if (name == 'TopG') {
        document.getElementById('urlGameTopG').removeAttribute('style')
        document.getElementById('chooseGameTopG').required = true
    } else if (laterChoose == 'TopG') {
        document.getElementById('urlGameTopG').style.display = 'none'
        document.getElementById('chooseGameTopG').required = false
    }

    if (name == 'TopGG') {
        document.getElementById('chooseTopGG1').removeAttribute('style')
        document.getElementById('additionTopGG1').removeAttribute('style')
    } else if (laterChoose == 'TopGG') {
        document.getElementById('chooseTopGG1').style.display = 'none'
        document.getElementById('additionTopGG1').style.display = 'none'
    }

    laterChoose = name
})
selectedTop.dispatchEvent(new Event('change'))

//Слушатель на выбор типа timeout для Custom
document.getElementById('selectTime').addEventListener('change', function() {
    if (this.value == 'ms') {
        document.getElementById('label3').removeAttribute('style')
        document.getElementById('time').required = true
        document.getElementById('label7').style.display = 'none'
        document.getElementById('hour').required = false
    } else {
        document.getElementById('label7').removeAttribute('style')
        document.getElementById('hour').required = true
        document.getElementById('label3').style.display = 'none'
        document.getElementById('time').required = false

    }
})

generateDataList()
function generateDataList() {
    const datalist = document.getElementById('projectList')
    for (const item of Object.keys(chrome.extension.getBackgroundPage().allProjects)) {
        const url = chrome.extension.getBackgroundPage().allProjects[item]('URL')
        const option = document.createElement('option')
        option.setAttribute('name', item)
        option.value = url
        datalist.append(option)
    }
    document.querySelector('option[name="ListForge"]').textContent = 'or Minecraft-MP.com'
    document.querySelector('option[name="TopGames"]').textContent = 'or Top-Serveurs.net'
    document.querySelector('option[name="Custom"]').textContent = chrome.i18n.getMessage('Custom')
    document.querySelector('option[name="Custom"]').disabled = true
}

//Локализация
let elements = document.querySelectorAll('[data-resource]')
elements.forEach(function(el) {
    el.prepend(chrome.i18n.getMessage(el.getAttribute('data-resource')))
})
document.querySelectorAll('[placeholder]').forEach(function(el) {
    const message = chrome.i18n.getMessage(el.placeholder)
    if (!message || message == '') return
    el.placeholder = message
})
document.getElementById('nick').setAttribute('placeholder', chrome.i18n.getMessage('enterNick'))
document.getElementById('donate').setAttribute('href', chrome.i18n.getMessage('donate'))

//Модалки
document.querySelectorAll('#modals .modal .close').forEach((closeBtn)=> {
    closeBtn.addEventListener('click', ()=> {
        if (closeBtn.parentElement.parentElement.id == 'addFastProject') {
            location.href = 'options.html'
        }
        toggleModal(closeBtn.parentElement.parentElement.id)
    })
})

let modalsBlock = document.querySelector('#modals')
function toggleModal(modalID) {
    if (modalsBlock.querySelector('.overlay').classList.contains('active')) {
        modalsBlock.querySelector('.overlay').style.transition = '.3s'
        modalsBlock.querySelector('#'+modalID).style.transition = '.3s'
        setTimeout(()=> {
            modalsBlock.querySelector('.overlay').removeAttribute('style')
            modalsBlock.querySelector('#'+modalID).removeAttribute('style')
        }, 300)
    }
    modalsBlock.querySelector('.overlay').classList.toggle('active')
    modalsBlock.querySelector('#'+modalID).classList.toggle('active')
}

modalsBlock.querySelector('.overlay').addEventListener('click', ()=> {
    let activeModal = modalsBlock.querySelector('.modal.active')
    if (activeModal.id == 'stats') {
        toggleModal('stats')
        return
    }
    activeModal.style.transform = 'scale(1.1)'
    setTimeout(()=> activeModal.removeAttribute('style'), 100)
})

//notifications
async function createNotif(message, type, delay, element) {
    if (!type) type = 'hint'
    console.log('['+type+']', message)
    if (element != null) {
        element.textContent = ''
        if (typeof message[Symbol.iterator] === 'function' && typeof message === 'object') {
            for (const m of message) element.append(m)
        } else {
            element.textContent = message
        }
        element.className = type
        if (type == 'success') {
            element.parentElement.parentElement.parentElement.firstElementChild.src = 'images/icons/success.svg'
        }
        return
    }
    let notif = document.createElement('div')
    notif.classList.add('notif', 'show', type)
    if (!delay) {
        if (type == 'error') delay = 30000
        else delay = 5000
    }

    if (type != 'hint') {
        let imgBlock = document.createElement('img')
        imgBlock.src = 'images/notif/'+type+'.png'
        notif.append(imgBlock)
        let progressBlock = document.createElement('div')
        progressBlock.classList.add('progress')
        let progressBar = document.createElement('div')
        progressBar.style.animation = 'notif-progress '+delay/1000+'s linear'
        progressBlock.append(progressBar)
        notif.append(progressBlock)
    }

    let mesBlock = document.createElement('div')
    if (typeof message[Symbol.iterator] === 'function' && typeof message === 'object') {
        for (const m of message) mesBlock.append(m)
    } else {
        mesBlock.append(message)
    }
    notif.append(mesBlock)
    notif.style.visibility = 'hidden'
    document.getElementById('notifBlock2').append(notif)

    let allNotifH
    function calcAllNotifH() {
        allNotifH = 10
        document.querySelectorAll('#notifBlock > .notif').forEach((el)=> {
            allNotifH = allNotifH + el.clientHeight + 10
        })
        document.querySelectorAll('#notifBlock2 > .notif').forEach((el)=> {
            allNotifH = allNotifH + el.clientHeight + 10
        })
    }
    calcAllNotifH()

    notif.remove()
    notif.removeAttribute('style')

    while (window.innerHeight < allNotifH) {
        await new Promise(resolve=>{
            function listener(event) {
                if (event.animationName == 'notif-hide') {
                    document.getElementById('notifBlock').removeEventListener('animationend', listener)
                    resolve()
                }
            }
            document.getElementById('notifBlock').addEventListener('animationend', listener)
        })
        calcAllNotifH()
    }

    document.getElementById('notifBlock').append(notif)

    let timer
    if (type != 'hint') timer = new Timer(()=> removeNotif(notif), delay)

    if (notif.previousElementSibling != null && notif.previousElementSibling.classList.contains('hint')) {
        setTimeout(()=> removeNotif(notif.previousElementSibling), delay >= 3000 ? 3000 : delay)
    }

    notif.addEventListener('click', (e)=> {
        if (notif.querySelector('a') != null || notif.querySelector('button') != null) {
            if (e.detail == 2) removeNotif(notif)
        } else {
            removeNotif(notif)
        }
    })

    notif.addEventListener('mouseover', ()=> {
        if (!notif.classList.contains('hint')) {
            timer.pause()
            notif.querySelector('.progress div').style.animationPlayState = 'paused'
        }
    })

    notif.addEventListener('mouseout', ()=> {
        if (!notif.classList.contains('hint')) {
            timer.resume()
            notif.querySelector('.progress div').style.animationPlayState = 'running'
        }
    })

    function removeNotif(elem) {
        if (!elem) return
        elem.classList.remove('show')
        elem.classList.add('hide')
        setTimeout(()=> elem.classList.add('hidden'), 500)
        setTimeout(()=> elem.remove(), 1000)
    }
}

let Timer = function(callback, delay) {
    let timerId, start, remaining = delay;

    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= Date.now() - start;
    };

    this.resume = function() {
        start = Date.now();
        window.clearTimeout(timerId);
        timerId = window.setTimeout(callback, remaining);
    };

    this.resume();
}