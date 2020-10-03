window.onmessage = function(e){
    if (e.data == 'vote') {
        vote(false);
    }
};
vote(true);

function vote(first) {
	chrome.storage.local.get('AVMRprojectsMinecraftServerNet', function(result) {
		try {
            //Если есть сообщение
            if (document.querySelector('h4[class="alert-heading text-center"]') != null) {
            	if (document.querySelector('h4[class="alert-heading text-center"]').textContent.includes('Vote Successful')) {
					sendMessage('successfully');
					return;
            	}
            	if (document.querySelector('h4[class="alert-heading text-center"]').textContent.includes('Vote Un-successful')) {
            		if (document.querySelector('h4[class="alert-heading text-center"]').nextElementSibling.textContent.includes('already voting')) {
            			sendMessage('later ' + (Date.now() + 86400000));//+ 24 часа
            			return;
            		}
            	}
            	sendMessage(document.querySelector('h4[class="alert-heading text-center"]').nextElementSibling.textContent);
            	return;
            }
            if (first) {
               	return;
            }
           	let nick = getNickName(result.AVMRprojectsMinecraftServerNet);
			if (nick == null || nick == "") return;
			document.querySelector("#mc_user").value = nick;
			document.querySelector("#rate-10").click();
			document.querySelector('input[value="Confirm Vote"]').click();
		} catch (e) {
			if (document.URL.startsWith('chrome-error') || document.querySelector("#error-information-popup-content > div.error-code") != null) {
				sendMessage('Ошибка! Похоже браузер не может связаться с сайтом, вот что известно: ' + document.querySelector("#error-information-popup-content > div.error-code").textContent)
			} else {
				sendMessage('Ошибка! Кажется какой-то нужный элемент (кнопка или поле ввода) отсутствует. Вот что известно: ' + e.name + ": " + e.message + "\n" + e.stack);
			}
		}
	});
}

function getNickName(projects) {
    for (project of projects) {
        if (project.MinecraftServerNet && document.URL.startsWith('https://minecraft-server.net/vote/' + project.id)) {
            return project.nick;
        }
    }
    if (!document.URL.startsWith('https://minecraft-server.net/vote/')) {
    	sendMessage('Ошибка голосования! Произошло перенаправление/переадресация на неизвестный сайт: ' + document.URL + ' Проверьте данный URL');
    } else {
        sendMessage('Непредвиденная ошибка, не удалось найти никнейм, сообщите об этом разработчику расширения URL: ' + document.URL);
    }
}

function sendMessage(message) {
    chrome.runtime.sendMessage({
         message: message
    }, function(response) {});
}