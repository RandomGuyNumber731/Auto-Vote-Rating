async function vote(first) {
    //MMoTopRU, что за костыли?
    if (document.querySelector('body > div') == null && document.querySelectorAll('body > script[type="text/javascript"]').length === 1) {
        // chrome.runtime.sendMessage({emptySite: true})
        return
    }

    if (document.querySelector('#id_spinner')) {
        await new Promise(resolve => {
            const timer = setInterval(() => {
                if (!document.querySelector('#id_spinner')) {
                    clearInterval(timer)
                    resolve()
                }
            }, 1000)
        })
    }

    if (document.body.innerText.trim().length < 150 && document.body.innerText.trim().includes('Loading...')) {
        return
    }

    if (document.querySelector('form[name="form"] input[name="captcha"]')) {
        chrome.runtime.sendMessage({captcha: true})
        return
    }

    if (document.querySelector('a[href="https://mmotop.ru/users/sign_in"]') || document.querySelector('a[href="/users/sign_in"]') || document.querySelector('form[action="/users/sign_in"]') || document.querySelector('form#new_user')) {
        chrome.runtime.sendMessage({auth: true})
        return
    }

    if (document.querySelector('div[class="can-vote"]') != null) {
        chrome.runtime.sendMessage({later: true})
        return
    }
    if (document.querySelector('body > div.ui-pnotify')) {
        const request = {}
        request.message = document.querySelector('body > div.ui-pnotify').textContent
        if (request.message.includes('Голос принят') || request.message.includes('vote accepted')) {
            chrome.runtime.sendMessage({successfully: true})
        } else {
            if (request.message.includes('Quaptcha check fail')) {
                request.ignoreReport = true
            }
            chrome.runtime.sendMessage(request)
        }
        return
    }
    if (document.querySelector('body > h1[align="center"]') && document.body.innerText.trim().length < 200) {
        chrome.runtime.sendMessage({
            message: document.body.innerText.trim(),
            ignoreReport: true
        })
        return
    }

    // Если мы вдруг попустили уведомление, то пытаемся снова войти в меню голосования
    if (document.querySelector('.header-2 a.btn.btn-danger')) {
        document.querySelector('.header-2 a.btn.btn-danger').click()
        return
    }

    if (document.querySelector('#vote_loading')) {
        await new Promise(resolve => {
            const timer = setInterval(() => {
                if (!document.querySelector('#vote_loading')) {
                    clearInterval(timer)
                    resolve()
                }
            }, 1000)
        })
    }

    if (document.querySelector('.vote-content .payment_select')) {
        chrome.runtime.sendMessage({message: 'Авто-голосование не доступно на платном голосовании, не вмешивайтесь в процесс авто-голосования!', ignoreReport: true})
        return
    }

    //Делаем форму голосования видимой
    document.querySelector('div.vote-fields').removeAttribute('style')

    if (document.querySelector("div.g-recaptcha > div > div > iframe") != null && first) {
        return
    }

    const project = await getProject('MMoTopRU', true)

    //Отправка запроса на прохождение капчи (мы типо прошли капчу)
    await fetch('https://' + project.game + '.mmotop.ru/votes/quaptcha.json', {
      'headers': {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'ru,en;q=0.9,en-US;q=0.8',
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'pragma': 'no-cache',
        'sec-ch-ua': '\"Google Chrome\";v=\"87\", \" Not;A Brand\";v=\"99\", \"Chromium\";v=\"87\"',
        'sec-ch-ua-mobile': "?0",
        'sec-fetch-dest': "empty",
        'sec-fetch-mode': "cors",
        'sec-fetch-site': "same-origin",
        'x-csrf-token': document.querySelector('input[name="authenticity_token"]').value,
        'x-requested-with': "XMLHttpRequest"
      },
      'body': 'action=qaptcha&qaptcha_key=' + document.querySelector('div.QapTcha > input[type=hidden]').name,
      'method': 'POST',
      'mode': 'cors',
      'credentials': 'include'
    })
    //Убираем здесь value иначе капча не будет пройдена
    document.querySelector('div.QapTcha > input[type=hidden]').value = ''
    //Делаем кнопку 'Проголосовать' кликабельной
    document.getElementById('check_vote_form').disabled = false

    //Вписываем никнейм
    document.getElementById('charname').firstElementChild.value = project.nick
    //Выбираем нужный мир
    const ordinalWorld = project.ordinalWorld - 1
    const world = document.querySelectorAll('#world > div > table > tbody > tr')[ordinalWorld]
    if (!world) {
        chrome.runtime.sendMessage({message: 'Мир под номером ' + project.ordinalWorld + ' не найден, проверьте правильность указанного номера мира', ignoreReport: true})
        return
    } else {
        world.click()
    }
    //Кликает голосовать
    document.getElementById('check_vote_form').click()
}