async function vote(first) {
    if (first === false) return
    if (document.querySelector('body') != null && document.querySelector('body').textContent.includes('Вы слишком часто обновляете страницу. Умерьте пыл.')) {
        window.location.reload()
        return
    }
    //Чистит куки
    //document.cookie.split(';').forEach(function(c) { document.cookie = c.replace(/^ +/,"").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");})
    //Проверяет есть ли кнопка 'голосовать', если есть то голосует, если нет, ждёт когда страница полностью загрузица иначе отправляет ошибку
    if (document.querySelector('input[name=player]') != null) {
        const project = await getProject('MonitoringMinecraft')
        document.querySelector('input[name=player]').value = project.nick
        document.querySelector('input[value=Голосовать]').click()
    } else if (document.querySelector('center').textContent.includes('Вы уже голосовали сегодня')) {
        chrome.runtime.sendMessage({later: true})
    } else if (document.querySelector('center').textContent.includes('Вы успешно проголосовали!')) {
        chrome.runtime.sendMessage({successfully: true})
    } else {
        chrome.runtime.sendMessage({errorVoteNoElement: true})
    }
}