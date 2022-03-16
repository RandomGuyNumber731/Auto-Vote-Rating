async function vote(first) {
    if (first === false) return
    if (document.querySelector('div.alert.alert-success') != null) {
        chrome.runtime.sendMessage({successfully: true})
        return
    }
    if (document.querySelector('div.alert.alert-danger') != null) {
        if (document.querySelector('div.alert.alert-danger').textContent.includes('Je mag maar')) {
            chrome.runtime.sendMessage({later: true})
            return
        }
        chrome.runtime.sendMessage({message: document.querySelector('div.alert.alert-danger').textContent})
        return
    }

    const project = await getProject('MinecraftKrant')
    document.querySelector('input[name="minecraft_name"]').value = project.nick
    document.querySelector('input[value="Vote"]').click()
}