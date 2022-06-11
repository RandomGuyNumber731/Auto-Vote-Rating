async function vote() {
    if (document.querySelector('div.MsgBox') != null && document.querySelector('div.MsgBox').innerText.length > 0) return

    if (document.querySelector('div.ui.error.message') != null) {
        if (document.querySelector('div.ui.error.message').textContent.includes('must wait until tomorrow')) {
            chrome.runtime.sendMessage({later: true})
            return
        }
        chrome.runtime.sendMessage({message: document.querySelector('div.ui.error.message').textContent})
        return
    }

    //Если на странице есть кнопка входа через Steam то жмём её
    if (document.querySelector('div.card-footer a[href="/steam_login"]') != null) {
        document.querySelector('div.card-footer a[href="/steam_login"]').click()
        return
    }

    const button = document.querySelector('div.card-footer button')

    if (button.textContent.includes('ч.')) {
        const numbers = button.textContent.match(/\d+/g).map(Number)
        const milliseconds = (numbers[0] * 60 * 60 * 1000) + (numbers[1] * 60 * 1000)/* + (sec * 1000)*/
        chrome.runtime.sendMessage({later: Date.now() + milliseconds})
    } else {
        const timer2 = setInterval(() => {
            if (!button.disabled) {
                clearInterval(timer2)
                button.click()
            }
        }, 1000)
    }
}

const timer = setInterval(()=>{
    try {
        const msg = document.querySelector('div.MsgBox')
        if (msg != null && msg.innerText.length > 0) {
            clearInterval(timer)
            const message = msg.innerText
            if (message.includes('уже проголосовали')) {
                chrome.runtime.sendMessage({later: true})
            } else if (message.includes('Голос принят')) {
                chrome.runtime.sendMessage({successfully: true})
            } else {
                chrome.runtime.sendMessage({message})
            }
        }
    } catch (e) {
        clearInterval(timer)
        throwError(e)
    }
}, 200)