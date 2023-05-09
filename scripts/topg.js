async function vote(first) {
    if (document.querySelector('.alert.alert-danger') != null) {
        const message = document.querySelector('.alert.alert-danger').textContent.trim()
        if (message.includes('verification required') || message.includes('not double click or refresh page')) return
        chrome.runtime.sendMessage({message})
        return
    } else if (document.querySelector('.alert.alert-warning') != null) {
        const message = document.querySelector('.alert.alert-warning').textContent
        if (message.includes('already voted')) {
            let hour = 0
            let min = 0
            let sec = 0
            if (message.match(/\d+ hour/g) != null) {
                hour = Number(message.match(/\d+ hour/g)[0].match(/\d+/g)[0])
            }
            if (message.match(/\d+ min/g) != null) {
                min = Number(message.match(/\d+ min/g)[0].match(/\d+/g)[0])
            }
            if (message.match(/\d+ sec/g) != null) {
                sec = Number(message.match(/\d+ sec/g)[0].match(/\d+/g)[0])
            }
            const milliseconds = (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000)
            chrome.runtime.sendMessage({later: Date.now() + milliseconds})
        } else if (message.includes('verification required')) {
            return
        } else {
            chrome.runtime.sendMessage({message: message.trim()})
        }
        return
    } else if (document.querySelector('.alert.alert-success') != null && document.querySelector('.alert.alert-success').textContent.includes('voted successfully')) {
        chrome.runtime.sendMessage({successfully: true})
        return
    }
    if (document.body.outerHTML.length < 200 && document.body.outerHTML.includes('must have cookies enabled in your browser')) {
        const request = {}
        request.errorVoteNoElement = document.body.innerText.trim()
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    const project = await getProject('TopG')

    if (document.location.pathname.split('/')[1] === project.game && !document.location.pathname.split('/')[2]) {
        const request = {}
        request.errorVoteNoElement = 'Redirected to server list'
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    if (document.querySelector("#vote").innerText.toLowerCase().includes('login to vote') || document.querySelector("#vote").innerText.toLowerCase().includes('connect with a social network to vote')) {
        chrome.runtime.sendMessage({auth: true})
        return
    }

    if (document.querySelector('#vote .h-captcha') && first) return


    document.getElementById('game_user').value = project.nick
    document.querySelector('#submit').click()
}