window.onmessage = function(e) {
    if (e.data == 'vote') {
        vote(false)
    }
}
vote(true)

async function vote(first) {
    try {
        //Если мы находимся на странице проверки CloudFlare
        if (document.querySelector('span[data-translate="complete_sec_check"]') != null) {
            return
        }
        //Если есть сообщение
        if (document.querySelector('div.alert.alert-success') != null) {
            chrome.runtime.sendMessage({successfully: true})
            return
        }
        if (document.querySelector('div.alert.alert-danger') != null) {
            if (document.querySelector('div.alert.alert-danger').textContent.includes('already voting')) {
                chrome.runtime.sendMessage({later: Date.now() + 86400000})//+ 24 часа
            } else {
                chrome.runtime.sendMessage({message: document.querySelector('div.alert.alert-danger').textContent.trim()})
            }
            return
        }
        if (first) {
            return
        }
        const nick = await getNickName()
        if (nick == null || nick == '')
            return
        document.getElementById('mc_user').value = nick
        document.getElementById('rate-10').click()
        document.querySelector('input[value="Confirm Vote"]').click()
    } catch (e) {
        chrome.runtime.sendMessage({errorVoteNoElement2: e.stack + (document.body.textContent.trim().length < 500 ? ' ' + document.body.textContent.trim() : '')})
    }
}

async function getNickName() {
    const storageArea = await new Promise(resolve=>{
        chrome.storage.local.get('storageArea', data=>{
            resolve(data['storageArea'])
        })
    })
    const projects = await new Promise(resolve=>{
        chrome.storage[storageArea].get('AVMRprojectsMinecraftServerNet', data=>{
            resolve(data['AVMRprojectsMinecraftServerNet'])
        })
    })
    for (const project of projects) {
        if (document.URL.includes(project.id)) {
            return project.nick
        }
    }

    chrome.runtime.sendMessage({errorVoteNoNick2: document.URL})
}
