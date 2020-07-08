vote();
function vote () {
	if (document.readyState != 'complete') {
		document.onreadystatechange = function () {
            if (document.readyState == "complete") {
                vote();
            }
        }
		return;
	}
	chrome.storage.sync.get('AVMRenableSyncStorage', function(result) {
		var settingsStorage;
		let settingsSync = result.AVMRenableSyncStorage;
		if (settingsSync) {
			settingsStorage = chrome.storage.sync;
		} else {
			settingsStorage = chrome.storage.local;
		}
		settingsStorage.get('AVMRprojectsFairTop', function(result) {
			try {
				//Если есть поле ввода для никнейма, значит мы на первой странице
				if (document.querySelector("body > div.container > div > div > div > div.page-data-units > div.page-unit > div.vote-form > form > input.form-control.input-vote.col-sm-60") != null) {
					//Достаёт никнейм для голосования
					let nick = getNickName(result.AVMRprojectsFairTop);
					if (nick == null || nick == "") return;
					document.querySelector("body > div.container > div > div > div > div.page-data-units > div.page-unit > div.vote-form > form > input.form-control.input-vote.col-sm-60").value = nick;
					//Кликает на "Проголосовать"
					document.querySelector("body > div.container > div > div > div > div.page-data-units > div.page-unit > div.vote-form > form > button").click();
				} else if (document.querySelector("#submit-form") != null) {//Если мы на второй странице и есть опять же кнопка "Проголосовать"
					//Кликает на кнопку "Проголосовать"
					document.querySelector("#submit-form").click();
				}
			} catch (e) {
				if (document.URL.startsWith('chrome-error') || document.querySelector("#error-information-popup-content > div.error-code") != null) {
					sendMessage('Ошибка! Похоже браузер не может связаться с сайтом, вот что известно: ' + document.querySelector("#error-information-popup-content > div.error-code").textContent)
				} else {
					sendMessage('Ошибка! Кажется какой-то нужный элемент (кнопка или поле ввода) отсутствует. Вот что известно: ' + e.name + ": " + e.message + "\n" + e.stack);
				}
			}
		});
	});
}

function getNickName(projects) {
    for (project of projects) {
        if (project.FairTop && (document.URL.startsWith('https://fairtop.in/project/' + project.id) || document.URL.startsWith('https://fairtop.in/vote/' + project.id))) {
            return project.nick;
        }
    }
    if (!document.URL.startsWith('https://fairtop.in/project/') && !document.URL.startsWith('https://fairtop.in/vote/')) {
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

this.check = setInterval(()=>{
    //Ищет надпись в которой написано что вы проголосовали или вы уже голосовали, по этой надписи скрипт завершается
    if (document.readyState == 'complete' && (document.querySelector("#result > div") != null || document.querySelector("body > div.container > div > div > div > div.page-data.div-50.block-center > div") != null)) {
        var message;
        if (document.querySelector("body > div.container > div > div > div > div.page-data.div-50.block-center > div") != null && (document.querySelector("body > div.container > div > div > div > div.page-data.div-50.block-center > div").textContent.includes('Сегодня Вы уже голосовали') || document.querySelector("body > div.container > div > div > div > div.page-data.div-50.block-center > div").textContent.includes('Сегодня уже был голос'))) {
            message = 'later';
        } else if (document.querySelector("#result > div") != null && document.querySelector("#result > div").textContent.includes('Ваш голос учтён! Спасибо')) {
            message = 'successfully';
        } else {
        	if (document.querySelector("body > div.container > div > div > div > div.page-data.div-50.block-center > div") != null && document.querySelector("body > div.container > div > div > div > div.page-data.div-50.block-center > div").textContent != "") {
        		message = document.querySelector("body > div.container > div > div > div > div.page-data.div-50.block-center > div").textContent;
        	} else if (document.querySelector("#result > div") != null && document.querySelector("#result > div").textContent != "") {
        		message = document.querySelector("#result > div").textContent;
        	} else {
        		return;
        	}
        }
        clearInterval(this.check);
        sendMessage(message);
    }
}, 1000);
//document.querySelectorAll("span[aria-hidden=true]").item(1).click();
