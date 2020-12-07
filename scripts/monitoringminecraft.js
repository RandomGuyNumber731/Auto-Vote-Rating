vote()
function vote() {
    chrome.storage.local.get('AVMRprojectsMonitoringMinecraft', function(result) {
        if (document.URL.includes('.vk')) {
            chrome.runtime.sendMessage({errorAuthVK: true})
            return
        }
        try {
            if (document.querySelector('body') != null && document.querySelector('body').textContent.includes('Вы слишком часто обновляете страницу. Умерьте пыл.')) {
                window.location.reload()
                return
            }
            //Чистит куки
            //document.cookie.split(';').forEach(function(c) { document.cookie = c.replace(/^ +/,"").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");})
            //Проверяет есть ли кнопка 'голосовать', если есть то голосует, если нет, ждёт когда страница полностью загрузица иначе отправляет ошибку
            if (document.querySelector('input[name=player]') != null) {
                let nick = getNickName(result.AVMRprojectsMonitoringMinecraft)
                if (nick == null || nick == '')
                    return
                document.querySelector('input[name=player]').value = nick
                document.querySelector('input[value=Голосовать]').click()
            } else if (document.querySelector('center').textContent.includes('Вы уже голосовали сегодня')) {
                //Если вы уже голосовали, высчитывает сколько надо времени прождать до следующего голосования (точнее тут высчитывается во сколько вы голосовали)
                //Берёт последние 30 символов
                let string = document.querySelector('center').textContent.substring(document.querySelector('center').textContent.length - 30)
                //Из полученного текста достаёт все цифры в Array List
                let numbers = string.match(/\d+/g).map(Number)
                let count = 0
                let hour = 0
                let min = 0
                let sec = 0
                for (var i in numbers) {
                    if (count == 0) {
                        hour = numbers[i]
                    } else if (count == 1) {
                        min = numbers[i]
                    }
                    count++
                }
                var milliseconds = (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000)
                var later = Date.now() + milliseconds
                chrome.runtime.sendMessage({later: later})
            } else if (document.querySelector('center').textContent.includes('Вы успешно проголосовали!')) {
                chrome.runtime.sendMessage({successfully: true})
            } else {
                chrome.runtime.sendMessage({message: 'Ошибка голосования, кажется какой-то нужный элемент отсутствует'})
            }
        } catch (e) {
            if (document.URL.startsWith('chrome-error') || document.querySelector('#error-information-popup-content > div.error-code') != null) {
                chrome.runtime.sendMessage({message: 'Ошибка! Похоже браузер не может связаться с сайтом, вот что известно: ' + document.querySelector('#error-information-popup-content > div.error-code').textContent})
            } else {
                chrome.runtime.sendMessage({message: 'Ошибка! Кажется какой-то нужный элемент (кнопка или поле ввода) отсутствует. Вот что известно: ' + e.name + ': ' + e.message + '\n' + e.stack})
            }
        }
    })
}

function getNickName(projects) {
    for (project of projects) {
        if (project.MonitoringMinecraft && document.URL.startsWith('http://monitoringminecraft.ru/top/' + project.id)) {
            return project.nick
        }
    }
    if (!document.URL.startsWith('http://monitoringminecraft.ru/top/')) {
        chrome.runtime.sendMessage({message: 'Ошибка голосования! Произошло перенаправление/переадресация на неизвестный сайт: ' + document.URL + ' Проверьте данный URL'})
    } else {
        chrome.runtime.sendMessage({message: 'Непредвиденная ошибка, не удалось найти никнейм, сообщите об этом разработчику расширения URL: ' + document.URL})
    }
}
