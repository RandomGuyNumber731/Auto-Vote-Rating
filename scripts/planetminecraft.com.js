function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));		// жоска накостылил ибо инет у меня кринж багует приколямба нада дилэй небольшой
}

async function vote(first) {
    if (first === false) return
    if (document.querySelector('#center > div > h1') != null && document.querySelector('#center > div > h1').textContent.includes('Successfully voted')) {
        chrome.runtime.sendMessage({successfully: true})
        return
    } else if (document.querySelector('#center > div > h1') != null && document.querySelector('#center > div > h1').textContent.includes('You already voted')) {
        chrome.runtime.sendMessage({later: true})
        return
    }

    if (document.querySelector('#center > .content > img[src*="not_found"]')) {
        const request = {}
        request.message = document.querySelector('#center > .content').innerText.trim()
        if (request.message.includes('Submission not available')) {
            request.ignoreReport = true
        }
        chrome.runtime.sendMessage(request)
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

    if (document.querySelector('#error_page div.notice_box')) {
        const request = {}
        request.message = document.querySelector('#error_page div.notice_box').innerText
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    const project = await getProject()
    if (document.querySelector('#submit_vote_form > input[name="mcname"]') != null) {
        document.querySelector('#submit_vote_form > input[name="mcname"]').value = project.nick
    } else {
        console.warn('Не удалось найти поле для никнейма, возможно это голосование без награды')
    }

    await sleep(10000)				// а вот и костыльчик

    document.querySelector('#submit_vote_form > input[type="submit"]').click()
}