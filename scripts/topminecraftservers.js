async function vote(first) {
    if (first === false) return
    try {
        if (document.querySelector('div.alert.alert-danger') != null) {
            if (document.querySelector('div.alert.alert-danger').textContent.includes('already voted')) {
                chrome.runtime.sendMessage({later: true})
            } else {
                chrome.runtime.sendMessage({message: document.querySelector('div.alert.alert-danger').textContent})
            }
        } else if (document.querySelector('body > div.container > div > div > div > div.col-md-4 > button') != null) {
            if (document.querySelector('body > div.container > div > div > div > div.col-md-4 > button').textContent.includes('already voted')) {
                chrome.runtime.sendMessage({successfully: true})
            } else {
                chrome.runtime.sendMessage({message: document.querySelector('body > div.container > div > div > div > div.col-md-4 > button').textContent})
            }
        } else {
            //Ожидание загрузки reCATPCHA
            const timer = setInterval(async ()=>{
                try {
                    if (document.querySelector('input[name="t"]') != null && document.querySelector('input[name="t"]').value !== '') {
                        clearInterval(timer)
                        const project = await getProject('TopMinecraftServers')
                        document.getElementById('username').value = project.nick
                        document.getElementById('voteButton').click()
                    }
                } catch (e) {
                    throwError(e)
                    clearInterval(timer)
                }
            }, 1000)
        }
    } catch (e) {
        throwError(e)
    }
}