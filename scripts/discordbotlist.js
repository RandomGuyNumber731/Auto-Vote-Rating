function vote(first) {
    if (first == false) return
    try {
        if (document.URL.startsWith('https://discord.com/')) {
            if (document.URL.includes('%20guilds') || document.URL.includes('%20email') || !document.URL.includes('prompt=none')) {
                let url = document.URL
                //Пилюля от жадности в правах
                url = url.replace('%20guilds.join', '')
                url = url.replace('%20guilds', '')
                url = url.replace('%20email', '')
                //Заставляем авторизацию авторизоваться не беспокоя пользователя если права уже были предоставлены
                if (!document.URL.includes('prompt=none')) url = url.concat('&prompt=none')
                document.location.replace(url)
            } else {
                const timer = setTimeout(()=>{//Да это костыль, а есть варинт по лучше?
                    chrome.runtime.sendMessage({discordLogIn: true})
                }, 10000)
                window.onbeforeunload = function(e) {
                    clearTimeout(timer)
                }
                window.onunload = function(e) {
                    clearTimeout(timer)
                }
            }
            return
        }

        //Если мы находимся на странице проверки CloudFlare
        if (document.querySelector('span[data-translate="complete_sec_check"]') != null) {
            return
        }

        if (document.querySelector('div.main-content') != null && document.querySelector('div.main-content').textContent == 'Logging you in...') {
            return
        }

        document.querySelector('button.btn.btn-blurple').click()
        
        const timer3 = setInterval(()=>{
            try {
                if (document.querySelector('div[role="status"][aria-live="polite"]') != null && document.querySelector('div[role="status"][aria-live="polite"]').textContent == 'User has already voted.') {
                    chrome.runtime.sendMessage({later: true})
                    clearInterval(timer3)
                } else if (document.querySelector('div[class="col-12 col-md-6 text-center"] > h1') != null && document.querySelector('div[class="col-12 col-md-6 text-center"] > h1').textContent == 'Thank you for voting!') {
                    chrome.runtime.sendMessage({successfully: true})
                    clearInterval(timer3)
                } else if (document.querySelector('div[role="status"][aria-live="polite"]') != null && document.querySelector('div[role="status"][aria-live="polite"]').textContent != '') {
                    chrome.runtime.sendMessage({message: document.querySelector('div[role="status"][aria-live="polite"]').textContent})
                    clearInterval(timer3)
                } else {
                    for (const el of document.querySelectorAll('link')) {
                        if (el.href.includes('thanks')) {
                            chrome.runtime.sendMessage({successfully: true})
                            clearInterval(timer3)
                            break
                        }
                    }
                    if (document.URL.includes('thanks')) {
                        chrome.runtime.sendMessage({successfully: true})
                        clearInterval(timer3)
                    }
                }
            } catch (e) {
                throwError(e)
                clearInterval(timer3)
            }
        }, 1000)

    } catch (e) {
        throwError(e)
    }
}