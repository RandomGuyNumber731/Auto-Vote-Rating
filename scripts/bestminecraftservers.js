async function vote(/*first*/) {
    if (document.body.innerHTML.length === 0) {
        chrome.runtime.sendMessage({emptyError: true, ignoreReport: true})
        return
    }

    if (isVisibleElement(document.querySelector('div[role="dialog"]'))) {
        chrome.runtime.sendMessage({requiredConfirmTOS: true})
        await new Promise(resolve => {
            const timer2 = setInterval(() => {
                if (!document.querySelector('div[role="dialog"]')) {
                    clearInterval(timer2)
                    resolve()
                }
            }, 1000)
        })
    }

    if (document.querySelector('.ui.segments')) {
        const request = {}
        request.message = document.querySelector('.ui.segments').textContent.trim()
        if (request.message.includes('Page Not Found')) {
            request.ignoreReport = true
        }
        chrome.runtime.sendMessage(request)
        return
    }

    if (document.querySelector('div.ui.error.message')) {
        const request = {}
        request.message = document.querySelector('div.ui.error.message').textContent.trim()
        if (request.message.includes('must wait until tomorrow before voting again')) {
            chrome.runtime.sendMessage({later: true})
            return
        } else if (request.message.toLowerCase().includes('review text has to be')) {
            // None
        } else {
            if (request.message.includes('Vote limit has been exceed')) {
                request.ignoreReport = true
            }
            chrome.runtime.sendMessage(request)
            return
        }
    }

    if (document.querySelector('div.ui.success.message') != null) {
        chrome.runtime.sendMessage({successfully: true})
        return
    }

    const voteButton = document.querySelector('#serverPage a[href*="/vote"]')
    if (voteButton && !voteButton.classList.contains('active')) {
        voteButton.click()
        return
    }

    const project = await getProject('BestMinecraftServers')
    document.querySelector('#main-content input[name="username"]').value = project.nick
    document.querySelector('#main-content button[type="submit"]').click()
}