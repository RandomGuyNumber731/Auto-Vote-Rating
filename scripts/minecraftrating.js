vote();
function vote () {
	chrome.storage.local.get('AVMRprojectsMinecraftRating', function(result) {
		if (document.URL.includes('.vk')) {
			sendMessage('Требуется авторизация ВК! Авторизуйтесь в ВК для того что б расширение могло авто-голосовать');
			return;
		}
		try {
			if (document.querySelector('div.alert.alert-danger') != null) {
				if (document.querySelector('div.alert.alert-danger').textContent.includes('Вы уже голосовали за этот проект')) {
//					var numbers = document.querySelector('div.alert.alert-danger').textContent.match(/\d+/g).map(Number);
//					var count = 0;
//					var year = 0;
//					var month = 0;
//					var day = 0;
//					var hour = 0;
//					var min = 0;
//					var sec = 0;
//				    for (var i in numbers) {
//					    if (count == 0) {
//						    hour = numbers[i];
//					    } else if (count == 1) {
//						    min = numbers[i];
//					    } else if (count == 2) {
//						    sec = numbers[i];
//					    } else if (count == 3) {
//						    day = numbers[i];
//					    } else if (count == 4) {
//						    month = numbers[i];
//					    } else if (count == 5) {
//						    year = numbers[i];
//					    }
//					    count++;
//				    }
//					var later = Date.UTC(year, month - 1, day, hour, min, sec, 0) - 86400000 - 10800000;
					sendMessage('later');
				}
			} else if (document.querySelector('div.alert.alert-success') != null && document.querySelector('div.alert.alert-success').textContent.includes('Спасибо за Ваш голос!')) {
				sendMessage('successfully');
			} else if (document.querySelector("input[name=nick]") != null) {
				let nick = getNickName(result.AVMRprojectsMinecraftRating);
				if (nick == null || nick == "") return;
				document.querySelector("input[name=nick]").value = nick;
				document.querySelector("button[type=submit]").click();
			} else {
				setTimeout(()=> sendMessage('Ошибка, input[name=nick] является null'), 10000);
			}
		} catch(e) {
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
        if (project.MinecraftRating && document.URL.startsWith('http://minecraftrating.ru/projects/' + project.id)) {
            return project.nick;
        }
    }
    if (!document.URL.startsWith('http://minecraftrating.ru/projects/')) {
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